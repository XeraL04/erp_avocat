import multer, { FileFilterCallback, StorageEngine } from 'multer';
import { Request } from 'express';
import path from 'path';
import fs from 'fs';
import { AppError } from './error-handler';

// ─── Dossier de stockage local ────────────────────────────────────────────────

// Les fichiers sont stockés dans apps/backend/uploads/{tenantId}/
const DOSSIER_UPLOADS = path.join(process.cwd(), 'uploads');

// Création du dossier uploads s'il n'existe pas
if (!fs.existsSync(DOSSIER_UPLOADS)) {
  fs.mkdirSync(DOSSIER_UPLOADS, { recursive: true });
}

// ─── Extensions autorisées ────────────────────────────────────────────────────

const EXTENSIONS_AUTORISEES = [
  '.pdf',
  '.doc',
  '.docx',
  '.jpg',
  '.jpeg',
  '.png',
  '.xls',
  '.xlsx',
  '.txt',
];

// Taille maximale : 10 Mo
const TAILLE_MAX = 10 * 1024 * 1024;

// ─── Stockage sur disque ──────────────────────────────────────────────────────

const stockage: StorageEngine = multer.diskStorage({
  destination: (req: Request, _fichier, callback) => {
    // Sous-dossier par cabinet pour isoler les fichiers multi-tenant
    const tenantId = req.utilisateur?.tenantId ?? 'temp';
    const dossierTenant = path.join(DOSSIER_UPLOADS, tenantId);

    // Création du dossier tenant si inexistant
    if (!fs.existsSync(dossierTenant)) {
      fs.mkdirSync(dossierTenant, { recursive: true });
    }

    callback(null, dossierTenant);
  },

  filename: (_req, fichier, callback) => {
    // Nom unique : timestamp + random + extension originale
    // Évite les collisions et les noms avec caractères spéciaux
    const extension = path.extname(fichier.originalname).toLowerCase();
    const nomUnique = `${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`;
    callback(null, nomUnique);
  },
});

// ─── Filtre de validation des fichiers ────────────────────────────────────────

const filtrerFichier = (
  _req: Request,
  fichier: Express.Multer.File,
  callback: FileFilterCallback
): void => {
  const extension = path.extname(fichier.originalname).toLowerCase();

  if (EXTENSIONS_AUTORISEES.includes(extension)) {
    callback(null, true);
  } else {
    callback(
      new AppError(
        `Extension non autorisée : ${extension}. Extensions acceptées : ${EXTENSIONS_AUTORISEES.join(', ')}`,
        'EXTENSION_NON_AUTORISEE',
        400
      )
    );
  }
};

// ─── Instance Multer exportée ─────────────────────────────────────────────────

export const upload = multer({
  storage: stockage,
  fileFilter: filtrerFichier,
  limits: {
    fileSize: TAILLE_MAX,
  },
});
