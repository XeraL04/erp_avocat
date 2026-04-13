import mongoose from 'mongoose';
import { ENV } from './env';

export const connectDB = async (): Promise<void> => {
  try {
    const conn = await mongoose.connect(ENV.MONGODB_URI);
    console.log(`✅ MongoDB connecté : ${conn.connection.host}`);
  } catch (error) {
    console.error('❌ Erreur connexion MongoDB :', error);
    process.exit(1);
  }
};
