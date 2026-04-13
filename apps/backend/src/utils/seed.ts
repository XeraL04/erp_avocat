import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { connectDB } from '../config/db';
import { User } from '../models/user.model';
import { Tenant } from '../models/tenant.model';

const seed = async () => {
  await connectDB();

  // ─────────────────────────────────────────
  // 1. SUPER ADMIN (toi)
  // ─────────────────────────────────────────
  const superAdminExistant = await User.findOne({ role: 'superadmin' });

  if (!superAdminExistant) {
    await User.create({
      nom: 'Super Admin',
      email: 'superadmin@erp-avocat.dz',
      motDePasse: 'SuperAdmin123!',
      role: 'superadmin',
      // pas de tenantId pour le superadmin
    });
    console.log('✅ Super Admin créé');
    console.log('   Email    : superadmin@erp-avocat.dz');
    console.log('   Password : SuperAdmin123!');
  } else {
    console.log('✅ Super Admin déjà existant');
  }

  // ─────────────────────────────────────────
  // 2. CABINET DE TEST (tenant)
  // ─────────────────────────────────────────
  let tenant = await Tenant.findOne({ slug: 'cabinet-benali' });

  if (!tenant) {
    tenant = await Tenant.create({
      nom: 'Cabinet Maître Benali',
      slug: 'cabinet-benali',
      email: 'contact@cabinet-benali.dz',
      telephone: '0555123456',
      adresse: 'Rue Didouche Mourad, Alger',
      plan: 'starter',
      statut: 'actif',
      limites: {
        maxDossiers: 50,
        maxDocuments: 500,
        maxUtilisateurs: 2,
      },
      compteurs: {
        dossiers: 0,
        utilisateurs: 0,
      },
    });
    console.log('✅ Cabinet de test créé');
    console.log('   Nom  : Cabinet Maître Benali');
    console.log('   ID   :', tenant._id);
  } else {
    console.log('✅ Cabinet de test déjà existant, ID :', tenant._id);
  }

  // ─────────────────────────────────────────
  // 3. ADMIN DU CABINET (l'avocat)
  // ─────────────────────────────────────────
  const adminExistant = await User.findOne({
    email: 'admin@cabinet-benali.dz',
    tenantId: tenant._id,
  });

  if (!adminExistant) {
    await User.create({
      nom: 'Maître Benali',
      email: 'admin@cabinet-benali.dz',
      motDePasse: 'Admin123!',
      role: 'admin',
      tenantId: tenant._id, // lié au cabinet
      actif: true,
    });
    console.log('✅ Admin cabinet créé');
    console.log('   Email    : admin@cabinet-benali.dz');
    console.log('   Password : Admin123!');
  } else {
    console.log('✅ Admin cabinet déjà existant');
  }

  // ─────────────────────────────────────────
  // 4. ASSISTANT DU CABINET
  // ─────────────────────────────────────────
  const assistantExistant = await User.findOne({
    email: 'assistant@cabinet-benali.dz',
    tenantId: tenant._id,
  });

  if (!assistantExistant) {
    await User.create({
      nom: 'Assistante Sarah',
      email: 'assistant@cabinet-benali.dz',
      motDePasse: 'Assistant123!',
      role: 'assistant',
      tenantId: tenant._id, // lié au même cabinet
      actif: true,
    });
    console.log('✅ Assistant cabinet créé');
    console.log('   Email    : assistant@cabinet-benali.dz');
    console.log('   Password : Assistant123!');
  } else {
    console.log('✅ Assistant déjà existant');
  }

  console.log('\n🎉 Seed multi-tenant terminé avec succès');
  process.exit(0);
};

seed().catch((err) => {
  console.error('❌ Erreur seed :', err);
  process.exit(1);
});
