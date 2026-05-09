import { IRouter, Router } from 'express';
import { proteger, restreindreA } from '../middlewares/auth.middleware';
import { injecterTenant } from '../middlewares/tenant.middleware';
import {
  listerFactures,
  creerFacture,
  creerFactureDepuisPaiement,
  obtenirFacture,
  modifierFacture,
  supprimerFacture,
  telechargerFacturePDF,
} from '../controllers/facture.controller';

const router: IRouter = Router();

// Middlewares appliqués à toutes les routes du module
router.use(proteger);
router.use(injecterTenant);

// ─── Routes CRUD ──────────────────────────────────────────────────────────────
router
  .route('/')
  .get(restreindreA('admin', 'assistant'), listerFactures)
  .post(restreindreA('admin', 'assistant'), creerFacture);

// ─── Génération facture depuis un paiement ────────────────────────────────────
// POST /api/cabinet/factures/depuis-paiement/:paiementId
// Doit être déclaré AVANT /:id pour éviter le conflit de route Express
router.post(
  '/depuis-paiement/:paiementId',
  restreindreA('admin', 'assistant'),
  creerFactureDepuisPaiement
);

// ─── Routes par ID ────────────────────────────────────────────────────────────
router
  .route('/:id')
  .get(restreindreA('admin', 'assistant'), obtenirFacture)
  .put(restreindreA('admin', 'assistant'), modifierFacture)
  .delete(restreindreA('admin'), supprimerFacture);

// ─── Génération PDF ───────────────────────────────────────────────────────────
// GET /api/cabinet/factures/:id/pdf
router.get('/:id/pdf', restreindreA('admin', 'assistant'), telechargerFacturePDF);

export default router;








// import { IRouter, Router } from 'express';
// import { proteger, restreindreA } from '../middlewares/auth.middleware';
// import { injecterTenant } from '../middlewares/tenant.middleware';
// import {
//   listerFactures,
//   creerFacture,
//   obtenirFacture,
//   modifierFacture,
//   supprimerFacture,
//   telechargerFacturePDF,
// } from '../controllers/facture.controller';

// const router: IRouter = Router();

// // Middlewares appliqués à toutes les routes du module
// router.use(proteger);
// router.use(injecterTenant);

// // ─── Routes CRUD ──────────────────────────────────────────────────────────────
// router
//   .route('/')
//   .get(restreindreA('admin', 'assistant'), listerFactures)
//   .post(restreindreA('admin', 'assistant'), creerFacture);

// router
//   .route('/:id')
//   .get(restreindreA('admin', 'assistant'), obtenirFacture)
//   .put(restreindreA('admin', 'assistant'), modifierFacture)
//   .delete(restreindreA('admin'), supprimerFacture);

// // ─── Génération PDF ───────────────────────────────────────────────────────────
// // GET /:id/pdf → téléchargement direct du fichier PDF
// router.get('/:id/pdf', restreindreA('admin', 'assistant'), telechargerFacturePDF);

// export default router;
