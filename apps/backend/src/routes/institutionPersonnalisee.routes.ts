import { IRouter, Router } from 'express';
import { proteger, restreindreA } from '../middlewares/auth.middleware';
import { injecterTenant } from '../middlewares/tenant.middleware';
import {
  listerInstitutions,
  enregistrerInstitution,
} from '../controllers/institutionPersonnalisee.controller';

const router: IRouter = Router();

router.use(proteger);
router.use(injecterTenant);

router.get('/institutions-personnalisees', restreindreA('admin', 'assistant'), listerInstitutions);
router.post('/institutions-personnalisees', restreindreA('admin', 'assistant'), enregistrerInstitution);

export default router;