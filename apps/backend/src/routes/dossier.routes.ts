import { IRouter, Router } from 'express';
import { proteger, restreindreA } from '../middlewares/auth.middleware';
import { injecterTenant } from '../middlewares/tenant.middleware';

// ── Contrôleurs dossier ───────────────────────────────────────────────────────
import {
  listerDossiers,
  creerDossier,
  obtenirDossier,
  modifierDossier,
  supprimerDossier,
  changerStatutDossier,
  ajouterReport,
  modifierReport,
  supprimerReport,
} from '../controllers/dossier.controller';

// ── Phase 3 : Honoraires & Paiements ─────────────────────────────────────────
import {
  obtenirHonoraire,
  creerHonoraire,
  modifierHonoraire,
  supprimerHonoraire,
} from '../controllers/honoraire.controller';
import { listerPaiementsDossier } from '../controllers/paiement.controller';

// ── Phase 4 : Agenda / Documents / Étapes ────────────────────────────────────
import { listerEvenementsDossier }             from '../controllers/evenement.controller';
import { listerDocumentsDossier }              from '../controllers/document.controller';
import { listerEtapesDossier, creerEtape }     from '../controllers/etape.controller';

const router: IRouter = Router();

router.use(proteger);
router.use(injecterTenant);

// ─── CRUD Dossiers ────────────────────────────────────────────────────────────
router
  .route('/')
  .get(restreindreA('admin', 'assistant'),  listerDossiers)
  .post(restreindreA('admin', 'assistant'), creerDossier);

router
  .route('/:id')
  .get(restreindreA('admin', 'assistant'),  obtenirDossier)
  .put(restreindreA('admin', 'assistant'),  modifierDossier)
  .delete(restreindreA('admin'),            supprimerDossier);

router.patch('/:id/statut', restreindreA('admin'), changerStatutDossier);

// ─── Honoraire ────────────────────────────────────────────────────────────────
router
  .route('/:id/honoraire')
  .get(restreindreA('admin', 'assistant'),  obtenirHonoraire)
  .post(restreindreA('admin', 'assistant'), creerHonoraire)
  .put(restreindreA('admin', 'assistant'),  modifierHonoraire)
  .delete(restreindreA('admin'),            supprimerHonoraire);

// ─── Paiements ────────────────────────────────────────────────────────────────
router.get('/:id/paiements', restreindreA('admin', 'assistant'), listerPaiementsDossier);

// ─── Phase 4 — Sous-ressources ────────────────────────────────────────────────
router.get('/:id/evenements', restreindreA('admin', 'assistant'), listerEvenementsDossier);
router.get('/:id/documents',  restreindreA('admin', 'assistant'), listerDocumentsDossier);
router
  .route('/:id/etapes')
  .get(restreindreA('admin', 'assistant'),  listerEtapesDossier)
  .post(restreindreA('admin', 'assistant'), creerEtape);

// ─── Reports ──────────────────────────────────────────────────────────────────
router
  .route('/:id/reports')
  .post(restreindreA('admin', 'assistant'), ajouterReport);

router
  .route('/:id/reports/:reportId')
  .put(restreindreA('admin', 'assistant'),  modifierReport)    // ← NOUVEAU
  .delete(restreindreA('admin'),            supprimerReport);

export default router;