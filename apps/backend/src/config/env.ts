import dotenv from 'dotenv';
dotenv.config();

// Validation des variables d'environnement au démarrage
const requiredEnvVars = ['MONGODB_URI', 'JWT_SECRET', 'JWT_REFRESH_SECRET'] as const;

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Variable d'environnement manquante : ${envVar}`);
  }
}

export const ENV = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '5000', 10),
  MONGODB_URI: process.env.MONGODB_URI as string,
  JWT_SECRET: process.env.JWT_SECRET as string,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET as string,
  JWT_ACCESS_EXPIRES: process.env.JWT_ACCESS_EXPIRES || '15m',
  JWT_REFRESH_EXPIRES: process.env.JWT_REFRESH_EXPIRES || '7d',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || '',
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY || '',
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET || '',
} as const;
