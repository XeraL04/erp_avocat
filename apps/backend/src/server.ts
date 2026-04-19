import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import path from 'path';
import { ENV } from './config/env';
import { connectDB } from './config/db';
import { errorHandler } from './middlewares/error-handler';

import authRoutes from './routes/auth.routes';
import superadminRoutes from './routes/superadmin.routes';
import clientRoutes from './routes/client.routes';
import dossierRoutes from './routes/dossier.routes';
import institutionPersonnaliseeRoutes from './routes/institutionPersonnalisee.routes';
import paiementRoutes from './routes/paiement.routes';
import factureRoutes from './routes/facture.routes';
import evenementRoutes from './routes/evenement.routes';
import documentRoutes from './routes/document.routes';
import etapeRoutes from './routes/etape.routes';
import cabinetRoutes from './routes/cabinet.routes';
import utilisateurRoutes from './routes/utilisateur.routes';

const app: Express = express();

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'same-origin' },
  })
);
app.use(cors({ origin: ENV.FRONTEND_URL, credentials: true }));
app.use(morgan(ENV.NODE_ENV === 'development' ? 'dev' : 'combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// ── Routes ────────────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ success: true, data: { status: 'OK', env: ENV.NODE_ENV } });
});
app.use('/api/auth', authRoutes);
app.use('/api/superadmin', superadminRoutes);
app.use('/api/cabinet/clients', clientRoutes);
app.use('/api/cabinet/dossiers', dossierRoutes);
app.use('/api/cabinet/paiements', paiementRoutes);
app.use('/api/cabinet/factures', factureRoutes);
app.use('/api/cabinet/evenements', evenementRoutes);
app.use('/api/cabinet/documents', documentRoutes);
app.use('/api/cabinet/etapes', etapeRoutes);
app.use('/api/cabinet/utilisateurs', utilisateurRoutes);
app.use('/api/cabinet', institutionPersonnaliseeRoutes);
app.use('/api/cabinet', cabinetRoutes);

if (ENV.NODE_ENV === 'production') {
	const frontendDist = path.join(__dirname, '..', '..','frontend', 'dist');
	app.use(express.static(frontendDist));
	app.get('*', (_req, res)=>{
		res.sendFile(path.join(frontendDist, 'index.html'));
	});
}

app.use(errorHandler);

const startServer = async (): Promise<void> => {
  await connectDB();
  app.listen(ENV.PORT, () => {
    console.log(`🚀 Serveur démarré sur http://localhost:${ENV.PORT}`);
  });
};

startServer();

export default app;
