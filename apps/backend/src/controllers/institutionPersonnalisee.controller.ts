import { Request, Response, NextFunction } from 'express';
import InstitutionPersonnalisee from '../models/institutionPersonnalisee.model';
import { sendSuccess } from '../utils/api-response';

// GET /api/cabinet/institutions-personnalisees?q=...
export const listerInstitutions = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = req.utilisateur!.tenantId!;
    const q = req.query.q as string | undefined;

    const filtre: Record<string, unknown> = { tenantId };
    if (q) filtre.nom = { $regex: q, $options: 'i' };

    const institutions = await InstitutionPersonnalisee
      .find(filtre)
      .sort({ nom: 1 })
      .limit(20)
      .lean();

    sendSuccess(res, institutions.map((i) => i.nom));
  } catch (err) { next(err); }
};

// POST /api/cabinet/institutions-personnalisees
export const enregistrerInstitution = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = req.utilisateur!.tenantId!;
    const { nom } = req.body as { nom: string };

    if (!nom?.trim()) {
      res.status(400).json({ message: 'Le nom est requis' });
      return;
    }

    // upsert — pas d'erreur si déjà existant
    await InstitutionPersonnalisee.findOneAndUpdate(
      { tenantId, nom: nom.trim() },
      { tenantId, nom: nom.trim() },
      { upsert: true, new: true }
    );

    sendSuccess(res, { nom: nom.trim() }, 201);
  } catch (err) { next(err); }
};