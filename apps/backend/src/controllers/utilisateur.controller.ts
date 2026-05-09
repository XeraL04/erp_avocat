import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { User } from '../models/user.model';
import { Tenant } from '../models/tenant.model';
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

// ─── NOUVEAU : modifier son propre profil (admin) ─────────────────────────────
const schemaMonProfil = z.object({
  nom: z.string().trim().min(2).optional(),
  email: z.string().email().toLowerCase().optional(),
  motDePasse: z.string().min(6).optional(),
  ancienMotDePasse: z.string().optional(),
});

// ─── NOUVEAU : modifier les infos du cabinet ──────────────────────────────────
const schemaMonCabinet = z.object({
  nom: z.string().trim().min(2).optional(),
  telephone: z.string().optional(),
  adresse: z.string().optional(),
  ville: z.string().optional(),
  numeroFiscal: z.string().optional(),
  rib: z.string().optional(),
  tva: z.number().min(0).max(100).optional(),
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
      { motDePasse: 0 }
    )
      .sort({ createdAt: -1 })
      .lean();

    sendSuccess(res, { utilisateurs }, 200, { total: utilisateurs.length });
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
      role: 'assistant',
      actif: true,
    });

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

    const utilisateur = await User.findOne({ _id: id, tenantId, role: 'assistant' });
    if (!utilisateur) {
      throw new AppError('Utilisateur introuvable', 'UTILISATEUR_INTROUVABLE', 404);
    }

    if (donnees.email && donnees.email !== utilisateur.email) {
      const existant = await User.findOne({ email: donnees.email, _id: { $ne: id } });
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


// ─── PATCH /api/cabinet/utilisateurs/:id/statut ──────────────────────────────
export const changerStatutUtilisateur = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const tenantId = req.utilisateur!.tenantId!;
    const { actif } = schemaStatut.parse(req.body);

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

    const utilisateur = await User.findOne({ _id: id, tenantId, role: 'assistant' });
    if (!utilisateur) {
      throw new AppError('Utilisateur introuvable', 'UTILISATEUR_INTROUVABLE', 404);
    }

    await User.deleteOne({ _id: id });
    sendSuccess(res, { message: 'Utilisateur supprimé avec succès' });
  } catch (err) {
    next(err);
  }
};


// ─── GET /api/cabinet/profil ──────────────────────────────────────────────────
export const obtenirMonProfil = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const utilisateur = await User.findById(req.utilisateur!.id)
      .select('-motDePasse')
      .lean();

    if (!utilisateur) {
      throw new AppError('Utilisateur introuvable', 'UTILISATEUR_INTROUVABLE', 404);
    }

    sendSuccess(res, { utilisateur });
  } catch (err) {
    next(err);
  }
};


// ─── PUT /api/cabinet/profil ──────────────────────────────────────────────────
// Accessible par admin ET assistant — chacun modifie son propre profil
export const modifierMonProfil = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const donnees = schemaMonProfil.parse(req.body);

    const utilisateur = await User.findById(req.utilisateur!.id);
    if (!utilisateur) {
      throw new AppError('Utilisateur introuvable', 'UTILISATEUR_INTROUVABLE', 404);
    }

    // Changement de mot de passe : vérifier l'ancien
    if (donnees.motDePasse) {
      if (!donnees.ancienMotDePasse) {
        throw new AppError(
          'L\'ancien mot de passe est requis pour en définir un nouveau',
          'ANCIEN_MDP_REQUIS',
          400
        );
      }
      const valide = await bcrypt.compare(donnees.ancienMotDePasse, utilisateur.motDePasse);
      if (!valide) {
        throw new AppError(
          'Ancien mot de passe incorrect',
          'MDP_INCORRECT',
          401
        );
      }
      utilisateur.motDePasse = await bcrypt.hash(donnees.motDePasse, 12);
    }

    // Changement d'email : vérifier unicité
    if (donnees.email && donnees.email !== utilisateur.email) {
      const existant = await User.findOne({
        email: donnees.email,
        _id: { $ne: utilisateur._id },
      });
      if (existant) {
        throw new AppError('Un compte avec cet email existe déjà', 'EMAIL_DEJA_UTILISE', 409);
      }
      utilisateur.email = donnees.email;
    }

    if (donnees.nom) utilisateur.nom = donnees.nom;

    await utilisateur.save();

    const { motDePasse: _, ...utilisateurSafe } = utilisateur.toObject();
    sendSuccess(res, { utilisateur: utilisateurSafe });
  } catch (err) {
    next(err);
  }
};


// ─── GET /api/cabinet/mon-cabinet ────────────────────────────────────────────
export const obtenirMonCabinet = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = req.utilisateur!.tenantId!;

    const tenant = await Tenant.findById(tenantId).lean();
    if (!tenant) {
      throw new AppError('Cabinet introuvable', 'CABINET_INTROUVABLE', 404);
    }

    sendSuccess(res, { cabinet: tenant });
  } catch (err) {
    next(err);
  }
};


// ─── PUT /api/cabinet/mon-cabinet ────────────────────────────────────────────
// Réservé à l'admin — l'assistant ne peut pas modifier les infos du cabinet
export const modifierMonCabinet = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = req.utilisateur!.tenantId!;

    // Seul l'admin peut modifier le cabinet
    if (req.utilisateur!.role !== 'admin') {
      throw new AppError(
        'Accès refusé : seul l\'administrateur peut modifier les informations du cabinet',
        'ACCES_REFUSE',
        403
      );
    }

    const donnees = schemaMonCabinet.parse(req.body);

    const cabinet = await Tenant.findByIdAndUpdate(
      tenantId,
      { $set: donnees },
      { new: true, runValidators: true }
    ).lean();

    if (!cabinet) {
      throw new AppError('Cabinet introuvable', 'CABINET_INTROUVABLE', 404);
    }

    sendSuccess(res, { cabinet });
  } catch (err) {
    next(err);
  }
};








// import { Request, Response, NextFunction } from 'express';
// import bcrypt from 'bcryptjs';
// import { z } from 'zod';
// import { User } from '../models/user.model';
// import { AppError } from '../middlewares/error-handler';
// import { sendSuccess } from '../utils/api-response';

// // ─── Schémas Zod ─────────────────────────────────────────────────────────────

// const schemaCreer = z.object({
//   nom: z.string().trim().min(2, 'Minimum 2 caractères'),
//   email: z.string().email('Email invalide').toLowerCase(),
//   motDePasse: z.string().min(6, 'Minimum 6 caractères'),
// });

// const schemaModifier = z.object({
//   nom: z.string().trim().min(2).optional(),
//   email: z.string().email().toLowerCase().optional(),
//   motDePasse: z.string().min(6).optional(),
// });

// const schemaStatut = z.object({
//   actif: z.boolean(),
// });

// // ─── GET /api/cabinet/utilisateurs ───────────────────────────────────────────
// export const listerUtilisateurs = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ): Promise<void> => {
//   try {
//     const tenantId = req.utilisateur!.tenantId!;

//     const utilisateurs = await User.find(
//       { tenantId, role: 'assistant' },
//       { motDePasse: 0 } // ne jamais retourner le hash
//     )
//       .sort({ createdAt: -1 })
//       .lean();

//     sendSuccess(res, { utilisateurs }, 200, {
//       total: utilisateurs.length,
//     });
//   } catch (err) {
//     next(err);
//   }
// };

// // ─── POST /api/cabinet/utilisateurs ──────────────────────────────────────────
// export const creerAssistant = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ): Promise<void> => {
//   try {
//     const tenantId = req.utilisateur!.tenantId!;
//     const donnees = schemaCreer.parse(req.body);

//     // Vérifier unicité email dans tout le système
//     const existant = await User.findOne({ email: donnees.email });
//     if (existant) {
//       throw new AppError('Un compte avec cet email existe déjà', 'EMAIL_DEJA_UTILISE', 409);
//     }

//     const hash = await bcrypt.hash(donnees.motDePasse, 12);

//     const utilisateur = await User.create({
//       tenantId,
//       nom: donnees.nom,
//       email: donnees.email,
//       motDePasse: hash,
//       role: 'assistant', // forcé — seul l'admin peut créer des assistants
//       actif: true,
//     });

//     // Retourner sans le hash
//     const { motDePasse: _, ...utilisateurSafe } = utilisateur.toObject();

//     sendSuccess(res, { utilisateur: utilisateurSafe }, 201);
//   } catch (err) {
//     next(err);
//   }
// };

// // ─── PUT /api/cabinet/utilisateurs/:id ───────────────────────────────────────
// export const modifierUtilisateur = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ): Promise<void> => {
//   try {
//     const { id } = req.params;
//     const tenantId = req.utilisateur!.tenantId!;
//     const donnees = schemaModifier.parse(req.body);

//     const utilisateur = await User.findOne({
//       _id: id,
//       tenantId,
//       role: 'assistant',
//     });
//     if (!utilisateur) {
//       throw new AppError('Utilisateur introuvable', 'UTILISATEUR_INTROUVABLE', 404);
//     }

//     // Vérifier unicité email si changé
//     if (donnees.email && donnees.email !== utilisateur.email) {
//       const existant = await User.findOne({
//         email: donnees.email,
//         _id: { $ne: id },
//       });
//       if (existant) {
//         throw new AppError('Un compte avec cet email existe déjà', 'EMAIL_DEJA_UTILISE', 409);
//       }
//       utilisateur.email = donnees.email;
//     }

//     if (donnees.nom) utilisateur.nom = donnees.nom;

//     if (donnees.motDePasse) {
//       utilisateur.motDePasse = await bcrypt.hash(donnees.motDePasse, 12);
//     }

//     await utilisateur.save();

//     const { motDePasse: _, ...utilisateurSafe } = utilisateur.toObject();
//     sendSuccess(res, { utilisateur: utilisateurSafe });
//   } catch (err) {
//     next(err);
//   }
// };

// // ─── PATCH /api/cabinet/utilisateurs/:id/statut ───────────────────────────────
// export const changerStatutUtilisateur = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ): Promise<void> => {
//   try {
//     const { id } = req.params;
//     const tenantId = req.utilisateur!.tenantId!;
//     const { actif } = schemaStatut.parse(req.body);

//     // Empêcher de se désactiver soi-même
//     if (id === req.utilisateur!.id?.toString()) {
//       throw new AppError(
//         'Vous ne pouvez pas modifier votre propre statut',
//         'ACTION_INTERDITE',
//         403
//       );
//     }

//     const utilisateur = await User.findOneAndUpdate(
//       { _id: id, tenantId, role: 'assistant' },
//       { actif },
//       { new: true, projection: { motDePasse: 0 } }
//     ).lean();

//     if (!utilisateur) {
//       throw new AppError('Utilisateur introuvable', 'UTILISATEUR_INTROUVABLE', 404);
//     }

//     sendSuccess(res, { utilisateur });
//   } catch (err) {
//     next(err);
//   }
// };

// // ─── DELETE /api/cabinet/utilisateurs/:id ────────────────────────────────────
// export const supprimerUtilisateur = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ): Promise<void> => {
//   try {
//     const { id } = req.params;
//     const tenantId = req.utilisateur!.tenantId!;

//     const utilisateur = await User.findOne({
//       _id: id,
//       tenantId,
//       role: 'assistant',
//     });
//     if (!utilisateur) {
//       throw new AppError('Utilisateur introuvable', 'UTILISATEUR_INTROUVABLE', 404);
//     }

//     await User.deleteOne({ _id: id });

//     sendSuccess(res, { message: 'Utilisateur supprimé avec succès' });
//   } catch (err) {
//     next(err);
//   }
// };
