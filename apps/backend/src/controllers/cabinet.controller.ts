import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import Dossier from '../models/dossier.model';   // ← default import (plus named)
import { User }   from '../models/user.model';
import { Tenant } from '../models/tenant.model';
import { AppError }    from '../middlewares/error-handler';
import { sendSuccess } from '../utils/api-response';

export const getDashboardCabinet = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = req.utilisateur!.tenantId;

    console.log('tenantId reçu :', tenantId, typeof tenantId);

    if (!tenantId) {
      throw new AppError('tenantId manquant dans le token', 'TENANT_MANQUANT', 400);
    }

    const tenantObjectId = new mongoose.Types.ObjectId(tenantId);

    const [
      totalDossiers,
      dossiersEncours,      // 'en_cours' → 'encours'
      dossiersSuspendus,
      dossiersClotures,
      totalUtilisateurs,
      tenant,
    ] = await Promise.all([
      Dossier.countDocuments({ tenantId: tenantObjectId, isDeleted: false }),
      Dossier.countDocuments({ tenantId: tenantObjectId, statut: 'encours',  isDeleted: false }),
      Dossier.countDocuments({ tenantId: tenantObjectId, statut: 'suspendu', isDeleted: false }),
      Dossier.countDocuments({ tenantId: tenantObjectId, statut: 'cloture',  isDeleted: false }),
      User.countDocuments({ tenantId: tenantObjectId, actif: true }),
      Tenant.findById(tenantObjectId).select('nom plan statut limites compteurs'),
    ]);

    if (!tenant) {
      throw new AppError('Cabinet introuvable', 'CABINET_INTROUVABLE', 404);
    }

    // Derniers dossiers — populate sur clientId (plus 'client')
    const derniersDossiers = await Dossier.find({
      tenantId:  tenantObjectId,
      isDeleted: false,
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('clientId', 'type nom prenom raisonSociale telephone')
      .select('reference adversaire qualiteClient qualiteAdversaire statut section institution dateOuverture clientId dossierNumero');

    sendSuccess(res, {
      stats: {
        totalDossiers,
        dossiersEncours,      // clé renommée aussi
        dossiersSuspendus,
        dossiersClotures,
        totalUtilisateurs,
      },
      cabinet: tenant,
      derniersDossiers,
    });
  } catch (error) {
    next(error);
  }
};