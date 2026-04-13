import { Router, IRouter } from 'express';
import {
  getDashboard,
  getTenants,
  getTenantById,
  creerTenant,
  modifierTenant,
  changerStatutTenant,
} from '../controllers/superadmin.controller';
import { proteger, restreindreA } from '../middlewares/auth.middleware';

const router: IRouter = Router();

// Toutes les routes superadmin sont protégées
router.use(proteger);
router.use(restreindreA('superadmin'));

router.get('/dashboard', getDashboard);
router.get('/tenants', getTenants);
router.get('/tenants/:id', getTenantById);
router.post('/tenants', creerTenant);
router.put('/tenants/:id', modifierTenant);
router.patch('/tenants/:id/statut', changerStatutTenant);

export default router;
