import { Request, Response, NextFunction } from 'express';
import { Evenement } from '../models/evenement.model';
import { Dossier } from '../models/dossier.model';
import { AppError } from '../middlewares/error-handler';
import { sendSuccess } from '../utils/api-response';
import { creerEvenementSchema, modifierEvenementSchema } from '../validations/evenement.validation';

// ─── GET /api/cabinet/evenements ─────────────────────────────────────────────

/**
 * Liste les événements du cabinet avec filtres optionnels.
 * Mobile-first : tri par dateHeure ASC (agenda chronologique).
 * Filtres : type, dossierId, dateDebut, dateFin
 */
export const listerEvenements = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = req.utilisateur!.tenantId!;

    // Construction du filtre dynamique
    const filtre: Record<string, unknown> = { tenantId };

    if (req.query.type) {
      filtre.type = req.query.type;
    }

    if (req.query.dossierId) {
      filtre.dossier = req.query.dossierId;
    }

    // Filtre par plage de dates
    if (req.query.dateDebut || req.query.dateFin) {
      const filtreDate: Record<string, Date> = {};
      if (req.query.dateDebut) {
        filtreDate.$gte = new Date(req.query.dateDebut as string);
      }
      if (req.query.dateFin) {
        filtreDate.$lte = new Date(req.query.dateFin as string);
      }
      filtre.dateHeure = filtreDate;
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;

    const [evenements, total] = await Promise.all([
      Evenement.find(filtre)
        .populate('dossier', 'reference titre type')
        .sort({ dateHeure: 1 }) // Ordre chronologique pour l'agenda
        .skip(skip)
        .limit(limit)
        .lean(),
      Evenement.countDocuments(filtre),
    ]);

    sendSuccess(res, { evenements }, 200, {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  } catch (erreur) {
    next(erreur);
  }
};

// ─── POST /api/cabinet/evenements ────────────────────────────────────────────

/**
 * Crée un événement.
 * Si un dossierId est fourni, vérifie qu'il appartient au cabinet.
 */
export const creerEvenement = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = req.utilisateur!.tenantId!;
    const donnees = creerEvenementSchema.parse(req.body);

    // Vérification du dossier si fourni
    if (donnees.dossierId) {
      const dossier = await Dossier.findOne({
        _id: donnees.dossierId,
        tenantId,
        isDeleted: false,
      });

      if (!dossier) {
        throw new AppError('Dossier introuvable', 'DOSSIER_INTROUVABLE', 404);
      }
    }

    const evenement = await Evenement.create({
      tenantId,
      titre: donnees.titre,
      type: donnees.type,
      dateHeure: new Date(donnees.dateHeure),
      lieu: donnees.lieu,
      dossier: donnees.dossierId ?? undefined,
      notes: donnees.notes,
    });

    const evenementPopule = await Evenement.findById(evenement._id)
      .populate('dossier', 'reference titre type')
      .lean();

    sendSuccess(res, { evenement: evenementPopule }, 201);
  } catch (erreur) {
    next(erreur);
  }
};

// ─── GET /api/cabinet/evenements/:id ─────────────────────────────────────────

export const obtenirEvenement = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const tenantId = req.utilisateur!.tenantId!;

    const evenement = await Evenement.findOne({ _id: id, tenantId })
      .populate('dossier', 'reference titre type statut')
      .lean();

    if (!evenement) {
      throw new AppError('Événement introuvable', 'EVENEMENT_INTROUVABLE', 404);
    }

    sendSuccess(res, { evenement });
  } catch (erreur) {
    next(erreur);
  }
};

// ─── PUT /api/cabinet/evenements/:id ─────────────────────────────────────────

export const modifierEvenement = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const tenantId = req.utilisateur!.tenantId!;

    const donnees = modifierEvenementSchema.parse(req.body);

    const evenement = await Evenement.findOne({ _id: id, tenantId });

    if (!evenement) {
      throw new AppError('Événement introuvable', 'EVENEMENT_INTROUVABLE', 404);
    }

    // Vérification du nouveau dossier si changé
    if (donnees.dossierId) {
      const dossier = await Dossier.findOne({
        _id: donnees.dossierId,
        tenantId,
        isDeleted: false,
      });

      if (!dossier) {
        throw new AppError('Dossier introuvable', 'DOSSIER_INTROUVABLE', 404);
      }
      evenement.dossier = donnees.dossierId as unknown as typeof evenement.dossier;
    }

    if (donnees.titre !== undefined) evenement.titre = donnees.titre;
    if (donnees.type !== undefined) evenement.type = donnees.type;
    if (donnees.dateHeure !== undefined) evenement.dateHeure = new Date(donnees.dateHeure);
    if (donnees.lieu !== undefined) evenement.lieu = donnees.lieu;
    if (donnees.notes !== undefined) evenement.notes = donnees.notes;

    await evenement.save();

    const evenementPopule = await Evenement.findById(evenement._id)
      .populate('dossier', 'reference titre type')
      .lean();

    sendSuccess(res, { evenement: evenementPopule });
  } catch (erreur) {
    next(erreur);
  }
};

// ─── DELETE /api/cabinet/evenements/:id ──────────────────────────────────────

export const supprimerEvenement = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const tenantId = req.utilisateur!.tenantId!;

    const evenement = await Evenement.findOne({ _id: id, tenantId });

    if (!evenement) {
      throw new AppError('Événement introuvable', 'EVENEMENT_INTROUVABLE', 404);
    }

    await Evenement.deleteOne({ _id: id });

    sendSuccess(res, { message: 'Événement supprimé avec succès' });
  } catch (erreur) {
    next(erreur);
  }
};

// ─── GET /api/cabinet/dossiers/:id/evenements ────────────────────────────────

/**
 * Liste les événements d'un dossier spécifique.
 * Remplace obtenirEvenementsDossier dans dossier.controller.ts.
 */
export const listerEvenementsDossier = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id: dossierId } = req.params;
    const tenantId = req.utilisateur!.tenantId!;

    const evenements = await Evenement.find({ dossier: dossierId, tenantId })
      .sort({ dateHeure: 1 })
      .lean();

    sendSuccess(res, { evenements }, 200, { total: evenements.length });
  } catch (erreur) {
    next(erreur);
  }
};
