import { Request, Response, NextFunction } from 'express';
import mongoose, { FilterQuery } from 'mongoose';
import { Dossier, IDossier } from '../models/dossier.model';
import { Client } from '../models/client.model';
import { Honoraire } from '../models/honoraire.model';
import { Paiement } from '../models/paiement.model';
import { Evenement } from '../models/evenement.model';
import { Etape } from '../models/etape.model';
import { DocumentModel as DocumentFichier } from '../models/document.model';
import { sendSuccess } from '../utils/api-response';
import { AppError } from '../middlewares/error-handler';
import {
  creerDossierSchema,
  modifierDossierSchema,
  changerStatutSchema,
  rechercheDossierSchema,
} from '../validations/dossier.validation';

// ─── Helper : génération de référence DOS-YYYY-NNN ────────────────────────────

/**
 * Génère la prochaine référence unique pour un cabinet.
 * Format : DOS-2026-001, DOS-2026-042, DOS-2026-100...
 *
 * Stratégie : chercher le dernier numéro de l'année + incrémenter.
 * La contrainte unique { tenantId, reference } en DB empêche les doublons
 * en cas de très rare collision concurrente (erreur 11000 remontée au client).
 */
const genererReference = async (tenantId: string): Promise<string> => {
  const annee = new Date().getFullYear();
  const prefixe = `DOS-${annee}-`;

  // Chercher le dossier avec la référence la plus haute de l'année pour ce cabinet
  const dernierDossier = await Dossier.findOne({
    tenantId,
    reference: { $regex: `^${prefixe}` },
  })
    .sort({ reference: -1 })
    .select('reference')
    .lean();

  let numero = 1;

  if (dernierDossier?.reference) {
    // "DOS-2026-042" → ["DOS", "2026", "042"] → 42 → 43
    const parties = dernierDossier.reference.split('-');
    const dernierNumero = parseInt(parties[2], 10);
    if (!isNaN(dernierNumero)) {
      numero = dernierNumero + 1;
    }
  }

  // Padding à 3 chiffres minimum : 1→"001", 42→"042", 100→"100"
  return `${prefixe}${String(numero).padStart(3, '0')}`;
};

// ─── Helper : vérifier l'existence du dossier dans le tenant ──────────────────

const trouverDossierDuTenant = async (dossierId: string, tenantId: string) => {
  if (!mongoose.Types.ObjectId.isValid(dossierId)) {
    throw new AppError('Identifiant dossier invalide', 'ID_INVALIDE', 400);
  }

  const dossier = await Dossier.findOne({
    _id: dossierId,
    tenantId,
    isDeleted: false,
  });

  if (!dossier) {
    throw new AppError('Dossier introuvable', 'DOSSIER_INTROUVABLE', 404);
  }

  return dossier;
};

// ─── GET /api/cabinet/dossiers ────────────────────────────────────────────────

/**
 * Liste les dossiers avec filtres combinables : statut, type, client, recherche textuelle.
 * Popule le client pour afficher nom/téléphone dans la liste.
 */
export const listerDossiers = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = req.utilisateur!.tenantId!;

    const parsed = rechercheDossierSchema.safeParse(req.query);
    if (!parsed.success) {
      throw new AppError(parsed.error.errors[0].message, 'VALIDATION_ERROR', 400);
    }

    const { q, statut, type, client, page, limit } = parsed.data;
    const skip = (page - 1) * limit;

    const filtre: FilterQuery<IDossier> = {
      tenantId,
      isDeleted: false,
    };

    if (statut) filtre.statut = statut;
    if (type) filtre.type = type;

    // Filtrer par client si un clientId valide est fourni
    if (client && mongoose.Types.ObjectId.isValid(client)) {
      filtre.client = new mongoose.Types.ObjectId(client);
    }

    // Recherche textuelle sur titre et reference (nécessite l'index $text sur le modèle)
    if (q) {
      const regex = new RegExp(q, 'i');
      filtre.$or = [{ titre: regex }, { reference: regex }, { description: regex }];
    }

    const [dossiers, total] = await Promise.all([
      Dossier.find(filtre)
        .sort({ createdAt: -1 })
        .select({ __v: 0 })
        // Données client nécessaires pour l'affichage en liste
        .populate('client', 'nom prenom raisonSociale telephone type')
        .skip(skip)
        .limit(limit)
        .lean(),
      Dossier.countDocuments(filtre),
    ]);

    sendSuccess(res, dossiers, 200, {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    next(error);
  }
};

// ─── POST /api/cabinet/dossiers ───────────────────────────────────────────────

/**
 * Crée un dossier avec référence auto DOS-YYYY-NNN.
 * Vérifie que le client appartient bien au cabinet avant création.
 */
export const creerDossier = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = req.utilisateur!.tenantId!;

    const parsed = creerDossierSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(parsed.error.errors[0].message, 'VALIDATION_ERROR', 400);
    }

    // Valider le format de l'ID client avant la requête DB
    if (!mongoose.Types.ObjectId.isValid(parsed.data.client)) {
      throw new AppError('Identifiant client invalide', 'ID_INVALIDE', 400);
    }

    // Vérifier que le client appartient à ce cabinet (isolation multi-tenant)
    const clientExistant = await Client.findOne({
      _id: parsed.data.client,
      tenantId,
      isDeleted: false,
    });

    if (!clientExistant) {
      throw new AppError('Client introuvable dans ce cabinet', 'CLIENT_INTROUVABLE', 404);
    }

    // Générer la référence unique — DOS-YYYY-NNN
    const reference = await genererReference(tenantId);

    const dossier = await Dossier.create({
      ...parsed.data,
      tenantId,
      reference,
      statut: 'en_cours',
      dateOuverture: parsed.data.dateOuverture ?? new Date(),
    });

    // Populer le client pour la réponse
    await dossier.populate('client', 'nom prenom raisonSociale telephone type');

    sendSuccess(res, dossier, 201);
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/cabinet/dossiers/:id ────────────────────────────────────────────

/**
 * Retourne le détail complet d'un dossier avec toutes les infos du client.
 */
export const obtenirDossier = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = req.utilisateur!.tenantId!;
    const dossierId = req.params.id as string;

    if (!mongoose.Types.ObjectId.isValid(dossierId)) {
      throw new AppError('Identifiant dossier invalide', 'ID_INVALIDE', 400);
    }

    const dossier = await Dossier.findOne({
      _id: dossierId,
      tenantId,
      isDeleted: false,
    })
      // Données client complètes pour la fiche dossier
      .populate('client', 'nom prenom raisonSociale telephone type email adresse')
      .select('-__v');

    if (!dossier) {
      throw new AppError('Dossier introuvable', 'DOSSIER_INTROUVABLE', 404);
    }

    sendSuccess(res, dossier);
  } catch (error) {
    next(error);
  }
};

// ─── PUT /api/cabinet/dossiers/:id ────────────────────────────────────────────

/**
 * Modifie les champs d'un dossier.
 * La référence et le client sont immuables après création.
 * Pour changer le statut, utiliser PATCH /:id/statut.
 */
export const modifierDossier = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = req.utilisateur!.tenantId!;
    const dossierId = req.params.id as string;

    const dossier = await trouverDossierDuTenant(dossierId, tenantId);

    const parsed = modifierDossierSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(parsed.error.errors[0].message, 'VALIDATION_ERROR', 400);
    }

    const dossierMaj = await Dossier.findByIdAndUpdate(
      dossier._id,
      { $set: parsed.data },
      { new: true, runValidators: true }
    )
      .populate('client', 'nom prenom raisonSociale telephone type')
      .select('-__v');

    sendSuccess(res, dossierMaj);
  } catch (error) {
    next(error);
  }
};

// ─── PATCH /api/cabinet/dossiers/:id/statut ───────────────────────────────────

/**
 * Change le statut d'un dossier.
 * Clôture → enregistre dateCloture automatiquement.
 * Réouverture → efface dateCloture avec $unset.
 * Réservé à l'admin (géré dans les routes).
 */
export const changerStatutDossier = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = req.utilisateur!.tenantId!;
    const dossierId = req.params.id as string;

    const dossier = await trouverDossierDuTenant(dossierId, tenantId);

    const parsed = changerStatutSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(parsed.error.errors[0].message, 'VALIDATION_ERROR', 400);
    }

    const { statut, dateCloture } = parsed.data;

    // Mise à jour conditionnelle selon le nouveau statut
    const updateQuery =
      statut === 'cloture'
        ? // Clôture : enregistrer la date (fournie ou maintenant)
          { $set: { statut, dateCloture: dateCloture ?? new Date() } }
        : // Réouverture / suspension : effacer la date de clôture
          { $set: { statut }, $unset: { dateCloture: '' } };

    const dossierMaj = await Dossier.findByIdAndUpdate(dossier._id, updateQuery, {
      new: true,
    }).select('-__v');

    const messages: Record<string, string> = {
      en_cours: 'Dossier remis en cours',
      suspendu: 'Dossier suspendu',
      cloture: 'Dossier clôturé avec succès',
    };

    sendSuccess(res, dossierMaj);
  } catch (error) {
    next(error);
  }
};

// ─── DELETE /api/cabinet/dossiers/:id ────────────────────────────────────────

/**
 * Soft delete — isDeleted: true. Jamais de suppression physique (règle métier #5).
 * Réservé à l'admin.
 */
export const supprimerDossier = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = req.utilisateur!.tenantId!;
    const dossierId = req.params.id as string;

    const dossier = await trouverDossierDuTenant(dossierId, tenantId);

    await Dossier.findByIdAndUpdate(dossier._id, { isDeleted: true });

    sendSuccess(res, { message: 'Dossier archivé avec succès', id: dossier._id });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/cabinet/dossiers/:id/honoraire ─────────────────────────────────

/**
 * Retourne l'honoraire lié au dossier.
 * Retourne null si aucun honoraire n'a encore été défini (état valide).
 */
export const obtenirHonoraireDossier = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = req.utilisateur!.tenantId!;
    const dossier = await trouverDossierDuTenant(req.params.id as string, tenantId);

    const honoraire = await Honoraire.findOne({
      tenantId,
      dossier: dossier._id,
    }).select('-__v');

    // null est une réponse valide — le frontend affichera "Aucun honoraire défini"
    sendSuccess(res, honoraire ?? null);
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/cabinet/dossiers/:id/paiements ─────────────────────────────────

/**
 * Retourne les paiements du dossier avec calculs financiers complets.
 * Calculs côté backend : total payé, reste à payer (règle métier #4).
 */
export const obtenirPaiementsDossier = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = req.utilisateur!.tenantId!;
    const dossier = await trouverDossierDuTenant(req.params.id as string, tenantId);

    const [paiements, honoraire] = await Promise.all([
      Paiement.find({ tenantId, dossier: dossier._id })
        .populate('honoraire', 'montantTotal type')
        .sort({ date: -1 })
        .select('-__v')
        .lean(),
      Honoraire.findOne({ tenantId, dossier: dossier._id }).select('montantTotal').lean(),
    ]);

    const montantTotal = honoraire?.montantTotal ?? 0;
    const totalPaye = paiements.reduce((acc, p) => acc + p.montant, 0);
    const resteAPayer = Math.max(0, montantTotal - totalPaye);

    sendSuccess(res, paiements, 200, {
      total: paiements.length,
      montantTotal,
      totalPaye,
      resteAPayer,
      devise: 'DA',
    });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/cabinet/dossiers/:id/evenements ────────────────────────────────

/**
 * Retourne les événements (audiences, RDV, rappels) liés au dossier.
 * Triés chronologiquement (du plus proche au plus lointain).
 */
export const obtenirEvenementsDossier = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = req.utilisateur!.tenantId!;
    const dossier = await trouverDossierDuTenant(req.params.id as string, tenantId);

    const evenements = await Evenement.find({ tenantId, dossier: dossier._id })
      .sort({ dateHeure: 1 })
      .select('-__v')
      .lean();

    sendSuccess(res, evenements, 200, { total: evenements.length });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/cabinet/dossiers/:id/etapes ────────────────────────────────────

/**
 * Retourne la timeline des étapes procédurales du dossier.
 * Triées chronologiquement pour un affichage en timeline.
 */
export const obtenirEtapesDossier = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = req.utilisateur!.tenantId!;
    const dossier = await trouverDossierDuTenant(req.params.id as string, tenantId);

    const etapes = await Etape.find({ tenantId, dossier: dossier._id })
      .sort({ date: 1 })
      .select('-__v')
      .lean();

    sendSuccess(res, etapes, 200, { total: etapes.length });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/cabinet/dossiers/:id/documents ─────────────────────────────────

/**
 * Retourne les documents (fichiers Cloudinary) liés au dossier.
 * Triés du plus récent au plus ancien.
 */
export const obtenirDocumentsDossier = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = req.utilisateur!.tenantId!;
    const dossier = await trouverDossierDuTenant(req.params.id as string, tenantId);

    const documents = await DocumentFichier.find({ tenantId, dossier: dossier._id })
      .sort({ createdAt: -1 })
      .select('-__v')
      .lean();

    sendSuccess(res, documents, 200, { total: documents.length });
  } catch (error) {
    next(error);
  }
};
