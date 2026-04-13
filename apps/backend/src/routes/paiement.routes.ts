import { IRouter, Router } from 'express';
import { proteger, restreindreA } from '../middlewares/auth.middleware';
import { injecterTenant } from '../middlewares/tenant.middleware';
import {
  listerTousPaiements,
  creerPaiement,
  modifierPaiement,
  supprimerPaiement,
} from '../controllers/paiement.controller';

// Applique le pattern standard des routes cabinet
const router: IRouter = Router();

router.use(proteger);
router.use(injecterTenant);

// GET /  — liste globale + stats KPI
router.get('/', restreindreA('admin', 'assistant'), listerTousPaiements);
// Enregistrer un paiement — admin et assistant
router.post('/', restreindreA('admin', 'assistant'), creerPaiement);

// Modifier un paiement — admin et assistant
router.put('/:id', restreindreA('admin', 'assistant'), modifierPaiement);

// Supprimer un paiement — admin uniquement
router.delete('/:id', restreindreA('admin'), supprimerPaiement);

export default router;
