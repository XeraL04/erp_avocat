import { Request, Response, NextFunction } from 'express';
import Dossier from '../models/dossier.model';
import InstitutionPersonnalisee from '../models/institutionPersonnalisee.model'; // ← NOUVEAU
import { AppError } from '../middlewares/error-handler';
import { sendSuccess } from '../utils/api-response';
import {
  creerDossierSchema,
  modifierDossierSchema,
  ajouterReportSchema,
} from '../validations/dossier.validation';


// ─── Helper — sauvegarder l'institution personnalisée ─────────────────────────

const sauvegarderInstitution = async (
  tenantId: string,
  nom: string | undefined
): Promise<void> => {
  if (!nom?.trim()) return;
  await InstitutionPersonnalisee.findOneAndUpdate(
    { tenantId, nom: nom.trim() },
    { tenantId, nom: nom.trim() },
    { upsert: true }
  ).catch(() => {}); // silencieux — pas critique
};


// ─── Génération référence DOS-YYYY-NNN ────────────────────────────────────────

const genererReference = async (tenantId: string): Promise<string> => {
  const annee   = new Date().getFullYear();
  const prefixe = `DOS-${annee}-`;

  const dernierDossier = await Dossier.findOne(
    { tenantId, reference: { $regex: prefixe } },
    {},
    { sort: { reference: -1 } }
  ).lean();

  let prochain = 1;
  if (dernierDossier) {
    const parties = dernierDossier.reference.split('-');
    prochain = parseInt(parties[2], 10) + 1;
  }

  return `${prefixe}${String(prochain).padStart(3, '0')}`;
};


// ─── GET /api/cabinet/dossiers ────────────────────────────────────────────────

export const listerDossiers = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = req.utilisateur!.tenantId!;
    const page     = parseInt(req.query.page  as string) || 1;
    const limit    = parseInt(req.query.limit as string) || 20;
    const skip     = (page - 1) * limit;

    const filtre: Record<string, unknown> = { tenantId, isDeleted: false };

    if (req.query.statut)      filtre.statut     = req.query.statut;
    if (req.query.typeAffaire) filtre.typeAffaire = req.query.typeAffaire;
    if (req.query.specialite)  filtre.specialite  = req.query.specialite;
    if (req.query.institution) filtre.institution = req.query.institution;
    if (req.query.clientId)    filtre.clientId    = req.query.clientId;

    if (req.query.q) {
      const regex = new RegExp(req.query.q as string, 'i');
      filtre.$or = [
        { reference:      regex },
        { adversaire:     regex },
        { dossierNumero:  regex },
        { nomInstitution: regex }, // ← inclus dans la recherche texte
      ];
    }

    const [dossiers, total] = await Promise.all([
      Dossier.find(filtre)
        .populate('clientId', 'nom prenom raisonSociale telephone type')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Dossier.countDocuments(filtre),
    ]);

    sendSuccess(res, dossiers, 200, {
      page, limit, total,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) { next(err); }
};


// ─── POST /api/cabinet/dossiers ───────────────────────────────────────────────

export const creerDossier = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId  = req.utilisateur!.tenantId!;
    const donnees   = creerDossierSchema.parse(req.body);
    const reference = await genererReference(tenantId);

    const dossier = await Dossier.create({
      tenantId,
      reference,
      clientId:          donnees.clientId,
      qualiteClient:     donnees.qualiteClient,
      adversaire:        donnees.adversaire,
      qualiteAdversaire: donnees.qualiteAdversaire,
      dossierNumero:     donnees.dossierNumero,
      institution:       donnees.institution,
      nomInstitution:    donnees.nomInstitution?.trim() || undefined, // ← NOUVEAU
      typeAffaire:       donnees.typeAffaire,
      specialite:        donnees.specialite,
      dateOuverture:     donnees.dateOuverture ? new Date(donnees.dateOuverture) : new Date(),
      description:       donnees.description,
      reports:           donnees.reports ?? [],
    });

    // Sauvegarder l'institution pour les suggestions futures
    await sauvegarderInstitution(tenantId, donnees.nomInstitution); // ← NOUVEAU

    const dossierPopule = await Dossier.findById(dossier.id)
      .populate('clientId', 'nom prenom raisonSociale telephone type')
      .lean();

    sendSuccess(res, dossierPopule, 201);
  } catch (err) { next(err); }
};


// ─── GET /api/cabinet/dossiers/:id ───────────────────────────────────────────

export const obtenirDossier = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id }   = req.params;
    const tenantId = req.utilisateur!.tenantId!;

    const dossier = await Dossier.findOne({ _id: id, tenantId, isDeleted: false })
      .populate('clientId', 'nom prenom raisonSociale telephone email adresse type')
      .lean();

    if (!dossier) throw new AppError('Dossier introuvable', 'DOSSIER_INTROUVABLE', 404);
    sendSuccess(res, dossier);
  } catch (err) { next(err); }
};


// ─── PUT /api/cabinet/dossiers/:id ───────────────────────────────────────────

export const modifierDossier = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id }   = req.params;
    const tenantId = req.utilisateur!.tenantId!;
    const donnees  = modifierDossierSchema.parse(req.body);

    const dossier = await Dossier.findOne({ _id: id, tenantId, isDeleted: false });
    if (!dossier) throw new AppError('Dossier introuvable', 'DOSSIER_INTROUVABLE', 404);

    if (donnees.qualiteClient     !== undefined) dossier.qualiteClient     = donnees.qualiteClient;
    if (donnees.adversaire        !== undefined) dossier.adversaire        = donnees.adversaire;
    if (donnees.qualiteAdversaire !== undefined) dossier.qualiteAdversaire = donnees.qualiteAdversaire;
    if (donnees.dossierNumero     !== undefined) dossier.dossierNumero     = donnees.dossierNumero;
    if (donnees.institution       !== undefined) dossier.institution       = donnees.institution;
    if (donnees.typeAffaire       !== undefined) dossier.typeAffaire       = donnees.typeAffaire;
    if (donnees.specialite        !== undefined) dossier.specialite        = donnees.specialite;
    if (donnees.description       !== undefined) dossier.description       = donnees.description ?? undefined;
    if (donnees.dateOuverture     !== undefined) dossier.dateOuverture     = new Date(donnees.dateOuverture);
    if (donnees.dateCloture       !== undefined) dossier.dateCloture       = donnees.dateCloture ? new Date(donnees.dateCloture) : undefined;

    // ← NOUVEAU — nomInstitution
    if (donnees.nomInstitution !== undefined) {
      dossier.nomInstitution = donnees.nomInstitution?.trim() || undefined;
    }

    if (donnees.reports !== undefined) {
      dossier.reports = donnees.reports.map((r) => ({
        date:     new Date(r.date),
        raison:   r.raison,
        jugement: r.jugement,
      })) as unknown as typeof dossier.reports;
    }

    await dossier.save();

    // Sauvegarder l'institution pour les suggestions futures
    await sauvegarderInstitution(tenantId, donnees.nomInstitution ?? undefined); // ← NOUVEAU

    const dossierPopule = await Dossier.findById(dossier.id)
      .populate('clientId', 'nom prenom raisonSociale telephone type')
      .lean();

    sendSuccess(res, dossierPopule);
  } catch (err) { next(err); }
};


// ─── DELETE /api/cabinet/dossiers/:id (soft delete) ──────────────────────────

export const supprimerDossier = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id }   = req.params;
    const tenantId = req.utilisateur!.tenantId!;

    const dossier = await Dossier.findOne({ _id: id, tenantId });
    if (!dossier) throw new AppError('Dossier introuvable', 'DOSSIER_INTROUVABLE', 404);

    dossier.isDeleted = true;
    await dossier.save();
    sendSuccess(res, { message: 'Dossier archivé avec succès' });
  } catch (err) { next(err); }
};


// ─── PATCH /api/cabinet/dossiers/:id/statut ───────────────────────────────────

export const changerStatutDossier = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id }   = req.params;
    const tenantId = req.utilisateur!.tenantId!;
    const { statut, dateCloture } = req.body as { statut: string; dateCloture?: string };

    const dossier = await Dossier.findOne({ _id: id, tenantId, isDeleted: false });
    if (!dossier) throw new AppError('Dossier introuvable', 'DOSSIER_INTROUVABLE', 404);

    dossier.statut = statut as typeof dossier.statut;
    if (statut === 'cloture' && dateCloture) dossier.dateCloture = new Date(dateCloture);
    await dossier.save();
    sendSuccess(res, dossier);
  } catch (err) { next(err); }
};


// ─── POST /api/cabinet/dossiers/:id/reports ───────────────────────────────────

export const ajouterReport = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id }   = req.params;
    const tenantId = req.utilisateur!.tenantId!;
    const donnees  = ajouterReportSchema.parse(req.body);

    const dossier = await Dossier.findOne({ _id: id, tenantId, isDeleted: false });
    if (!dossier) throw new AppError('Dossier introuvable', 'DOSSIER_INTROUVABLE', 404);

    dossier.reports.push({
      date:     new Date(donnees.date),
      raison:   donnees.raison,
      jugement: donnees.jugement,
    } as typeof dossier.reports[0]);

    await dossier.save();
    sendSuccess(res, dossier.reports, 201);
  } catch (err) { next(err); }
};


// ─── PUT /api/cabinet/dossiers/:id/reports/:reportId ─────────────────────────

export const modifierReport = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id, reportId } = req.params;
    const tenantId         = req.utilisateur!.tenantId!;
    const donnees          = ajouterReportSchema.parse(req.body);

    const dossier = await Dossier.findOne({ _id: id, tenantId, isDeleted: false });
    if (!dossier) throw new AppError('Dossier introuvable', 'DOSSIER_INTROUVABLE', 404);

    const report = dossier.reports.find((r) => r._id?.toString() === reportId);
    if (!report) throw new AppError('Report introuvable', 'REPORT_INTROUVABLE', 404);

    report.date     = new Date(donnees.date);
    report.raison   = donnees.raison;
    report.jugement = donnees.jugement;

    await dossier.save();

    const dossierPopule = await Dossier.findById(dossier.id)
      .populate('clientId', 'nom prenom raisonSociale telephone type')
      .lean();

    sendSuccess(res, dossierPopule);
  } catch (err) { next(err); }
};


// ─── DELETE /api/cabinet/dossiers/:id/reports/:reportId ──────────────────────

export const supprimerReport = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id, reportId } = req.params;
    const tenantId         = req.utilisateur!.tenantId!;

    const dossier = await Dossier.findOne({ _id: id, tenantId, isDeleted: false });
    if (!dossier) throw new AppError('Dossier introuvable', 'DOSSIER_INTROUVABLE', 404);

    const avant = dossier.reports.length;
    dossier.reports = dossier.reports.filter(
      (r) => r._id?.toString() !== reportId
    ) as typeof dossier.reports;

    if (dossier.reports.length === avant)
      throw new AppError('Report introuvable', 'REPORT_INTROUVABLE', 404);

    await dossier.save();
    sendSuccess(res, { message: 'Report supprimé avec succès' });
  } catch (err) { next(err); }
};