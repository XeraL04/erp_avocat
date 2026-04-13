import { IRouter, Router } from 'express';
import { proteger, restreindreA } from '../middlewares/auth.middleware';
import { injecterTenant } from '../middlewares/tenant.middleware';
import { modifierEtape, supprimerEtape, listerToutesEtapes } from '../controllers/etape.controller';

// Note : creerEtape et listerEtapesDossier sont montés dans dossier.routes.ts
// Ce router gère uniquement les opérations sur une étape existante via son ID
const router: IRouter = Router();

router.use(proteger);
router.use(injecterTenant);

router.get('/', restreindreA('admin', 'assistant'), listerToutesEtapes);

router
  .route('/:id')
  .put(restreindreA('admin', 'assistant'), modifierEtape)
  .delete(restreindreA('admin'), supprimerEtape);

export default router;
