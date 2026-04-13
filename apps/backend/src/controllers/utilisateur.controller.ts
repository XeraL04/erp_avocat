import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { User } from '../models/user.model';
import { AppError } from '../middlewares/error-handler';
import { sendSuccess } from '../utils/api-response';

// ─── Schémas Zod ─────────────────────────────────────────────────────────────

const schemaCreer = z.object({
  nom: z.string().trim().min(2, 'Minimum 2 caractères'),
  email: z.string().email('Email invalide').toLowerCase(),
  motDePasse: z.string().min(6, 'Minimum 6 caractères'),
});

const schemaModifier = z.object({
  nom: z.string().trim().min(2).optional(),
  email: z.string().email().toLowerCase().optional(),
  motDePasse: z.string().min(6).optional(),
});

const schemaStatut = z.object({
  actif: z.boolean(),
});

// ─── GET /api/cabinet/utilisateurs ───────────────────────────────────────────
export const listerUtilisateurs = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = req.utilisateur!.tenantId!;

    const utilisateurs = await User.find(
      { tenantId, role: 'assistant' },
      { motDePasse: 0 } // ne jamais retourner le hash
    )
      .sort({ createdAt: -1 })
      .lean();

    sendSuccess(res, { utilisateurs }, 200, {
      total: utilisateurs.length,
    });
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/cabinet/utilisateurs ──────────────────────────────────────────
export const creerAssistant = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = req.utilisateur!.tenantId!;
    const donnees = schemaCreer.parse(req.body);

    // Vérifier unicité email dans tout le système
    const existant = await User.findOne({ email: donnees.email });
    if (existant) {
      throw new AppError('Un compte avec cet email existe déjà', 'EMAIL_DEJA_UTILISE', 409);
    }

    const hash = await bcrypt.hash(donnees.motDePasse, 12);

    const utilisateur = await User.create({
      tenantId,
      nom: donnees.nom,
      email: donnees.email,
      motDePasse: hash,
      role: 'assistant', // forcé — seul l'admin peut créer des assistants
      actif: true,
    });

    // Retourner sans le hash
    const { motDePasse: _, ...utilisateurSafe } = utilisateur.toObject();

    sendSuccess(res, { utilisateur: utilisateurSafe }, 201);
  } catch (err) {
    next(err);
  }
};

// ─── PUT /api/cabinet/utilisateurs/:id ───────────────────────────────────────
export const modifierUtilisateur = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const tenantId = req.utilisateur!.tenantId!;
    const donnees = schemaModifier.parse(req.body);

    const utilisateur = await User.findOne({
      _id: id,
      tenantId,
      role: 'assistant',
    });
    if (!utilisateur) {
      throw new AppError('Utilisateur introuvable', 'UTILISATEUR_INTROUVABLE', 404);
    }

    // Vérifier unicité email si changé
    if (donnees.email && donnees.email !== utilisateur.email) {
      const existant = await User.findOne({
        email: donnees.email,
        _id: { $ne: id },
      });
      if (existant) {
        throw new AppError('Un compte avec cet email existe déjà', 'EMAIL_DEJA_UTILISE', 409);
      }
      utilisateur.email = donnees.email;
    }

    if (donnees.nom) utilisateur.nom = donnees.nom;

    if (donnees.motDePasse) {
      utilisateur.motDePasse = await bcrypt.hash(donnees.motDePasse, 12);
    }

    await utilisateur.save();

    const { motDePasse: _, ...utilisateurSafe } = utilisateur.toObject();
    sendSuccess(res, { utilisateur: utilisateurSafe });
  } catch (err) {
    next(err);
  }
};

// ─── PATCH /api/cabinet/utilisateurs/:id/statut ───────────────────────────────
export const changerStatutUtilisateur = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const tenantId = req.utilisateur!.tenantId!;
    const { actif } = schemaStatut.parse(req.body);

    // Empêcher de se désactiver soi-même
    if (id === req.utilisateur!.id?.toString()) {
      throw new AppError(
        'Vous ne pouvez pas modifier votre propre statut',
        'ACTION_INTERDITE',
        403
      );
    }

    const utilisateur = await User.findOneAndUpdate(
      { _id: id, tenantId, role: 'assistant' },
      { actif },
      { new: true, projection: { motDePasse: 0 } }
    ).lean();

    if (!utilisateur) {
      throw new AppError('Utilisateur introuvable', 'UTILISATEUR_INTROUVABLE', 404);
    }

    sendSuccess(res, { utilisateur });
  } catch (err) {
    next(err);
  }
};

// ─── DELETE /api/cabinet/utilisateurs/:id ────────────────────────────────────
export const supprimerUtilisateur = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const tenantId = req.utilisateur!.tenantId!;

    const utilisateur = await User.findOne({
      _id: id,
      tenantId,
      role: 'assistant',
    });
    if (!utilisateur) {
      throw new AppError('Utilisateur introuvable', 'UTILISATEUR_INTROUVABLE', 404);
    }

    await User.deleteOne({ _id: id });

    sendSuccess(res, { message: 'Utilisateur supprimé avec succès' });
  } catch (err) {
    next(err);
  }
};
