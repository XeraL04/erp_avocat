import { IRouter, Router } from 'express';
import { proteger, restreindreA } from '../middlewares/auth.middleware';
import { injecterTenant } from '../middlewares/tenant.middleware';
import {
  listerEvenements,
  creerEvenement,
  obtenirEvenement,
  modifierEvenement,
  supprimerEvenement,
} from '../controllers/evenement.controller';

const router: IRouter = Router();

router.use(proteger);
router.use(injecterTenant);

router
  .route('/')
  .get(restreindreA('admin', 'assistant'), listerEvenements)
  .post(restreindreA('admin', 'assistant'), creerEvenement);

router
  .route('/:id')
  .get(restreindreA('admin', 'assistant'), obtenirEvenement)
  .put(restreindreA('admin', 'assistant'), modifierEvenement)
  .delete(restreindreA('admin'), supprimerEvenement);

export default router;
