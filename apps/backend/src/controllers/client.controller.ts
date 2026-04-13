import { Request, Response, NextFunction } from 'express';
import mongoose, { FilterQuery } from 'mongoose'; // ✅ FIX : importer FilterQuery
import { Client, IClient } from '../models/client.model'; // ✅ FIX : importer IClient
import { Dossier } from '../models/dossier.model';
import { Paiement } from '../models/paiement.model';
import { sendSuccess, sendError } from '../utils/api-response';
import { AppError } from '../middlewares/error-handler';
import {
  creerClientSchema,
  modifierClientSchema,
  rechercheClientSchema,
} from '../validations/client.validation';

// ─── Helper : valider un ObjectId et trouver le client dans le tenant ──────────

/**
 * Vérifie que l'ID est un ObjectId valide et que le client
 * appartient au tenant courant (non supprimé).
 * Lève une AppError sinon.
 */
const trouverClientDuTenant = async (clientId: string, tenantId: string) => {
  if (!mongoose.Types.ObjectId.isValid(clientId)) {
    throw new AppError('Identifiant client invalide', 'ID_INVALIDE', 400);
  }

  const client = await Client.findOne({
    _id: clientId,
    tenantId,
    isDeleted: false,
  });

  if (!client) {
    throw new AppError('Client introuvable', 'CLIENT_INTROUVABLE', 404);
  }

  return client;
};

// ─── GET /api/cabinet/clients ─────────────────────────────────────────────────

export const listerClients = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = req.utilisateur!.tenantId!;

    const parsed = rechercheClientSchema.safeParse(req.query);
    if (!parsed.success) {
      throw new AppError(parsed.error.errors[0].message, 'VALIDATION_ERROR', 400);
    }

    const { q, telephone, type, page, limit } = parsed.data;
    const skip = (page - 1) * limit;

    // ✅ FIX : FilterQuery<IClient> au lieu de Record<string, unknown>
    // Cela évite l'erreur "string | string[]" sur les opérateurs Mongoose ($text, $regex)
    const filtre: FilterQuery<IClient> = {
      tenantId,
      isDeleted: false,
    };

    if (type) {
      filtre.type = type;
    }

    if (telephone) {
      const telNettoye = telephone.replace(/\s+/g, '');
      filtre.telephone = { $regex: telNettoye, $options: 'i' };
    }

    let utiliseTextSearch = false;

    if (q) {
      const qNettoye = q.trim();
      if (qNettoye.length < 3) {
        filtre.$or = [
          { nom: { $regex: qNettoye, $options: 'i' } },
          { prenom: { $regex: qNettoye, $options: 'i' } },
          { raisonSociale: { $regex: qNettoye, $options: 'i' } },
          { representantLegal: { $regex: qNettoye, $options: 'i' } },
        ];
      } else {
        filtre.$text = { $search: qNettoye };
        utiliseTextSearch = true;
      }
    }

    const [clients, total] = await Promise.all([
      Client.find(filtre)
        .sort(utiliseTextSearch ? { score: { $meta: 'textScore' } } : { createdAt: -1 })
        .select(utiliseTextSearch ? { __v: 0, score: { $meta: 'textScore' } } : { __v: 0 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Client.countDocuments(filtre),
    ]);

    sendSuccess(res, clients, 200, {
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── POST /api/cabinet/clients ────────────────────────────────────────────────

export const creerClient = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = req.utilisateur!.tenantId!;

    const parsed = creerClientSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(parsed.error.errors[0].message, 'VALIDATION_ERROR', 400);
    }

    const telephoneExistant = await Client.findOne({
      tenantId,
      telephone: parsed.data.telephone,
      isDeleted: false,
    });

    if (telephoneExistant) {
      throw new AppError(
        'Un client avec ce numéro de téléphone existe déjà dans ce cabinet',
        'TELEPHONE_DEJA_UTILISE',
        409
      );
    }

    const client = await Client.create({ ...parsed.data, tenantId });

    // ✅ FIX : statusCode dans l'options object (plus d'ambiguïté avec le nombre brut)
    sendSuccess(res, client, 201);
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/cabinet/clients/:id ─────────────────────────────────────────────

export const obtenirClient = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = req.utilisateur!.tenantId!;
    const clientId = req.params.id as string;
    const client = await trouverClientDuTenant(clientId, tenantId);
    sendSuccess(res, client);
  } catch (error) {
    next(error);
  }
};

// ─── PUT /api/cabinet/clients/:id ─────────────────────────────────────────────

export const modifierClient = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = req.utilisateur!.tenantId!;

    const clientId = req.params.id as string;
    const client = await trouverClientDuTenant(clientId, tenantId);

    const parsed = modifierClientSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(parsed.error.errors[0].message, 'VALIDATION_ERROR', 400);
    }

    if (parsed.data.telephone && parsed.data.telephone !== client.telephone) {
      const doublon = await Client.findOne({
        tenantId,
        telephone: parsed.data.telephone,
        isDeleted: false,
        _id: { $ne: client._id },
      });

      if (doublon) {
        throw new AppError(
          'Un client avec ce numéro de téléphone existe déjà dans ce cabinet',
          'TELEPHONE_DEJA_UTILISE',
          409
        );
      }
    }

    // ✅ FIX : typage explicite pour éviter l'erreur sur la déstructuration de "type"
    const donneesMaj = { ...parsed.data } as Partial<IClient>;
    // Le type est immuable — on le supprime des données de mise à jour
    delete (donneesMaj as Record<string, unknown>)['type'];

    const clientMaj = await Client.findByIdAndUpdate(
      client._id,
      { $set: donneesMaj },
      { new: true, runValidators: true }
    ).select('-__v');

    sendSuccess(res, clientMaj);
  } catch (error) {
    next(error);
  }
};

// ─── DELETE /api/cabinet/clients/:id ─────────────────────────────────────────

export const supprimerClient = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = req.utilisateur!.tenantId!;
    const clientId = req.params.id as string;
    const client = await trouverClientDuTenant(clientId, tenantId);

    await Client.findByIdAndUpdate(client._id, { isDeleted: true });

    sendSuccess(res, { message: 'Client archivé avec succès', id: client._id });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/cabinet/clients/:id/dossiers ────────────────────────────────────

export const obtenirDossiersClient = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = req.utilisateur!.tenantId!;

    const clientId = req.params.id as string;
    const client = await trouverClientDuTenant(clientId, tenantId);

    const dossiers = await Dossier.find({
      tenantId,
      client: client._id,
      isDeleted: false,
    })
      .sort({ dateOuverture: -1 })
      .select('-__v')
      .lean();

    // ✅ FIX : meta dans options object
    sendSuccess(res, dossiers, 200, {
      meta: { total: dossiers.length },
    });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/cabinet/clients/:id/paiements ───────────────────────────────────

export const obtenirPaiementsClient = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = req.utilisateur!.tenantId!;

    const clientId = req.params.id as string;
    const client = await trouverClientDuTenant(clientId, tenantId);

    const dossiers = await Dossier.find({
      tenantId,
      client: client._id,
    })
      .select('_id')
      .lean();

    // ✅ FIX : typage explicite des IDs pour éviter "string | string[]" dans $in
    const dossierIds = dossiers.map((d) => d._id as mongoose.Types.ObjectId);

    const paiements = await Paiement.find({
      tenantId,
      dossier: { $in: dossierIds },
    })
      .populate('dossier', 'reference titre statut')
      .populate('honoraire', 'montantTotal type')
      .sort({ date: -1 })
      .select('-__v')
      .lean();

    // Calcul côté backend — règle métier #4
    const totalPaye = paiements.reduce((acc, paiement) => acc + paiement.montant, 0);

    sendSuccess(res, paiements, 200, {
      meta: {
        total: paiements.length,
        totalPaye,
        devise: 'DA',
      },
    });
  } catch (error) {
    next(error);
  }
};
