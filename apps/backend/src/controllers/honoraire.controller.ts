import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Honoraire } from '../models/honoraire.model';
import { Paiement } from '../models/paiement.model';
import { Dossier } from '../models/dossier.model';
import { AppError } from '../middlewares/error-handler';
import { sendSuccess } from '../utils/api-response';
import { creerHonoraireSchema, modifierHonoraireSchema } from '../validations/honoraire.validation';

// ─── Calcul des totaux (toujours côté backend) ───────────────────────────────

/**
 * Calcule le total payé, le reste à payer et le statut de paiement
 * pour un honoraire donné à partir de ses paiements associés.
 */
const calculerStatutPaiement = async (
  honoraireId: string,
  tenantId: string,
  montantTotal: number
): Promise<{
  totalPaye: number;
  resteAPayer: number;
  statut: 'non_paye' | 'partiel' | 'paye';
}> => {
  // Agrégation MongoDB pour sommer les montants des paiements
  const resultat = await Paiement.aggregate([
    {
      $match: {
        honoraire: new mongoose.Types.ObjectId(honoraireId),
        tenantId: new mongoose.Types.ObjectId(tenantId),
      },
    },
    {
      $group: {
        _id: null,
        totalPaye: { $sum: '$montant' },
      },
    },
  ]);

  const totalPaye = resultat.length > 0 ? resultat[0].totalPaye : 0;
  const resteAPayer = Math.max(0, montantTotal - totalPaye);

  // Détermination du statut de paiement
  let statut: 'non_paye' | 'partiel' | 'paye';
  if (totalPaye === 0) {
    statut = 'non_paye';
  } else if (totalPaye >= montantTotal) {
    statut = 'paye';
  } else {
    statut = 'partiel';
  }

  return { totalPaye, resteAPayer, statut };
};

// ─── POST /api/cabinet/dossiers/:id/honoraire ────────────────────────────────

/**
 * Crée un honoraire pour un dossier.
 * Règle métier : 1 seul honoraire par dossier (index unique tenantId + dossier).
 */
export const creerHonoraire = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id: dossierId } = req.params;
    const tenantId = req.utilisateur!.tenantId!;

    // Validation Zod
    const donnees = creerHonoraireSchema.parse(req.body);

    // Vérification que le dossier existe et appartient au cabinet
    const dossier = await Dossier.findOne({
      _id: dossierId,
      tenantId,
      isDeleted: false,
    });

    if (!dossier) {
      throw new AppError('Dossier introuvable', 'DOSSIER_INTROUVABLE', 404);
    }

    // Vérification qu'il n'existe pas déjà un honoraire pour ce dossier
    const honoraireExistant = await Honoraire.findOne({
      dossier: dossierId,
      tenantId,
    });

    if (honoraireExistant) {
      throw new AppError(
        'Un honoraire existe déjà pour ce dossier. Utilisez PUT pour le modifier.',
        'HONORAIRE_DEJA_EXISTANT',
        409
      );
    }

    // Création de l'honoraire
    const honoraire = await Honoraire.create({
      tenantId,
      dossier: dossierId,
      montantTotal: donnees.montantTotal,
      type: donnees.type,
      description: donnees.description,
    });

    sendSuccess(
      res,
      {
        honoraire,
        totalPaye: 0,
        resteAPayer: donnees.montantTotal,
        statut: 'non_paye',
        devise: 'DA',
      },
      201
    );
  } catch (erreur) {
    next(erreur);
  }
};

// ─── PUT /api/cabinet/dossiers/:id/honoraire ─────────────────────────────────

/**
 * Modifie l'honoraire d'un dossier.
 * Recalcule automatiquement le statut de paiement si montantTotal change.
 */
export const modifierHonoraire = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id: dossierId } = req.params;
    const tenantId = req.utilisateur!.tenantId!;

    // Validation Zod
    const donnees = modifierHonoraireSchema.parse(req.body);

    // Recherche de l'honoraire existant
    const honoraire = await Honoraire.findOne({ dossier: dossierId, tenantId });

    if (!honoraire) {
      throw new AppError(
        'Aucun honoraire trouvé pour ce dossier. Utilisez POST pour en créer un.',
        'HONORAIRE_INTROUVABLE',
        404
      );
    }

    // Mise à jour des champs fournis
    if (donnees.montantTotal !== undefined) honoraire.montantTotal = donnees.montantTotal;
    if (donnees.type !== undefined) honoraire.type = donnees.type;
    if (donnees.description !== undefined) honoraire.description = donnees.description;

    await honoraire.save();

    // Recalcul du statut de paiement après modification
    const { totalPaye, resteAPayer, statut } = await calculerStatutPaiement(
      String(honoraire._id),
      tenantId,
      honoraire.montantTotal
    );

    sendSuccess(res, {
      honoraire,
      totalPaye,
      resteAPayer,
      statut,
      devise: 'DA',
    });
  } catch (erreur) {
    next(erreur);
  }
};

// ─── DELETE /api/cabinet/dossiers/:id/honoraire ──────────────────────────────

/**
 * Supprime l'honoraire d'un dossier.
 * Blocage si des paiements sont enregistrés contre cet honoraire.
 */
export const supprimerHonoraire = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id: dossierId } = req.params;
    const tenantId = req.utilisateur!.tenantId!;

    // Recherche de l'honoraire
    const honoraire = await Honoraire.findOne({ dossier: dossierId, tenantId });

    if (!honoraire) {
      throw new AppError('Honoraire introuvable', 'HONORAIRE_INTROUVABLE', 404);
    }

    // Vérification qu'aucun paiement n'est lié à cet honoraire
    const nombrePaiements = await Paiement.countDocuments({
      honoraire: honoraire._id,
      tenantId,
    });

    if (nombrePaiements > 0) {
      throw new AppError(
        `Impossible de supprimer cet honoraire : ${nombrePaiements} paiement(s) enregistré(s). Supprimez d'abord les paiements.`,
        'HONORAIRE_AVEC_PAIEMENTS',
        409
      );
    }

    await Honoraire.deleteOne({ _id: honoraire._id });

    sendSuccess(res, { message: 'Honoraire supprimé avec succès' });
  } catch (erreur) {
    next(erreur);
  }
};

// ─── GET /api/cabinet/dossiers/:id/honoraire ─────────────────────────────────

/**
 * Récupère l'honoraire d'un dossier avec ses totaux calculés.
 * Endpoint déjà déclaré dans dossier.routes.ts — ce contrôleur le remplace
 * pour inclure les totaux financiers.
 */
export const obtenirHonoraire = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id: dossierId } = req.params;
    const tenantId = req.utilisateur!.tenantId!;

    const honoraire = await Honoraire.findOne({ dossier: dossierId, tenantId });

    // ✅ null est une réponse VALIDE — le dossier n'a pas encore d'honoraire
    if (!honoraire) {
      sendSuccess(res, null);
      return;
    }

    const { totalPaye, resteAPayer, statut } = await calculerStatutPaiement(
      String(honoraire._id),
      tenantId,
      honoraire.montantTotal
    );

    sendSuccess(res, {
      honoraire,
      totalPaye,
      resteAPayer,
      statut,
      devise: 'DA',
    });
  } catch (erreur) {
    next(erreur);
  }
};
