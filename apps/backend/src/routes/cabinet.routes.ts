import { IRouter, Router } from 'express';
import { proteger, restreindreA } from '../middlewares/auth.middleware';
import { getDashboardCabinet } from '../controllers/cabinet.controller';

const router: IRouter = Router();

// Toutes les routes cabinet requièrent auth + rôle admin ou assistant
router.use(proteger);
router.use(restreindreA('admin', 'assistant'));

router.get('/dashboard', getDashboardCabinet);

export default router;
