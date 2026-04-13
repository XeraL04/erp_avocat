import { IRouter, Router } from 'express';
import { proteger, restreindreA } from '../middlewares/auth.middleware';
import { injecterTenant } from '../middlewares/tenant.middleware';
import { upload } from '../middlewares/upload.middleware';
import {
  listerDocuments,
  uploadDocument,
  obtenirDocument,
  supprimerDocument,
} from '../controllers/document.controller';

const router: IRouter = Router();

router.use(proteger);
router.use(injecterTenant);

// Liste des documents (avec filtres ?type=&dossierId=)
router.get('/', restreindreA('admin', 'assistant'), listerDocuments);

// Upload — Multer traite le fichier AVANT le contrôleur
// Le champ du formulaire doit s'appeler "fichier"
router.post(
  '/upload',
  restreindreA('admin', 'assistant'),
  upload.single('fichier'),
  uploadDocument
);

router
  .route('/:id')
  .get(restreindreA('admin', 'assistant'), obtenirDocument)
  .delete(restreindreA('admin'), supprimerDocument);

export default router;
