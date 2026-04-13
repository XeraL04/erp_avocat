import { IRouter, Router } from 'express';
import { proteger, restreindreA } from '../middlewares/auth.middleware';
import { injecterTenant } from '../middlewares/tenant.middleware';
import {
  listerUtilisateurs,
  creerAssistant,
  modifierUtilisateur,
  changerStatutUtilisateur,
  supprimerUtilisateur,
} from '../controllers/utilisateur.controller';

const router: IRouter = Router();

// Toutes les routes réservées à l'admin uniquement
router.use(proteger);
router.use(injecterTenant);
router.use(restreindreA('admin'));

router.route('/').get(listerUtilisateurs).post(creerAssistant);

router.route('/:id').put(modifierUtilisateur).delete(supprimerUtilisateur);

router.patch('/:id/statut', changerStatutUtilisateur);

export default router;
