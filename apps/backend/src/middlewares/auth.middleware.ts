import { Request, Response, NextFunction } from 'express';
import { TokenExpiredError, JsonWebTokenError } from 'jsonwebtoken';
import { verifierAccessToken } from '../utils/jwt.utils';
import { AppError } from './error-handler';
import { User } from '../models/user.model';

declare global {
  namespace Express {
    interface Request {
      utilisateur?: {
        id: string;
        role: 'superadmin' | 'admin' | 'assistant';
        tenantId?: string;
      };
    }
  }
}

export const proteger = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new AppError('Token manquant', 'TOKEN_MANQUANT', 401);
    }

    const token = authHeader.split(' ')[1];

    // ✅ Bloc séparé pour capturer les erreurs JWT et les convertir en 401
    let decoded: ReturnType<typeof verifierAccessToken>;
    try {
      decoded = verifierAccessToken(token);
    } catch (erreurJwt) {
      if (erreurJwt instanceof TokenExpiredError) {
        // 401 → l'intercepteur axios déclenche le refresh automatique
        throw new AppError('Token expiré', 'TOKEN_EXPIRE', 401);
      }
      if (erreurJwt instanceof JsonWebTokenError) {
        throw new AppError('Token invalide', 'TOKEN_INVALIDE', 401);
      }
      throw erreurJwt;
    }

    const utilisateur = await User.findById(decoded.id).select('-motDePasse');
    if (!utilisateur || !utilisateur.actif) {
      throw new AppError('Utilisateur introuvable ou inactif', 'UTILISATEUR_INACTIF', 401);
    }

    req.utilisateur = {
      id: decoded.id,
      role: decoded.role,
      tenantId: decoded.tenantId,
    };
    next();
  } catch (error) {
    next(error);
  }
};

export const restreindreA = (...roles: ('superadmin' | 'admin' | 'assistant')[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.utilisateur || !roles.includes(req.utilisateur.role)) {
      return next(new AppError('Accès non autorisé', 'ACCES_REFUSE', 403));
    }
    next();
  };
};
