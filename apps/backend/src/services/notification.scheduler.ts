import cron from 'node-cron';
import type { ScheduledTask } from 'node-cron';
import { genererNotificationsEvenementsDuJour } from './notification.service';

const CRON_EXPRESSION = '0 7 * * *';
const TIMEZONE = 'Africa/Algiers';

let tacheActive: ScheduledTask | null = null;

/**
 * Démarre le scheduler de notifications journalières.
 * À appeler une seule fois au démarrage du serveur.
 */
export function demarrerSchedulerNotifications(): void {
  if (tacheActive) {
    console.warn('[Scheduler] Déjà actif, démarrage ignoré.');
    return;
  }

  tacheActive = cron.schedule(
    CRON_EXPRESSION,
    async () => {
      const debutExecution = Date.now();

      try {
        const resultat = await genererNotificationsEvenementsDuJour();
        const dureeMs = Date.now() - debutExecution;

        console.log(
          `[Scheduler] ${new Date().toISOString()} — ` +
            `${resultat.totalEvenementsAnalyses} événement(s) du jour analysé(s), ` +
            `${resultat.totalNotificationsCreees} notification(s) créée(s), ` +
            `durée ${dureeMs} ms.`
        );
      } catch (erreur) {
        console.error(
          `[Scheduler] ${new Date().toISOString()} — erreur lors de la génération des notifications du jour :`,
          erreur
        );
      }
    },
    {
      timezone: TIMEZONE,
      noOverlap: true,
      name: 'notifications-evenements-jour',
    }
  );

  console.log(
    `[Scheduler] Notifications journalières démarrées — cron ${CRON_EXPRESSION}, fuseau ${TIMEZONE}, exécution chaque jour à 07:00.`
  );
}

/**
 * Arrête le scheduler proprement.
 */
export function arreterSchedulerNotifications(): void {
  if (!tacheActive) {
    return;
  }

  tacheActive.stop();
  tacheActive = null;

  console.log('[Scheduler] Notifications arrêtées.');
}