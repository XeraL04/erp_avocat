import { Request, Response, NextFunction } from 'express';
import { Tenant } from '../models/tenant.model';
import { AppError } from './error-handler';

// Enrichit le type Request pour exposer req.tenant dans les contrôleurs
declare global {
  namespace Express {
    interface Request {
      tenant?: InstanceType<typeof Tenant>;
    }
  }
}

/**
 * Middleware injecterTenant — à placer après proteger()
 *
 * Responsabilités :
 * 1. Vérifie que l'utilisateur possède un tenantId (bloque le superadmin sur les routes cabinet)
 * 2. Charge le cabinet depuis la DB et vérifie qu'il est actif
 * 3. Injecte req.tenant pour usage optionnel dans les contrôleurs
 *
 * Le tenantId est déjà dans req.utilisateur (injecté par proteger via le JWT).
 * On ne fait confiance qu'au JWT — jamais au body ou aux query params.
 */
export const injecterTenant = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = req.utilisateur?.tenantId;

    // Le superadmin n'a pas de tenantId — il n'a pas accès aux routes /cabinet
    if (!tenantId) {
      throw new AppError("Accès réservé aux utilisateurs d'un cabinet", 'TENANT_REQUIS', 403);
    }

    // Charger le cabinet pour vérifier son statut
    const tenant = await Tenant.findById(tenantId);

    if (!tenant) {
      throw new AppError('Cabinet introuvable', 'TENANT_INTROUVABLE', 404);
    }

    // Bloquer les cabinets suspendus ou expirés
    if (tenant.statut === 'suspendu') {
      throw new AppError(
        "Votre cabinet est suspendu. Contactez l'administrateur.",
        'TENANT_SUSPENDU',
        403
      );
    }

    if (tenant.statut === 'expire') {
      throw new AppError(
        'Votre abonnement a expiré. Veuillez renouveler votre abonnement.',
        'TENANT_EXPIRE',
        403
      );
    }

    // Vérifier expiration de la période d'essai
    if (tenant.statut === 'essai' && tenant.dateFinEssai && tenant.dateFinEssai < new Date()) {
      throw new AppError(
        "Votre période d'essai est terminée. Veuillez souscrire un abonnement.",
        'ESSAI_EXPIRE',
        403
      );
    }

    // Injecter le tenant dans la requête pour usage optionnel dans les contrôleurs
    req.tenant = tenant;

    next();
  } catch (error) {
    next(error);
  }
};
