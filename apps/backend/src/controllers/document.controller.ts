import { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import { DocumentModel } from '../models/document.model';
import Dossier from '../models/dossier.model';
import { Tenant } from '../models/tenant.model';
import { AppError } from '../middlewares/error-handler';
import { sendSuccess } from '../utils/api-response';
import { creerDocumentSchema } from '../validations/document.validation';

// ─── GET /api/cabinet/documents ──────────────────────────────────────────────

export const listerDocuments = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = req.utilisateur!.tenantId!;

    const filtre: Record<string, unknown> = { tenantId };
    if (req.query.type) filtre.type = req.query.type;
    if (req.query.dossierId) filtre.dossier = req.query.dossierId;

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const [documents, total] = await Promise.all([
      DocumentModel.find(filtre)
        .populate('dossier', 'reference titre type')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      DocumentModel.countDocuments(filtre),
    ]);

    sendSuccess(res, { documents }, 200, {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  } catch (erreur) {
    next(erreur);
  }
};

// ─── POST /api/cabinet/documents/upload ──────────────────────────────────────

/**
 * Enregistre un document uploadé localement par Multer.
 * req.file.path contient le chemin absolu sur le disque.
 * req.file.filename contient le nom généré par Multer.
 */
export const uploadDocument = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = req.utilisateur!.tenantId!;

    // Vérification de la présence du fichier (Multer)
    if (!req.file) {
      throw new AppError('Aucun fichier fourni', 'FICHIER_MANQUANT', 400);
    }

    // Validation des métadonnées du document
    const donnees = creerDocumentSchema.parse(req.body);

    // Vérification que le dossier existe et appartient au cabinet
    const dossier = await Dossier.findOne({
      _id: donnees.dossierId,
      tenantId,
      isDeleted: false,
    });

    if (!dossier) {
      // Suppression du fichier uploadé si le dossier est invalide
      fs.unlinkSync(req.file.path);
      throw new AppError('Dossier introuvable', 'DOSSIER_INTROUVABLE', 404);
    }

    // Vérification de la limite de stockage du plan
    const tenant = await Tenant.findById(tenantId).lean();
    if (!tenant) {
      fs.unlinkSync(req.file.path);
      throw new AppError('Cabinet introuvable', 'CABINET_INTROUVABLE', 404);
    }

    // maxDocuments = -1 signifie illimité (plan premium)
    if (tenant.limites.maxDocuments !== -1) {
      const stockageUtilise = await DocumentModel.aggregate([
        { $match: { tenantId: tenant._id } },
        { $group: { _id: null, total: { $sum: '$taille' } } },
      ]);

      const totalOctets = stockageUtilise.length > 0 ? stockageUtilise[0].total : 0;
      const limiteOctets = tenant.limites.maxDocuments * 1024 * 1024;

      if (totalOctets + req.file.size > limiteOctets) {
        // Suppression du fichier uploadé si limite dépassée
        fs.unlinkSync(req.file.path);

        const utiliseMB = (totalOctets / 1024 / 1024).toFixed(1);
        const limiteMB = tenant.limites.maxDocuments;
        throw new AppError(
          `Limite de stockage atteinte : ${utiliseMB} MB / ${limiteMB} MB`,
          'LIMITE_STOCKAGE_ATTEINTE',
          403
        );
      }
    }

    // Construction de l'URL relative accessible via /uploads/{tenantId}/{filename}
    const urlRelative = `/uploads/${tenantId}/${req.file.filename}`;

    // Création de l'entrée en base
    const document = await DocumentModel.create({
      tenantId,
      nom: donnees.nom,
      type: donnees.type,
      dossier: donnees.dossierId,
      url: urlRelative,
      cloudinaryId: req.file.filename, // Réutilisation du champ pour le nom local
      description: donnees.description,
      taille: req.file.size,
    });

    const documentPopule = await DocumentModel.findById(document._id)
      .populate('dossier', 'reference titre type')
      .lean();

    sendSuccess(res, { document: documentPopule }, 201);
  } catch (erreur) {
    next(erreur);
  }
};

// ─── GET /api/cabinet/documents/:id ──────────────────────────────────────────

export const obtenirDocument = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const tenantId = req.utilisateur!.tenantId!;

    const document = await DocumentModel.findOne({ _id: id, tenantId })
      .populate('dossier', 'reference titre type statut')
      .lean();

    if (!document) {
      throw new AppError('Document introuvable', 'DOCUMENT_INTROUVABLE', 404);
    }

    sendSuccess(res, { document });
  } catch (erreur) {
    next(erreur);
  }
};

// ─── DELETE /api/cabinet/documents/:id ───────────────────────────────────────

/**
 * Supprime le document de la base ET le fichier physique sur le disque.
 */
export const supprimerDocument = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const tenantId = req.utilisateur!.tenantId!;

    const document = await DocumentModel.findOne({ _id: id, tenantId });

    if (!document) {
      throw new AppError('Document introuvable', 'DOCUMENT_INTROUVABLE', 404);
    }

    // Suppression du fichier physique sur le disque
    const cheminFichier = path.join(
      process.cwd(),
      'uploads',
      tenantId,
      document.cloudinaryId // Contient le nom de fichier local
    );

    if (fs.existsSync(cheminFichier)) {
      fs.unlinkSync(cheminFichier);
    }

    await DocumentModel.deleteOne({ _id: id });

    sendSuccess(res, { message: 'Document supprimé avec succès' });
  } catch (erreur) {
    next(erreur);
  }
};

// ─── GET /api/cabinet/dossiers/:id/documents ─────────────────────────────────

export const listerDocumentsDossier = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id: dossierId } = req.params;
    const tenantId = req.utilisateur!.tenantId!;

    const documents = await DocumentModel.find({ dossier: dossierId, tenantId })
      .sort({ createdAt: -1 })
      .lean();

    sendSuccess(res, { documents }, 200, { total: documents.length });
  } catch (erreur) {
    next(erreur);
  }
};
