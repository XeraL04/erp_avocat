import { Router, IRouter } from 'express';
import {
  login,
  logout,
  refreshToken,
  getMe,
  changerMotDePasse,
} from '../controllers/auth.controller';
import { proteger } from '../middlewares/auth.middleware';

const router: IRouter = Router();

router.post('/login', login);
router.post('/refresh', refreshToken);
router.post('/logout', logout);
router.get('/me', proteger, getMe);
router.put('/password', proteger, changerMotDePasse);

export default router;
