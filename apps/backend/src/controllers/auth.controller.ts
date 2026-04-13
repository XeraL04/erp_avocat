import { Request, Response, NextFunction } from 'express';
import { User } from '../models/user.model';
import { AppError } from '../middlewares/error-handler';
import { genererAccessToken, genererRefreshToken, verifierRefreshToken } from '../utils/jwt.utils';
import { sendSuccess, sendError } from '../utils/api-response';
import { z } from 'zod';
import { ENV } from '../config/env';

// Schémas de validation Zod
const loginSchema = z.object({
  email: z.string().email('Email invalide'),
  motDePasse: z.string().min(1, 'Mot de passe requis'),
});

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: ENV.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 jours en ms
};

// POST /api/auth/login
export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, motDePasse } = loginSchema.parse(req.body);

    // Récupère l'utilisateur avec le mot de passe (select: false par défaut)
    const utilisateur = await User.findOne({ email, actif: true }).select('+motDePasse');
    if (!utilisateur) {
      throw new AppError('Email ou mot de passe incorrect', 'IDENTIFIANTS_INVALIDES', 401);
    }

    const motDePasseValide = await utilisateur.comparerMotDePasse(motDePasse);
    if (!motDePasseValide) {
      throw new AppError('Email ou mot de passe incorrect', 'IDENTIFIANTS_INVALIDES', 401);
    }

    const payload = {
      id: utilisateur._id.toString(),
      role: utilisateur.role,
      tenantId: utilisateur.tenantId?.toString(),
    };
    const accessToken = genererAccessToken(payload);
    const refreshToken = genererRefreshToken(payload);

    // Refresh token dans un cookie httpOnly sécurisé
    res.cookie('refreshToken', refreshToken, COOKIE_OPTIONS);

    sendSuccess(res, {
      accessToken,
      utilisateur: {
        _id: utilisateur._id,
        nom: utilisateur.nom,
        email: utilisateur.email,
        role: utilisateur.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/auth/refresh
export const refreshToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) {
      throw new AppError('Refresh token manquant', 'REFRESH_TOKEN_MANQUANT', 401);
    }

    const decoded = verifierRefreshToken(token);
    const utilisateur = await User.findById(decoded.id).select('-motDePasse');
    if (!utilisateur || !utilisateur.actif) {
      throw new AppError('Utilisateur introuvable', 'UTILISATEUR_INACTIF', 401);
    }

    const payload = {
      id: utilisateur._id.toString(),
      role: utilisateur.role,
      tenantId: utilisateur.tenantId?.toString(),
    };
    const newAccessToken = genererAccessToken(payload);

    sendSuccess(res, { accessToken: newAccessToken });
  } catch (error) {
    next(error);
  }
};

// POST /api/auth/logout
export const logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    res.clearCookie('refreshToken', COOKIE_OPTIONS);
    sendSuccess(res, { message: 'Déconnexion réussie' });
  } catch (error) {
    next(error);
  }
};

// GET /api/auth/me
export const getMe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const utilisateur = await User.findById(req.utilisateur!.id);
    if (!utilisateur) {
      throw new AppError('Utilisateur introuvable', 'UTILISATEUR_INTROUVABLE', 404);
    }
    sendSuccess(res, { utilisateur });
  } catch (error) {
    next(error);
  }
};

// PUT /api/auth/password
export const changerMotDePasse = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const schema = z.object({
      ancienMotDePasse: z.string().min(1),
      nouveauMotDePasse: z.string().min(6, 'Minimum 6 caractères'),
    });

    const { ancienMotDePasse, nouveauMotDePasse } = schema.parse(req.body);

    const utilisateur = await User.findById(req.utilisateur!.id).select('+motDePasse');
    if (!utilisateur) throw new AppError('Utilisateur introuvable', 'INTROUVABLE', 404);

    const valide = await utilisateur.comparerMotDePasse(ancienMotDePasse);
    if (!valide) throw new AppError('Ancien mot de passe incorrect', 'MOT_DE_PASSE_INVALIDE', 400);

    utilisateur.motDePasse = nouveauMotDePasse;
    await utilisateur.save();

    sendSuccess(res, { message: 'Mot de passe modifié avec succès' });
  } catch (error) {
    next(error);
  }
};
