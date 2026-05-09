import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Facture } from '../models/facture.model';
import { Client } from '../models/client.model';
import Dossier from '../models/dossier.model';
import { Honoraire } from '../models/honoraire.model';
import { Paiement } from '../models/paiement.model';
import { Tenant } from '../models/tenant.model';
import { AppError } from '../middlewares/error-handler';
import { sendSuccess } from '../utils/api-response';
import { creerFactureSchema, modifierFactureSchema } from '../validations/facture.validation';
import { genererFacturePDF } from '../services/pdf.service';


// ─── Utilitaire : générer le numéro FACT-YYYY-NNN par cabinet ────────────────
// NOTE : Le hook pre-save du modèle génère déjà le numéro automatiquement.
// Cette fonction est conservée pour les cas où on crée via Facture.create()
// sans passer par .save() (le hook ne se déclenche pas avec .create() dans
// certaines versions Mongoose — on garde les deux pour sécurité).

const genererNumeroFacture = async (tenantId: string): Promise<string> => {
  const annee = new Date().getFullYear();
  const prefixe = `FACT-${annee}-`;

  const derniereFacture = await Facture.findOne({
    tenantId,
    numero: { $regex: `^${prefixe}` },
  })
    .sort({ numero: -1 })
    .lean();

  let prochainNumero = 1;

  if (derniereFacture) {
    const parties = derniereFacture.numero.split('-');
    const dernierNumero = parseInt(parties[2], 10);
    if (!isNaN(dernierNumero)) prochainNumero = dernierNumero + 1;
  }

  return `${prefixe}${String(prochainNumero).padStart(3, '0')}`;
};


// ─── Utilitaire : calcul du total payé pour un honoraire ─────────────────────

const calculerTotauxPaiements = async (
  honoraireId: mongoose.Types.ObjectId | string,
  tenantId: string
): Promise<number> => {
  const resultat = await Paiement.aggregate([
    {
      $match: {
        honoraire: new mongoose.Types.ObjectId(String(honoraireId)),
        tenantId: new mongoose.Types.ObjectId(tenantId),
      },
    },
    { $group: { _id: null, totalPaye: { $sum: '$montant' } } },
  ]);

  return resultat.length > 0 ? resultat[0].totalPaye : 0;
};


// ─── GET /api/cabinet/factures ────────────────────────────────────────────────

export const listerFactures = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = req.utilisateur!.tenantId!;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;
    const q = (req.query.q as string | undefined)?.trim();

    const filtre: Record<string, unknown> = { tenantId };

    if (req.query.statut) {
      filtre.statut = req.query.statut;
    }

    if (req.query.dossierId) {
      filtre.dossier = req.query.dossierId;
    }

    if (q && q !== '' && !req.query.dossierId) {
      const regex = new RegExp(q, 'i');

      const [clientsMatchants, dossiersMatchants] = await Promise.all([
        Client.find({
          tenantId,
          isDeleted: false,
          $or: [{ nom: regex }, { prenom: regex }, { raisonSociale: regex }],
        })
          .select('_id')
          .lean(),
        Dossier.find({
          tenantId,
          isDeleted: false,
          $or: [{ reference: regex }, { titre: regex }],
        })
          .select('_id')
          .lean(),
      ]);

      const clientIds = clientsMatchants.map((c) => c._id);
      const dossierIds = dossiersMatchants.map((d) => d._id);

      filtre.$or = [
        { numero: regex },
        { client: { $in: clientIds } },
        { dossier: { $in: dossierIds } },
      ];
    }

    const [factures, total] = await Promise.all([
      Facture.find(filtre)
        .populate('client', 'nom prenom raisonSociale telephone type')
        .populate('dossier', 'reference titre type')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Facture.countDocuments(filtre),
    ]);

    sendSuccess(res, { factures }, 200, {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  } catch (erreur) {
    next(erreur);
  }
};


// ─── POST /api/cabinet/factures ───────────────────────────────────────────────

export const creerFacture = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = req.utilisateur!.tenantId!;

    const donnees = creerFactureSchema.parse(req.body);

    const client = await Client.findOne({
      _id: donnees.clientId,
      tenantId,
      isDeleted: false,
    });

    if (!client) {
      throw new AppError('Client introuvable', 'CLIENT_INTROUVABLE', 404);
    }

    const dossier = await Dossier.findOne({
      _id: donnees.dossierId,
      tenantId,
      isDeleted: false,
    });

    if (!dossier) {
      throw new AppError('Dossier introuvable', 'DOSSIER_INTROUVABLE', 404);
    }

    const numero = await genererNumeroFacture(tenantId);

    const facture = await Facture.create({
      tenantId,
      numero,
      client: donnees.clientId,
      dossier: donnees.dossierId,
      montant: donnees.montant,
      dateEmission: donnees.dateEmission ? new Date(donnees.dateEmission) : new Date(),
      statut: 'brouillon',
    });

    const facturePopulee = await Facture.findById(facture._id)
      .populate('client', 'nom prenom raisonSociale telephone type')
      .populate('dossier', 'reference titre type')
      .lean();

    sendSuccess(res, { facture: facturePopulee }, 201);
  } catch (erreur) {
    next(erreur);
  }
};


// ─── POST /api/cabinet/paiements/:paiementId/facture ─────────────────────────

export const creerFactureDepuisPaiement = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const paiementId = req.params.paiementId as string;
    const tenantId = req.utilisateur!.tenantId!;

    if (!mongoose.Types.ObjectId.isValid(paiementId)) {
      throw new AppError('Identifiant de paiement invalide', 'ID_INVALIDE', 400);
    }

    const paiement = await Paiement.findOne({ _id: paiementId, tenantId }).lean();

    if (!paiement) {
      throw new AppError('Paiement introuvable', 'PAIEMENT_INTROUVABLE', 404);
    }

    const dossier = await Dossier.findOne({
      _id: paiement.dossier,
      tenantId,
      isDeleted: false,
    }).lean();

    if (!dossier) {
      throw new AppError('Dossier introuvable', 'DOSSIER_INTROUVABLE', 404);
    }

    const factureExistante = await Facture.findOne({
      paiementSource: paiementId,
      tenantId,
    }).lean();

    if (factureExistante) {
      throw new AppError(
        `Une facture existe déjà pour ce paiement (${factureExistante.numero})`,
        'FACTURE_DEJA_GENEREE',
        409
      );
    }

    // FIX : le modèle Dossier stocke 'client' (ObjectId), pas 'clientId'
    const client = await Client.findOne({
      _id: dossier.clientId,
      tenantId,
      isDeleted: false,
    }).lean();

    if (!client) {
      throw new AppError('Client introuvable', 'CLIENT_INTROUVABLE', 404);
    }

    const numero = await genererNumeroFacture(tenantId);

    const facture = await Facture.create({
      tenantId,
      numero,
      client: client._id,
      dossier: dossier._id,
      montant: paiement.montant,
      dateEmission: paiement.date ?? new Date(),
      statut: 'brouillon',
      paiementSource: paiement._id,
    });

    const facturePopulee = await Facture.findById(facture._id)
      .populate('client', 'nom prenom raisonSociale telephone type')
      .populate('dossier', 'reference titre type')
      .lean();

    sendSuccess(res, { facture: facturePopulee }, 201);
  } catch (erreur) {
    next(erreur);
  }
};


// ─── GET /api/cabinet/factures/:id ───────────────────────────────────────────

export const obtenirFacture = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const tenantId = req.utilisateur!.tenantId!;

    const facture = await Facture.findOne({ _id: id, tenantId })
      .populate('client', 'nom prenom raisonSociale telephone adresse type')
      .populate('dossier', 'reference titre type statut')
      .lean();

    if (!facture) {
      throw new AppError('Facture introuvable', 'FACTURE_INTROUVABLE', 404);
    }

    sendSuccess(res, { facture });
  } catch (erreur) {
    next(erreur);
  }
};


// ─── PUT /api/cabinet/factures/:id ───────────────────────────────────────────

export const modifierFacture = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const tenantId = req.utilisateur!.tenantId!;

    const donnees = modifierFactureSchema.parse(req.body);

    const facture = await Facture.findOne({ _id: id, tenantId });

    if (!facture) {
      throw new AppError('Facture introuvable', 'FACTURE_INTROUVABLE', 404);
    }

    if (facture.statut !== 'brouillon' && donnees.montant !== undefined) {
      throw new AppError(
        "Impossible de modifier le montant d'une facture déjà émise ou payée",
        'FACTURE_NON_MODIFIABLE',
        409
      );
    }

    if (donnees.montant !== undefined) facture.montant = donnees.montant;
    if (donnees.statut !== undefined) facture.statut = donnees.statut;

    await facture.save();

    sendSuccess(res, { facture });
  } catch (erreur) {
    next(erreur);
  }
};


// ─── DELETE /api/cabinet/factures/:id ────────────────────────────────────────

export const supprimerFacture = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const tenantId = req.utilisateur!.tenantId!;

    const facture = await Facture.findOne({ _id: id, tenantId });

    if (!facture) {
      throw new AppError('Facture introuvable', 'FACTURE_INTROUVABLE', 404);
    }

    if (facture.statut !== 'brouillon') {
      throw new AppError(
        'Seules les factures en statut "brouillon" peuvent être supprimées',
        'FACTURE_NON_SUPPRIMABLE',
        409
      );
    }

    await Facture.deleteOne({ _id: id });

    sendSuccess(res, { message: 'Facture supprimée avec succès' });
  } catch (erreur) {
    next(erreur);
  }
};


// ─── GET /api/cabinet/factures/:id/pdf ───────────────────────────────────────

export const telechargerFacturePDF = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const tenantId = req.utilisateur!.tenantId!;

    // Récupération brute sans populate (évite les pertes de champs avec .lean())
    const factureRaw = await Facture.findOne({ _id: id, tenantId }).lean();

    if (!factureRaw) {
      throw new AppError('Facture introuvable', 'FACTURE_INTROUVABLE', 404);
    }

    // Requêtes parallèles : client, dossier, tenant
    const [clientDoc, dossierDoc, tenant] = await Promise.all([
      Client.findById(factureRaw.client)
        .select('nom prenom raisonSociale telephone adresse type')
        .lean<{
          _id: mongoose.Types.ObjectId;
          nom?: string;
          prenom?: string;
          raisonSociale?: string;
          telephone: string;
          adresse?: string;
          type: 'physique' | 'morale';
        }>(),
      Dossier.findById(factureRaw.dossier)
        .select('reference titre type')
        .lean<{ _id: mongoose.Types.ObjectId; reference: string; titre: string; type: string }>(),
      Tenant.findById(tenantId).lean(),
    ]);

    if (!clientDoc) {
      throw new AppError('Client introuvable', 'CLIENT_INTROUVABLE', 404);
    }
    if (!dossierDoc) {
      throw new AppError('Dossier introuvable', 'DOSSIER_INTROUVABLE', 404);
    }
    if (!tenant) {
      throw new AppError('Cabinet introuvable', 'CABINET_INTROUVABLE', 404);
    }

    // Honoraire lié au dossier
    const honoraire = await Honoraire.findOne({
      dossier: factureRaw.dossier,
      tenantId,
    }).lean();

    // ── Calculs financiers ──────────────────────────────────────────────────
    let totalPaye = 0;
    let statutPaiement: 'non_paye' | 'partiel' | 'paye' = 'non_paye';

    if (honoraire) {
      totalPaye = await calculerTotauxPaiements(String(honoraire._id), tenantId);
    }

    const montantReel = honoraire?.montantTotal ?? factureRaw.montant;
    const resteAPayer = Math.max(0, montantReel - totalPaye);

    if (totalPaye === 0) {
      statutPaiement = 'non_paye';
    } else if (resteAPayer <= 0) {
      statutPaiement = 'paye';
    } else {
      statutPaiement = 'partiel';
    }

    // ── Nom du client ───────────────────────────────────────────────────────
    const nomClient =
      clientDoc.type === 'morale'
        ? (clientDoc.raisonSociale ?? 'Client')
        : `${clientDoc.nom ?? ''} ${clientDoc.prenom ?? ''}`.trim() || 'Client';

    // ── Construction des données PDF ────────────────────────────────────────
    const donneesPDF = {
      // Infos cabinet — plus de (tenant as any) grâce au modèle typé
      nomCabinet: tenant.nom,
      titreCabinet: 'Avocat',
      adresseCabinet: tenant.adresse ?? 'Algérie',
      villeCabinet: tenant.ville ?? '',
      telephoneCabinet: tenant.telephone ?? '',
      faxCabinet: undefined as string | undefined,   // ajoute fax dans ITenant si besoin
      emailCabinet: tenant.email,
      numeroFiscal: tenant.numeroFiscal,
      rib: tenant.rib,
      tauxTva: tenant.tva ?? 0,

      // Infos facture
      numeroFacture: factureRaw.numero,
      dateEmission: factureRaw.dateEmission,

      // Infos client
      nomClient,
      telephoneClient: clientDoc.telephone,
      adresseClient: clientDoc.adresse,

      // Infos dossier
      referenceDossier: dossierDoc.reference,
      typeDossier: dossierDoc.type ?? '',

      // Lignes — titre garanti car requête directe sur Dossier
      lignes: [
        {
          description: `Honoraires - ${dossierDoc.titre ?? 'Prestation juridique'}`,
          montant: factureRaw.montant,
        },
      ],

      // Totaux
      montantTotal: montantReel,
      totalPaye,
      resteAPayer,
      statutPaiement,
    };

    const pdfBuffer = await genererFacturePDF(donneesPDF);

    const nomFichier = `${factureRaw.numero}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${nomFichier}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.end(pdfBuffer);
  } catch (erreur) {
    next(erreur);
  }
};







// import { Request, Response, NextFunction } from 'express';
// import mongoose from 'mongoose';
// import { Facture } from '../models/facture.model';
// import { Client } from '../models/client.model';
// import Dossier from '../models/dossier.model';
// import { Honoraire } from '../models/honoraire.model';
// import { Paiement } from '../models/paiement.model';
// import { Tenant } from '../models/tenant.model';
// import { AppError } from '../middlewares/error-handler';
// import { sendSuccess } from '../utils/api-response';
// import { creerFactureSchema, modifierFactureSchema } from '../validations/facture.validation';
// import { genererFacturePDF } from '../services/pdf.service';

// // ─── Utilitaire : générer le numéro FACT-YYYY-NNN par cabinet ────────────────

// /**
//  * Génère le prochain numéro de facture unique PAR cabinet.
//  * Format : FACT-2026-001, FACT-2026-002, ...
//  * Utilise une agrégation pour trouver le dernier numéro de l'année.
//  */
// const genererNumeroFacture = async (tenantId: string): Promise<string> => {
//   const annee = new Date().getFullYear();
//   const prefixe = `FACT-${annee}-`;

//   // Recherche de la dernière facture de l'année pour ce cabinet
//   const derniereFacture = await Facture.findOne({
//     tenantId,
//     numero: { $regex: `^${prefixe}` },
//   })
//     .sort({ numero: -1 })
//     .lean();

//   let prochainNumero = 1;

//   if (derniereFacture) {
//     // Extraction du numéro séquentiel depuis le format FACT-YYYY-NNN
//     const parties = derniereFacture.numero.split('-');
//     const dernierNumero = parseInt(parties[2], 10);
//     prochainNumero = dernierNumero + 1;
//   }

//   // Formatage avec padding à 3 chiffres : 1 → 001
//   return `${prefixe}${String(prochainNumero).padStart(3, '0')}`;
// };

// // ─── Utilitaire : calcul des totaux paiements ─────────────────────────────────

// const calculerTotauxPaiements = async (
//   honoraireId: mongoose.Types.ObjectId | string,
//   tenantId: string
// ) => {
//   const resultat = await Paiement.aggregate([
//     {
//       $match: {
//         honoraire: new mongoose.Types.ObjectId(String(honoraireId)),
//         tenantId: new mongoose.Types.ObjectId(tenantId),
//       },
//     },
//     { $group: { _id: null, totalPaye: { $sum: '$montant' } } },
//   ]);

//   return resultat.length > 0 ? resultat[0].totalPaye : 0;
// };

// // ─── GET /api/cabinet/factures ────────────────────────────────────────────────

// export const listerFactures = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ): Promise<void> => {
//   try {
//     const tenantId = req.utilisateur!.tenantId!;
//     const page = parseInt(req.query.page as string) || 1;
//     const limit = parseInt(req.query.limit as string) || 20;
//     const skip = (page - 1) * limit;
//     const q = (req.query.q as string | undefined)?.trim();

//     // ─── Filtre de base ──────────────────────────────────────────────────────
//     const filtre: Record<string, unknown> = { tenantId };

//     if (req.query.statut) {
//       filtre.statut = req.query.statut;
//     }

//     // ← AJOUT : filtre par dossier (utilisé par TabFactures dans DossierDetailPage)
//     if (req.query.dossierId) {
//       filtre.dossier = req.query.dossierId; // champ MongoDB = "dossier", pas "dossierId"
//     }

//     // ─── Filtre recherche textuelle (q) ──────────────────────────────────────
//     // Si dossierId est présent, la recherche textuelle est ignorée —
//     // dans le contexte d'un dossier, on filtre déjà par dossier.
//     if (q && q !== '' && !req.query.dossierId) {
//       const regex = new RegExp(q, 'i');

//       const [clientsMatchants, dossiersMatchants] = await Promise.all([
//         Client.find({
//           tenantId,
//           isDeleted: false,
//           $or: [{ nom: regex }, { prenom: regex }, { raisonSociale: regex }],
//         })
//           .select('_id')
//           .lean(),
//         Dossier.find({
//           tenantId,
//           isDeleted: false,
//           $or: [{ reference: regex }, { titre: regex }],
//         })
//           .select('_id')
//           .lean(),
//       ]);

//       const clientIds = clientsMatchants.map((c) => c._id);
//       const dossierIds = dossiersMatchants.map((d) => d._id);

//       filtre.$or = [
//         { numero: regex },
//         { client: { $in: clientIds } },
//         { dossier: { $in: dossierIds } },
//       ];
//     }

//     // ─── Requête principale ──────────────────────────────────────────────────
//     const [factures, total] = await Promise.all([
//       Facture.find(filtre)
//         .populate('client', 'nom prenom raisonSociale telephone type')
//         .populate('dossier', 'reference titre type')
//         .sort({ createdAt: -1 })
//         .skip(skip)
//         .limit(limit)
//         .lean(),
//       Facture.countDocuments(filtre),
//     ]);

//     sendSuccess(res, { factures }, 200, {
//       page,
//       limit,
//       total,
//       totalPages: Math.ceil(total / limit),
//     });
//   } catch (erreur) {
//     next(erreur);
//   }
// };

// // ─── POST /api/cabinet/factures ───────────────────────────────────────────────

// /**
//  * Crée une facture (statut "brouillon" par défaut).
//  * Génère automatiquement le numéro FACT-YYYY-NNN.
//  */
// export const creerFacture = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ): Promise<void> => {
//   try {
//     const tenantId = req.utilisateur!.tenantId!;

//     // Validation Zod
//     const donnees = creerFactureSchema.parse(req.body);

//     // Vérification que le client existe et appartient au cabinet
//     const client = await Client.findOne({
//       _id: donnees.clientId,
//       tenantId,
//       isDeleted: false,
//     });

//     if (!client) {
//       throw new AppError('Client introuvable', 'CLIENT_INTROUVABLE', 404);
//     }

//     // Vérification que le dossier existe et appartient au cabinet
//     const dossier = await Dossier.findOne({
//       _id: donnees.dossierId,
//       tenantId,
//       isDeleted: false,
//     });

//     if (!dossier) {
//       throw new AppError('Dossier introuvable', 'DOSSIER_INTROUVABLE', 404);
//     }

//     // Génération du numéro unique par cabinet
//     const numero = await genererNumeroFacture(tenantId);

//     // Création de la facture en statut brouillon
//     const facture = await Facture.create({
//       tenantId,
//       numero,
//       client: donnees.clientId,
//       dossier: donnees.dossierId,
//       montant: donnees.montant,
//       dateEmission: donnees.dateEmission ? new Date(donnees.dateEmission) : new Date(),
//       statut: 'brouillon',
//     });

//     const facturePopulee = await Facture.findById(facture._id)
//       .populate('client', 'nom prenom raisonSociale telephone type')
//       .populate('dossier', 'reference titre type')
//       .lean();

//     sendSuccess(res, { facture: facturePopulee }, 201);
//   } catch (erreur) {
//     next(erreur);
//   }
// };

// // ─── GET /api/cabinet/factures/:id ───────────────────────────────────────────

// /**
//  * Récupère le détail d'une facture.
//  */
// export const obtenirFacture = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ): Promise<void> => {
//   try {
//     const { id } = req.params;
//     const tenantId = req.utilisateur!.tenantId!;

//     const facture = await Facture.findOne({ _id: id, tenantId })
//       .populate('client', 'nom prenom raisonSociale telephone adresse type')
//       .populate('dossier', 'reference titre type statut')
//       .lean();

//     if (!facture) {
//       throw new AppError('Facture introuvable', 'FACTURE_INTROUVABLE', 404);
//     }

//     sendSuccess(res, { facture });
//   } catch (erreur) {
//     next(erreur);
//   }
// };

// // ─── PUT /api/cabinet/factures/:id ───────────────────────────────────────────

// /**
//  * Modifie une facture.
//  * Règle : une facture "emise" ou "payee" ne peut plus être modifiée.
//  */
// export const modifierFacture = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ): Promise<void> => {
//   try {
//     const { id } = req.params;
//     const tenantId = req.utilisateur!.tenantId!;

//     const donnees = modifierFactureSchema.parse(req.body);

//     const facture = await Facture.findOne({ _id: id, tenantId });

//     if (!facture) {
//       throw new AppError('Facture introuvable', 'FACTURE_INTROUVABLE', 404);
//     }

//     // Blocage de la modification si facture déjà émise ou payée
//     if (facture.statut !== 'brouillon' && donnees.montant !== undefined) {
//       throw new AppError(
//         "Impossible de modifier le montant d'une facture déjà émise ou payée",
//         'FACTURE_NON_MODIFIABLE',
//         409
//       );
//     }

//     if (donnees.montant !== undefined) facture.montant = donnees.montant;
//     if (donnees.statut !== undefined) facture.statut = donnees.statut;

//     await facture.save();

//     sendSuccess(res, { facture });
//   } catch (erreur) {
//     next(erreur);
//   }
// };

// // ─── DELETE /api/cabinet/factures/:id ────────────────────────────────────────

// /**
//  * Supprime une facture uniquement si elle est en statut "brouillon".
//  */
// export const supprimerFacture = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ): Promise<void> => {
//   try {
//     const { id } = req.params;
//     const tenantId = req.utilisateur!.tenantId!;

//     const facture = await Facture.findOne({ _id: id, tenantId });

//     if (!facture) {
//       throw new AppError('Facture introuvable', 'FACTURE_INTROUVABLE', 404);
//     }

//     // Seules les factures brouillon peuvent être supprimées
//     if (facture.statut !== 'brouillon') {
//       throw new AppError(
//         'Seules les factures en statut "brouillon" peuvent être supprimées',
//         'FACTURE_NON_SUPPRIMABLE',
//         409
//       );
//     }

//     await Facture.deleteOne({ _id: id });

//     sendSuccess(res, { message: 'Facture supprimée avec succès' });
//   } catch (erreur) {
//     next(erreur);
//   }
// };

// // ─── GET /api/cabinet/factures/:id/pdf ───────────────────────────────────────

// /**
//  * Génère et télécharge le PDF d'une facture.
//  * Récupère toutes les données nécessaires depuis MongoDB,
//  * calcule les totaux côté backend, et appelle le service pdf-lib.
//  */
// export const telechargerFacturePDF = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ): Promise<void> => {
//   try {
//     const { id } = req.params;
//     const tenantId = req.utilisateur!.tenantId!;

//     // Récupération de la facture avec toutes ses relations
//     const facture = await Facture.findOne({ _id: id, tenantId })
//       .populate<{
//         client: {
//           nom?: string;
//           prenom?: string;
//           raisonSociale?: string;
//           telephone: string;
//           adresse?: string;
//           type: 'physique' | 'morale';
//         };
//         dossier: {
//           reference: string;
//           titre: string;
//           type: string;
//         };
//       }>('client dossier')
//       .lean();

//     if (!facture) {
//       throw new AppError('Facture introuvable', 'FACTURE_INTROUVABLE', 404);
//     }

//     // Récupération des infos du cabinet (tenant)
//     const tenant = await Tenant.findById(tenantId).lean();
//     if (!tenant) {
//       throw new AppError('Cabinet introuvable', 'CABINET_INTROUVABLE', 404);
//     }

//     // Récupération de l'honoraire lié au dossier
//     const honoraire = await Honoraire.findOne({
//       dossier: facture.dossier,
//       tenantId,
//     }).lean();

//     // Calcul du total payé côté backend
//     let totalPaye = 0;
//     let statutPaiement: 'non_paye' | 'partiel' | 'paye' = 'non_paye';

//     if (honoraire) {
//       totalPaye = await calculerTotauxPaiements(String(honoraire._id), tenantId);
//       const resteAPayer = honoraire.montantTotal - totalPaye;
//       if (totalPaye === 0) statutPaiement = 'non_paye';
//       else if (resteAPayer <= 0) statutPaiement = 'paye';
//       else statutPaiement = 'partiel';
//     }

//     // Construction du nom client selon le type
//     const nomClient =
//       facture.client.type === 'morale'
//         ? (facture.client.raisonSociale ?? 'Client')
//         : `${facture.client.nom ?? ''} ${facture.client.prenom ?? ''}`.trim();

//     // Construction des données pour le service PDF
//     const donneesPDF = {
//       nomCabinet: tenant.nom,
//       adresseCabinet: tenant.adresse ?? 'Algérie',
//       telephoneCabinet: tenant.telephone ?? '',
//       emailCabinet: tenant.email,

//       numeroFacture: facture.numero,
//       dateEmission: facture.dateEmission,

//       nomClient,
//       telephoneClient: facture.client.telephone,
//       adresseClient: facture.client.adresse,

//       referenceDossier: facture.dossier.reference,
//       typeDossier: facture.dossier.type,

//       // Ligne unique : description = titre du dossier
//       lignes: [
//         {
//           description: `Honoraires — ${facture.dossier.titre}`,
//           montant: facture.montant,
//         },
//       ],

//       montantTotal: facture.montant,
//       totalPaye,
//       resteAPayer: Math.max(0, facture.montant - totalPaye),
//       statutPaiement,
//     };

//     // Génération du PDF via le service pdf-lib
//     const pdfBuffer = await genererFacturePDF(donneesPDF);

//     // Envoi du fichier en réponse HTTP
//     const nomFichier = `${facture.numero}.pdf`;
//     res.setHeader('Content-Type', 'application/pdf');
//     res.setHeader('Content-Disposition', `attachment; filename="${nomFichier}"`);
//     res.setHeader('Content-Length', pdfBuffer.length);
//     res.end(pdfBuffer);
//   } catch (erreur) {
//     next(erreur);
//   }
// };
