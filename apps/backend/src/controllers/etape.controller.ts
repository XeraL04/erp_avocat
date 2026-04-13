import { Request, Response, NextFunction } from 'express';
import { Etape } from '../models/etape.model';
import { Dossier } from '../models/dossier.model';
import { AppError } from '../middlewares/error-handler';
import { sendSuccess } from '../utils/api-response';
import { creerEtapeSchema, modifierEtapeSchema } from '../validations/etape.validation';

// ─── POST /api/cabinet/dossiers/:id/etapes ────────────────────────────────────

/**
 * Ajoute une étape procédurale à un dossier.
 */
export const creerEtape = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id: dossierId } = req.params;
    const tenantId = req.utilisateur!.tenantId!;

    console.log('📦 req.body reçu :', JSON.stringify(req.body, null, 2));

    const donnees = creerEtapeSchema.parse(req.body);

    // Vérification que le dossier existe et est actif
    const dossier = await Dossier.findOne({
      _id: dossierId,
      tenantId,
      isDeleted: false,
    });

    if (!dossier) {
      throw new AppError('Dossier introuvable', 'DOSSIER_INTROUVABLE', 404);
    }

    const etape = await Etape.create({
      tenantId,
      dossier: dossierId,
      nom: donnees.nom,
      date: new Date(donnees.date),
      statut: donnees.statut,
      notes: donnees.notes,
    });

    sendSuccess(res, { etape }, 201);
  } catch (erreur) {
    next(erreur);
  }
};

// ─── PUT /api/cabinet/etapes/:id ─────────────────────────────────────────────

export const modifierEtape = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const tenantId = req.utilisateur!.tenantId!;

    const donnees = modifierEtapeSchema.parse(req.body);

    const etape = await Etape.findOne({ _id: id, tenantId });

    if (!etape) {
      throw new AppError('Étape introuvable', 'ETAPE_INTROUVABLE', 404);
    }

    if (donnees.nom !== undefined) etape.nom = donnees.nom;
    if (donnees.date !== undefined) etape.date = new Date(donnees.date);
    if (donnees.statut !== undefined) etape.statut = donnees.statut;
    if (donnees.notes !== undefined) etape.notes = donnees.notes;

    await etape.save();

    sendSuccess(res, { etape });
  } catch (erreur) {
    next(erreur);
  }
};

// ─── DELETE /api/cabinet/etapes/:id ──────────────────────────────────────────

export const supprimerEtape = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const tenantId = req.utilisateur!.tenantId!;

    const etape = await Etape.findOne({ _id: id, tenantId });

    if (!etape) {
      throw new AppError('Étape introuvable', 'ETAPE_INTROUVABLE', 404);
    }

    await Etape.deleteOne({ _id: id });

    sendSuccess(res, { message: 'Étape supprimée avec succès' });
  } catch (erreur) {
    next(erreur);
  }
};

// ─── GET /api/cabinet/dossiers/:id/etapes ────────────────────────────────────

/**
 * Liste les étapes d'un dossier triées par date.
 * Remplace obtenirEtapesDossier dans dossier.controller.ts.
 */
export const listerEtapesDossier = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id: dossierId } = req.params;
    const tenantId = req.utilisateur!.tenantId!;

    const etapes = await Etape.find({ dossier: dossierId, tenantId }).sort({ date: 1 }).lean();

    sendSuccess(res, { etapes }, 200, { total: etapes.length });
  } catch (erreur) {
    next(erreur);
  }
};

// ─── GET /api/cabinet/etape ────────────────────────────────────

export const listerToutesEtapes = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = req.utilisateur!.tenantId!;
    const filtre: Record<string, unknown> = { tenantId };

    if (req.query.statut) filtre.statut = req.query.statut;
    if (req.query.dossierId) filtre.dossier = req.query.dossierId;

    // Filtre par plage de dates
    if (req.query.dateDebut || req.query.dateFin) {
      const filtreDate: Record<string, Date> = {};
      if (req.query.dateDebut) filtreDate.$gte = new Date(req.query.dateDebut as string);
      if (req.query.dateFin) filtreDate.$lte = new Date(req.query.dateFin as string);
      filtre.date = filtreDate;
    }

    const etapes = await Etape.find(filtre)
      .populate('dossier', 'reference titre type statut')
      .sort({ date: 1 }) // ordre chronologique ascendant
      .lean();

    sendSuccess(res, { etapes }, 200, { total: etapes.length });
  } catch (erreur) {
    next(erreur);
  }
};
