import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getNotificationsNonLues,
  getNotificationsNonLuesCount,
  marquerNotificationCommeLue,
  marquerToutesNotificationsCommeLues,
} from '../api/notifications.api';

export const notificationsKeys = {
  all: ['notifications'] as const,
  unread: ['notifications', 'unread'] as const,
  unreadCount: ['notifications', 'unread-count'] as const,
};

const NOTIFICATIONS_REFETCH_INTERVAL = 5 * 60 * 1000;
const NOTIFICATIONS_STALE_TIME = 5 * 60 * 1000;

export function useNotificationsNonLuesCount() {
  return useQuery({
    queryKey: notificationsKeys.unreadCount,
    queryFn: getNotificationsNonLuesCount,
    staleTime: NOTIFICATIONS_STALE_TIME,
    refetchInterval: NOTIFICATIONS_REFETCH_INTERVAL,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
  });
}

export function useNotificationsNonLues() {
  return useQuery({
    queryKey: notificationsKeys.unread,
    queryFn: getNotificationsNonLues,
    staleTime: NOTIFICATIONS_STALE_TIME,
    refetchInterval: NOTIFICATIONS_REFETCH_INTERVAL,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
  });
}

export function useMarquerNotificationCommeLue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: marquerNotificationCommeLue,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: notificationsKeys.all });
    },
  });
}

export function useMarquerToutesNotificationsCommeLues() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: marquerToutesNotificationsCommeLues,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: notificationsKeys.all });
    },
  });
}
