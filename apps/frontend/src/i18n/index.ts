import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// ── Arabe ──
import arCommon from './locales/ar/common.json';
import arAuth from './locales/ar/auth.json';
import arClients from './locales/ar/clients.json';
import arDossiers from './locales/ar/dossiers.json';
import arHonoraires from './locales/ar/honoraires.json';
import arDashboard from './locales/ar/dashboard.json';
import arAgenda from './locales/ar/agenda.json';
import arPaiements from './locales/ar/paiements.json';
import arFactures from './locales/ar/factures.json';
import arDocuments from './locales/ar/documents.json';
import arUtilisateurs from './locales/ar/utilisateurs.json';
import arProfil from './locales/ar/profil.json';
import arCabinet from './locales/ar/cabinet.json';
import arFinances from './locales/ar/finances.json';
import arReports from './locales/ar/reports.json';
import arEtapes from './locales/ar/etapes.json';
import arInstitution from './locales/ar/institution.json';
import arProfile from './locales/ar/profile.json';

// ── Français ──
import frCommon from './locales/fr/common.json';
import frAuth from './locales/fr/auth.json';
import frClients from './locales/fr/clients.json';
import frDossiers from './locales/fr/dossiers.json';
import frHonoraires from './locales/fr/honoraires.json';
import frDashboard from './locales/fr/dashboard.json';
import frAgenda from './locales/fr/agenda.json';
import frPaiements from './locales/fr/paiements.json';
import frFactures from './locales/fr/factures.json';
import frDocuments from './locales/fr/documents.json';
import frUtilisateurs from './locales/fr/utilisateurs.json';
import frProfil from './locales/fr/profil.json';
import frCabinet from './locales/fr/cabinet.json';
import frFinances from './locales/ar/finances.json';
import frReports from './locales/fr/reports.json';
import frEtapes from './locales/fr/etapes.json';
import frInstitution from './locales/fr/institution.json';
import frProfile from './locales/fr/profile.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      ar: {
        common: arCommon,
        auth: arAuth,
        clients: arClients,
        dossiers: arDossiers,
        honoraires: arHonoraires,
        dashboard: arDashboard,
        agenda: arAgenda,
        paiements: arPaiements,
        factures: arFactures,
        documents: arDocuments,
        utilisateurs: arUtilisateurs,
        profil: arProfil,
        cabinet: arCabinet,
        finances: arFinances,
        reports: arReports,
        etapes: arEtapes,
        institution: arInstitution,
        profile: arProfile,
      },
      fr: {
        common: frCommon,
        auth: frAuth,
        clients: frClients,
        dossiers: frDossiers,
        honoraires: frHonoraires,
        dashboard: frDashboard,
        agenda: frAgenda,
        paiements: frPaiements,
        factures: frFactures,
        documents: frDocuments,
        utilisateurs: frUtilisateurs,
        profil: frProfil,
        cabinet: frCabinet,
        finances: frFinances,
        reports: frReports,
        etapes: frEtapes,
        institution: frInstitution,
        profile: frProfile,
      },
    },
    lng: 'ar',
    fallbackLng: 'fr',
    defaultNS: 'common',
    ns: [
      'common',
      'auth',
      'clients',
      'dossiers',
      'honoraires',
      'dashboard',
      'agenda',
      'paiements',
      'factures',
      'documents',
      'utilisateurs',
      'profil',
      'cabinet',
      'finances',
      'reports',
      'etapes',
      'institution',
      'profile',
    ],
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'erp-language',
    },
  });

export default i18n;
