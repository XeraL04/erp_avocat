import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Dossier } from '../models/dossier.model';
import { User } from '../models/user.model';
import { Tenant } from '../models/tenant.model';
import { AppError } from '../middlewares/error-handler';
import { sendSuccess } from '../utils/api-response';

export const getDashboardCabinet = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = req.utilisateur!.tenantId;

    console.log('tenantId reçu :', tenantId, typeof tenantId);

    // ✅ Vérifier que tenantId existe dans le token
    if (!tenantId) {
      throw new AppError('tenantId manquant dans le token', 'TENANT_MANQUANT', 400);
    }

    // ✅ Convertir en ObjectId pour être sûr que Mongoose le trouve
    const tenantObjectId = new mongoose.Types.ObjectId(tenantId);

    const [
      totalDossiers,
      dossiersEnCours,
      dossiersSuspendus,
      dossiersClotures,
      totalUtilisateurs,
      tenant,
    ] = await Promise.all([
      Dossier.countDocuments({ tenantId: tenantObjectId, isDeleted: false }),
      Dossier.countDocuments({ tenantId: tenantObjectId, statut: 'en_cours', isDeleted: false }),
      Dossier.countDocuments({ tenantId: tenantObjectId, statut: 'suspendu', isDeleted: false }),
      Dossier.countDocuments({ tenantId: tenantObjectId, statut: 'cloture', isDeleted: false }),
      User.countDocuments({ tenantId: tenantObjectId, actif: true }),
      Tenant.findById(tenantObjectId).select('nom plan statut limites compteurs'),
    ]);

    // ✅ Vérifier que le cabinet existe bien en base
    if (!tenant) {
      throw new AppError('Cabinet introuvable', 'CABINET_INTROUVABLE', 404);
    }

    const derniersDossiers = await Dossier.find({
      tenantId: tenantObjectId,
      isDeleted: false,
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('client', 'type nom prenom raisonSociale telephone')
      .select('reference titre statut type dateOuverture client');

    sendSuccess(res, {
      stats: {
        totalDossiers,
        dossiersEnCours,
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
