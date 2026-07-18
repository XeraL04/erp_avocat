import apiClient from './client';
import type { ApiSuccess, NotificationItem, NotificationCountResponse } from '../types';

interface NotificationBrute {
  _id: string;
  titre: string;
  message: string;
  statut: 'non_lue' | 'lue';
  type: 'audience' | 'rdv' | 'rappel';
  canal: 'in_app';
  createdAt: string;
  updatedAt: string;
  dateNotification: string;
  dateLecture?: string;
  tenantId: string;
  cleDeduplication?: string;
  evenement?: {
    _id: string;
    titre: string;
    type: 'audience' | 'rdv' | 'rappel';
    dateHeure: string;
    lieu?: string;
  } | null;
  dossier?: {
    _id: string;
    reference: string;
    titre?: string;
    type?: string;
  } | null;
}

function normaliser(n: NotificationBrute): NotificationItem {
  return {
    id: n._id,
    titre: n.titre,
    message: n.message,
    lu: n.statut === 'lue',
    type: n.type,
    dateLecture: n.dateLecture ?? null,
    createdAt: n.createdAt,
    updatedAt: n.updatedAt,
    evenementId: n.evenement?._id ?? null,
    dossier: n.dossier
      ? {
          id: n.dossier._id,
          reference: n.dossier.reference,
          titre: n.dossier.titre ?? '',
          type: n.dossier.type ?? '',
        }
      : null,
  };
}

export async function getNotificationsNonLues(): Promise<NotificationItem[]> {
  const { data } = await apiClient.get<ApiSuccess<{ notifications: NotificationBrute[] }>>(
    '/cabinet/notifications/non-lues'
  );

  return data.data.notifications.map(normaliser);
}

export async function getNotificationsNonLuesCount(): Promise<number> {
  const { data } = await apiClient.get<ApiSuccess<NotificationCountResponse>>(
    '/cabinet/notifications/non-lues/count'
  );

  return data.data.count;
}

export async function marquerNotificationCommeLue(id: string): Promise<void> {
  await apiClient.patch(`/cabinet/notifications/${id}/lire`);
}

export async function marquerToutesNotificationsCommeLues(): Promise<void> {
  await apiClient.patch('/cabinet/notifications/lire-tout');
}
