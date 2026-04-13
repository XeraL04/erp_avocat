import { IRouter, Router } from 'express';
import { proteger, restreindreA } from '../middlewares/auth.middleware';
import { injecterTenant } from '../middlewares/tenant.middleware';
import {
  listerClients,
  creerClient,
  obtenirClient,
  modifierClient,
  supprimerClient,
  obtenirDossiersClient,
  obtenirPaiementsClient,
} from '../controllers/client.controller';

const router: IRouter = Router();

// ─── Middlewares globaux du module ────────────────────────────────────────────
// Appliqués à TOUTES les routes du router dans l'ordre déclaré
router.use(proteger); // 1. Vérifie le JWT et injecte req.utilisateur
router.use(injecterTenant); // 2. Vérifie le statut du cabinet + injecte tenantId

// ─── Routes principales ────────────────────────────────────────────────────────

router
  .route('/')
  .get(listerClients) // admin + assistant : liste et recherche
  .post(creerClient); // admin + assistant : création

router
  .route('/:id')
  .get(obtenirClient) // admin + assistant : détail
  .put(modifierClient) // admin + assistant : modification
  .delete(restreindreA('admin'), supprimerClient); // admin UNIQUEMENT : soft delete

// ─── Routes imbriquées (données liées au client) ───────────────────────────────

router.get('/:id/dossiers', obtenirDossiersClient); // admin + assistant
router.get('/:id/paiements', obtenirPaiementsClient); // admin + assistant

export default router;
