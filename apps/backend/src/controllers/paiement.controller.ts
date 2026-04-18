import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Paiement } from '../models/paiement.model';
import { Honoraire } from '../models/honoraire.model';
import Dossier from '../models/dossier.model';
import { AppError } from '../middlewares/error-handler';
import { sendSuccess } from '../utils/api-response';
import { creerPaiementSchema, modifierPaiementSchema } from '../validations/paiement.validation';

// ─── Utilitaire : calcul des totaux pour la réponse ──────────────────────────

/**
 * Retourne le résumé financier complet d'un honoraire après une opération
 * sur paiement. Toujours calculé côté backend.
 */
const obtenirResumFinancier = async (
  honoraireId: string | mongoose.Types.ObjectId,
  tenantId: string
) => {
  const honoraire = await Honoraire.findById(honoraireId);
  if (!honoraire) return null;

  const resultat = await Paiement.aggregate([
    {
      $match: {
        honoraire: new mongoose.Types.ObjectId(String(honoraireId)),
        tenantId: new mongoose.Types.ObjectId(tenantId),
      },
    },
    {
      $group: {
        _id: null,
        totalPaye: { $sum: '$montant' },
        nombrePaiements: { $sum: 1 },
      },
    },
  ]);

  const totalPaye = resultat.length > 0 ? resultat[0].totalPaye : 0;
  const nombrePaiements = resultat.length > 0 ? resultat[0].nombrePaiements : 0;
  const resteAPayer = Math.max(0, honoraire.montantTotal - totalPaye);

  let statut: 'non_paye' | 'partiel' | 'paye';
  if (totalPaye === 0) {
    statut = 'non_paye';
  } else if (totalPaye >= honoraire.montantTotal) {
    statut = 'paye';
  } else {
    statut = 'partiel';
  }

  return {
    montantTotal: honoraire.montantTotal,
    totalPaye,
    resteAPayer,
    statut,
    nombrePaiements,
    devise: 'DA',
  };
};

// ─── POST /api/cabinet/paiements ─────────────────────────────────────────────

/**
 * Enregistre un nouveau paiement.
 * Vérifie que le paiement ne dépasse pas le montant total de l'honoraire.
 */
export const creerPaiement = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = req.utilisateur!.tenantId!;

    // Validation Zod
    const donnees = creerPaiementSchema.parse(req.body);

    // Vérification que l'honoraire existe et appartient au cabinet
    const honoraire = await Honoraire.findOne({
      _id: donnees.honoraireId,
      tenantId,
    });

    if (!honoraire) {
      throw new AppError('Honoraire introuvable', 'HONORAIRE_INTROUVABLE', 404);
    }

    // Vérification que le dossier correspond à l'honoraire
    if (String(honoraire.dossier) !== donnees.dossierId) {
      throw new AppError(
        "Le dossier fourni ne correspond pas à l'honoraire",
        'DOSSIER_HONORAIRE_INCOMPATIBLE',
        400
      );
    }

    // Vérification que le dossier est actif (non clôturé)
    const dossier = await Dossier.findOne({
      _id: donnees.dossierId,
      tenantId,
      isDeleted: false,
    });

    if (!dossier) {
      throw new AppError('Dossier introuvable', 'DOSSIER_INTROUVABLE', 404);
    }

    // Calcul du total déjà payé pour vérifier le dépassement
    const resultatExistant = await Paiement.aggregate([
      {
        $match: {
          honoraire: new mongoose.Types.ObjectId(donnees.honoraireId),
          tenantId: new mongoose.Types.ObjectId(tenantId),
        },
      },
      { $group: { _id: null, totalPaye: { $sum: '$montant' } } },
    ]);

    const totalDejaPayé = resultatExistant.length > 0 ? resultatExistant[0].totalPaye : 0;
    const nouveauTotal = totalDejaPayé + donnees.montant;

    // Blocage si le paiement dépasse le montant total de l'honoraire
    if (nouveauTotal > honoraire.montantTotal) {
      const resteAPayer = honoraire.montantTotal - totalDejaPayé;
      throw new AppError(
        `Paiement refusé : le montant (${donnees.montant} DA) dépasse le reste à payer (${resteAPayer} DA)`,
        'PAIEMENT_DEPASSE_MONTANT',
        400
      );
    }

    // Création du paiement
    const paiement = await Paiement.create({
      tenantId,
      honoraire: donnees.honoraireId,
      dossier: donnees.dossierId,
      montant: donnees.montant,
      date: new Date(donnees.date as string),
      mode: donnees.mode,
      reference: donnees.reference,
      note: donnees.note,
    });

    // Résumé financier recalculé après création
    const resumeFinancier = await obtenirResumFinancier(donnees.honoraireId, tenantId);

    sendSuccess(res, { paiement, resumeFinancier }, 201);
  } catch (erreur) {
    next(erreur);
  }
};

// ─── PUT /api/cabinet/paiements/:id ──────────────────────────────────────────

/**
 * Modifie un paiement existant.
 * Si le montant est modifié, vérifie que le total reste dans les limites.
 */
export const modifierPaiement = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const tenantId = req.utilisateur!.tenantId!;

    // Validation Zod
    const donnees = modifierPaiementSchema.parse(req.body);

    // Recherche du paiement
    const paiement = await Paiement.findOne({ _id: id, tenantId });

    if (!paiement) {
      throw new AppError('Paiement introuvable', 'PAIEMENT_INTROUVABLE', 404);
    }

    // Si le montant est modifié, vérification du dépassement
    if (donnees.montant !== undefined && donnees.montant !== paiement.montant) {
      const resultat = await Paiement.aggregate([
        {
          $match: {
            honoraire: paiement.honoraire,
            tenantId: new mongoose.Types.ObjectId(tenantId),
            // Exclure le paiement en cours de modification du calcul
            _id: { $ne: paiement._id },
          },
        },
        { $group: { _id: null, totalAutres: { $sum: '$montant' } } },
      ]);

      const totalAutres = resultat.length > 0 ? resultat[0].totalAutres : 0;
      const honoraire = await Honoraire.findById(paiement.honoraire);

      if (!honoraire) {
        throw new AppError('Honoraire associé introuvable', 'HONORAIRE_INTROUVABLE', 404);
      }

      if (totalAutres + donnees.montant > honoraire.montantTotal) {
        const resteDisponible = honoraire.montantTotal - totalAutres;
        throw new AppError(
          `Modification refusée : le nouveau montant dépasse le plafond disponible (${resteDisponible} DA)`,
          'PAIEMENT_DEPASSE_MONTANT',
          400
        );
      }
    }

    // Application des modifications
    if (donnees.montant !== undefined) paiement.montant = donnees.montant;
    if (donnees.date !== undefined) paiement.date = new Date(donnees.date as string);
    if (donnees.mode !== undefined) paiement.mode = donnees.mode;
    if (donnees.reference !== undefined) paiement.reference = donnees.reference;
    if (donnees.note !== undefined) paiement.note = donnees.note;

    await paiement.save();

    // Résumé financier recalculé
    const resumeFinancier = await obtenirResumFinancier(paiement.honoraire, tenantId);

    sendSuccess(res, { paiement, resumeFinancier });
  } catch (erreur) {
    next(erreur);
  }
};

// ─── DELETE /api/cabinet/paiements/:id ───────────────────────────────────────

/**
 * Supprime un paiement (admin uniquement).
 * Retourne le résumé financier mis à jour après suppression.
 */
export const supprimerPaiement = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const tenantId = req.utilisateur!.tenantId!;

    const paiement = await Paiement.findOne({ _id: id, tenantId });

    if (!paiement) {
      throw new AppError('Paiement introuvable', 'PAIEMENT_INTROUVABLE', 404);
    }

    // Sauvegarde de la référence honoraire avant suppression
    const honoraireId = paiement.honoraire;

    await Paiement.deleteOne({ _id: id });

    // Résumé financier recalculé après suppression
    const resumeFinancier = await obtenirResumFinancier(honoraireId, tenantId);

    sendSuccess(res, {
      message: 'Paiement supprimé avec succès',
      resumeFinancier,
    });
  } catch (erreur) {
    next(erreur);
  }
};

// ─── GET /api/cabinet/dossiers/:id/paiements ─────────────────────────────────

/**
 * Liste tous les paiements d'un dossier avec le résumé financier.
 * Endpoint déjà déclaré dans dossier.routes.ts — ce contrôleur le remplace
 * pour inclure les totaux.
 */
export const listerPaiementsDossier = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id: dossierId } = req.params;
    const tenantId = req.utilisateur!.tenantId!;

    const paiements = await Paiement.find({ dossier: dossierId, tenantId })
      .sort({ date: -1 })
      .lean();

    // Recherche de l'honoraire pour calculer les totaux
    const honoraire = await Honoraire.findOne({ dossier: dossierId, tenantId });

    let resumeFinancier = null;
    if (honoraire) {
      resumeFinancier = await obtenirResumFinancier(String(honoraire._id), tenantId);
    }

    sendSuccess(res, { paiements, resumeFinancier }, 200, { total: paiements.length });
  } catch (erreur) {
    next(erreur);
  }
};

// GET /api/cabinet/paiements — Liste globale paginée + stats KPI cabinet
export const listerTousPaiements = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = req.utilisateur!.tenantId!;
    const filtre: Record<string, unknown> = { tenantId };

    if (req.query.mode) filtre.mode = req.query.mode;
    if (req.query.dossierId) filtre.dossier = req.query.dossierId;

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const [paiements, total, statsResult] = await Promise.all([
      Paiement.find(filtre)
        .populate({ path: 'honoraire', select: 'montantTotal type' })
        .populate({
          path: 'dossier',
          select: 'reference titre client',
          populate: { path: 'client', select: 'nom prenom raisonSociale type' },
        })
        .sort({ date: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Paiement.countDocuments(filtre),
      // Stats globales cabinet (pas filtrées — toujours sur tout le cabinet)
      Paiement.aggregate([
        { $match: { tenantId: new mongoose.Types.ObjectId(tenantId) } },
        {
          $group: {
            _id: null,
            totalEncaisse: { $sum: '$montant' },
            cash: { $sum: { $cond: [{ $eq: ['$mode', 'cash'] }, '$montant', 0] } },
            virement: { $sum: { $cond: [{ $eq: ['$mode', 'virement'] }, '$montant', 0] } },
            ccp: { $sum: { $cond: [{ $eq: ['$mode', 'ccp'] }, '$montant', 0] } },
          },
        },
      ]),
    ]);

    const stats = statsResult[0] ?? {
      totalEncaisse: 0,
      cash: 0,
      virement: 0,
      ccp: 0,
    };

    sendSuccess(res, { paiements, stats }, 200, {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  } catch (erreur) {
    next(erreur);
  }
};
