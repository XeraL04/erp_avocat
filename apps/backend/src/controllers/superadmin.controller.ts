import { Request, Response, NextFunction } from 'express';
import { Tenant } from '../models/tenant.model';
import { User } from '../models/user.model';
import { AppError } from '../middlewares/error-handler';
import { sendSuccess } from '../utils/api-response';
import { z } from 'zod';

// ─────────────────────────────────────────
// Schémas de validation Zod
// ─────────────────────────────────────────

const creerTenantSchema = z.object({
  nom: z.string().min(2, 'Nom minimum 2 caractères'),
  slug: z
    .string()
    .min(2)
    .regex(/^[a-z0-9-]+$/, 'Slug : lettres minuscules, chiffres et tirets uniquement'),
  email: z.string().email('Email invalide'),
  telephone: z.string().optional(),
  adresse: z.string().optional(),
  plan: z.enum(['starter', 'pro', 'premium']).default('starter'),
  // Admin du cabinet
  adminNom: z.string().min(2, 'Nom admin requis'),
  adminEmail: z.string().email('Email admin invalide'),
  adminMotDePasse: z.string().min(6, 'Mot de passe minimum 6 caractères'),
});

const modifierTenantSchema = z.object({
  nom: z.string().min(2).optional(),
  telephone: z.string().optional(),
  adresse: z.string().optional(),
  plan: z.enum(['starter', 'pro', 'premium']).optional(),
  limites: z
    .object({
      maxDossiers: z.number().min(1).optional(),
      maxDocuments: z.number().min(1).optional(),
      maxUtilisateurs: z.number().min(1).optional(),
    })
    .optional(),
});

const changerStatutSchema = z.object({
  statut: z.enum(['actif', 'suspendu', 'expire', 'essai']),
});

// ─────────────────────────────────────────
// GET /api/superadmin/dashboard
// ─────────────────────────────────────────
export const getDashboard = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const [totalTenants, tenantsActifs, tenantsSuspendus, tenantsEssai, tenantsExpires] =
      await Promise.all([
        Tenant.countDocuments(),
        Tenant.countDocuments({ statut: 'actif' }),
        Tenant.countDocuments({ statut: 'suspendu' }),
        Tenant.countDocuments({ statut: 'essai' }),
        Tenant.countDocuments({ statut: 'expire' }),
      ]);

    // Derniers cabinets inscrits
    const derniersInscrits = await Tenant.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('nom email plan statut createdAt');

    sendSuccess(res, {
      stats: {
        totalTenants,
        tenantsActifs,
        tenantsSuspendus,
        tenantsEssai,
        tenantsExpires,
      },
      derniersInscrits,
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────
// GET /api/superadmin/tenants
// ─────────────────────────────────────────
export const getTenants = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const statut = req.query.statut as string;
    const plan = req.query.plan as string;
    const search = req.query.search as string;

    // Construction du filtre
    const filtre: Record<string, unknown> = {};
    if (statut) filtre.statut = statut;
    if (plan) filtre.plan = plan;
    if (search) {
      filtre.$or = [
        { nom: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { slug: { $regex: search, $options: 'i' } },
      ];
    }

    const [tenants, total] = await Promise.all([
      Tenant.find(filtre)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Tenant.countDocuments(filtre),
    ]);

    sendSuccess(res, { tenants }, 200, { page, limit, total });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────
// GET /api/superadmin/tenants/:id
// ─────────────────────────────────────────
export const getTenantById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenant = await Tenant.findById(req.params.id);
    if (!tenant) {
      throw new AppError('Cabinet introuvable', 'TENANT_INTROUVABLE', 404);
    }

    // Récupère les utilisateurs du cabinet
    const utilisateurs = await User.find({ tenantId: tenant._id }).select('-motDePasse');

    sendSuccess(res, { tenant, utilisateurs });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────
// POST /api/superadmin/tenants
// Crée un cabinet + son admin en une seule opération
// ─────────────────────────────────────────
export const creerTenant = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const data = creerTenantSchema.parse(req.body);

    // Vérifie que le slug et l'email ne sont pas déjà pris
    const existant = await Tenant.findOne({
      $or: [{ slug: data.slug }, { email: data.email }],
    });
    if (existant) {
      throw new AppError(
        'Un cabinet avec ce slug ou cet email existe déjà',
        'TENANT_DEJA_EXISTANT',
        409
      );
    }

    // Vérifie que l'email admin n'est pas déjà utilisé
    const adminExistant = await User.findOne({ email: data.adminEmail });
    if (adminExistant) {
      throw new AppError('Un utilisateur avec cet email existe déjà', 'EMAIL_DEJA_UTILISE', 409);
    }

    // Définit les limites selon le plan
    const limitesParPlan = {
      starter: { maxDossiers: 50, maxDocuments: 500, maxUtilisateurs: 2 },
      pro: { maxDossiers: 200, maxDocuments: 2000, maxUtilisateurs: 5 },
      premium: { maxDossiers: 99999, maxDocuments: 99999, maxUtilisateurs: 99999 },
    };

    // Crée le cabinet
    const tenant = await Tenant.create({
      nom: data.nom,
      slug: data.slug,
      email: data.email,
      telephone: data.telephone,
      adresse: data.adresse,
      plan: data.plan,
      statut: 'actif',
      limites: limitesParPlan[data.plan],
    });

    // Crée l'admin du cabinet
    const admin = await User.create({
      nom: data.adminNom,
      email: data.adminEmail,
      motDePasse: data.adminMotDePasse,
      role: 'admin',
      tenantId: tenant._id,
      actif: true,
    });

    // Incrémente le compteur utilisateurs
    await Tenant.findByIdAndUpdate(tenant._id, {
      $inc: { 'compteurs.utilisateurs': 1 },
    });

    sendSuccess(
      res,
      {
        tenant,
        admin: {
          _id: admin._id,
          nom: admin.nom,
          email: admin.email,
          role: admin.role,
        },
      },
      201
    );
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────
// PUT /api/superadmin/tenants/:id
// ─────────────────────────────────────────
export const modifierTenant = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const data = modifierTenantSchema.parse(req.body);

    const tenant = await Tenant.findByIdAndUpdate(
      req.params.id,
      { $set: data },
      { new: true, runValidators: true }
    );

    if (!tenant) {
      throw new AppError('Cabinet introuvable', 'TENANT_INTROUVABLE', 404);
    }

    sendSuccess(res, { tenant });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────
// PATCH /api/superadmin/tenants/:id/statut
// ─────────────────────────────────────────
export const changerStatutTenant = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { statut } = changerStatutSchema.parse(req.body);

    const tenant = await Tenant.findByIdAndUpdate(
      req.params.id,
      { $set: { statut } },
      { new: true }
    );

    if (!tenant) {
      throw new AppError('Cabinet introuvable', 'TENANT_INTROUVABLE', 404);
    }

    const messages = {
      actif: '✅ Cabinet activé',
      suspendu: '⚠️ Cabinet suspendu',
      expire: '❌ Cabinet expiré',
      essai: '🔄 Cabinet remis en essai',
    };

    sendSuccess(res, {
      tenant,
      message: messages[statut],
    });
  } catch (error) {
    next(error);
  }
};
