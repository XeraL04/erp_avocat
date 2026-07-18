import mongoose from 'mongoose';
import { DateTime } from 'luxon';
import { Evenement } from '../models/evenement.model';
import { Notification } from '../models/notification.model';

interface ResultatGenerationNotifications {
  totalEvenementsAnalyses: number;
  totalNotificationsCreees: number;
}

type TypeEvenement = 'audience' | 'rdv' | 'rappel';

const TIMEZONE = 'Africa/Algiers';
const LOCALE = 'fr';

function construireCleDeduplicationJour(
  tenantId: string,
  evenementId: string,
  dateHeure: Date
): string {
  return `tenant:${tenantId}:evt:${evenementId}:ts:${dateHeure.toISOString()}:journalier`;
}

function construireTitreNotification(type: string): string {
  if (type === 'audience') return "Audience prévue aujourd'hui";
  if (type === 'rdv') return "Rendez-vous prévu aujourd'hui";
  return "Rappel prévu aujourd'hui";
}

function formaterDateHeure(date: Date): string {
  return DateTime.fromJSDate(date, { zone: 'utc' })
    .setZone(TIMEZONE)
    .setLocale(LOCALE)
    .toFormat("dd/MM/yyyy 'à' HH:mm");
}

function construireMessageNotification(params: {
  titre: string;
  type: string;
  dateHeure: Date;
  lieu?: string;
}): string {
  const { titre, type, dateHeure, lieu } = params;

  const libelleType =
    type === 'audience'
      ? 'Audience'
      : type === 'rdv'
        ? 'Rendez-vous'
        : 'Rappel';

  const dateFormatee = formaterDateHeure(dateHeure);

  if (lieu && lieu.trim().length > 0) {
    return `${libelleType} prévu aujourd'hui : "${titre}" à ${dateFormatee}, à ${lieu.trim()}.`;
  }

  return `${libelleType} prévu aujourd'hui : "${titre}" à ${dateFormatee}.`;
}

function determinerTypeNotification(typeEvenement: string): TypeEvenement {
  if (typeEvenement === 'audience') return 'audience';
  if (typeEvenement === 'rdv') return 'rdv';
  return 'rappel';
}

function obtenirBornesJourAlgerie(dateReference: Date = new Date()): {
  debutJour: Date;
  finJour: Date;
} {
  const maintenantAlger = DateTime.fromJSDate(dateReference, { zone: 'utc' })
    .setZone(TIMEZONE);

  const debutJour = maintenantAlger.startOf('day').toJSDate();
  const finJour = maintenantAlger.endOf('day').toJSDate();

  return { debutJour, finJour };
}

async function genererNotificationsPourFiltreJour(
  filtre: Record<string, unknown>
): Promise<ResultatGenerationNotifications> {
  const maintenant = new Date();
  const { debutJour, finJour } = obtenirBornesJourAlgerie(maintenant);

  const evenements = await Evenement.find({
    ...filtre,
    dateHeure: {
      $gte: debutJour,
      $lte: finJour,
    },
  })
    .select('tenantId dossier titre type dateHeure lieu')
    .lean();

  if (evenements.length === 0) {
    return {
      totalEvenementsAnalyses: 0,
      totalNotificationsCreees: 0,
    };
  }

  const operations = evenements.map((evenement) => {
    const tenantId = String(evenement.tenantId);
    const evenementId = String(evenement._id);
    const dateHeure = new Date(evenement.dateHeure);

    const cleDeduplication = construireCleDeduplicationJour(
      tenantId,
      evenementId,
      dateHeure
    );

    const typeNotification = determinerTypeNotification(evenement.type);

    return {
      updateOne: {
        filter: {
          tenantId: evenement.tenantId,
          cleDeduplication,
        },
        update: {
          $setOnInsert: {
            tenantId: evenement.tenantId,
            evenement: evenement._id,
            dossier: evenement.dossier ?? undefined,
            titre: construireTitreNotification(evenement.type),
            message: construireMessageNotification({
              titre: evenement.titre,
              type: evenement.type,
              dateHeure,
              lieu: evenement.lieu,
            }),
            type: typeNotification,
            canal: 'in_app' as const,
            statut: 'non_lue' as const,
            dateNotification: maintenant,
            cleDeduplication,
          },
        },
        upsert: true,
      },
    };
  });

  const resultat = await Notification.bulkWrite(
    operations as Parameters<typeof Notification.bulkWrite>[0],
    {
      ordered: false,
    }
  );

  return {
    totalEvenementsAnalyses: evenements.length,
    totalNotificationsCreees: resultat.upsertedCount ?? 0,
  };
}

/**
 * Génère les notifications in-app pour tous les événements prévus aujourd'hui
 * selon le fuseau Africa/Algiers.
 */
export async function genererNotificationsEvenementsDuJour(): Promise<ResultatGenerationNotifications> {
  return genererNotificationsPourFiltreJour({});
}

/**
 * Génération ciblée par tenant pour les événements du jour
 * selon le fuseau Africa/Algiers.
 */
export async function genererNotificationsEvenementsDuJourParTenant(
  tenantId: string
): Promise<ResultatGenerationNotifications> {
  if (!mongoose.Types.ObjectId.isValid(tenantId)) {
    return {
      totalEvenementsAnalyses: 0,
      totalNotificationsCreees: 0,
    };
  }

  return genererNotificationsPourFiltreJour({
    tenantId: new mongoose.Types.ObjectId(tenantId),
  });
}