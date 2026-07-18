import { Bell, CheckCheck, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { ScrollArea } from '../ui/scroll-area';
import {
  useMarquerNotificationCommeLue,
  useMarquerToutesNotificationsCommeLues,
  useNotificationsNonLues,
  useNotificationsNonLuesCount,
} from '../../hooks/use-notifications';
import { formaterDateHeure } from '../../lib/utils';

function tronquerTexte(texte: string, max = 90): string {
  if (texte.length <= max) return texte;
  return `${texte.slice(0, max)}...`;
}

export default function NotificationsDropdown() {
  const navigate = useNavigate();

  const { data: count = 0, isLoading: isLoadingCount } = useNotificationsNonLuesCount();
  const { data: notifications = [], isLoading: isLoadingNotifications } = useNotificationsNonLues();

  const { mutate: marquerUneCommeLue, isPending: isPendingUne } = useMarquerNotificationCommeLue();

  const { mutate: marquerToutesCommeLues, isPending: isPendingToutes } =
    useMarquerToutesNotificationsCommeLues();

  const handleNotificationClick = (notificationId: string, evenementId?: string | null): void => {
    marquerUneCommeLue(notificationId, {
      onSuccess: () => {
        if (evenementId) {
          navigate('/cabinet/agenda');
        }
      },
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="h-5 w-5" />
          {!isLoadingCount && count > 0 ? (
            <Badge className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px]">
              {count > 99 ? '99+' : count}
            </Badge>
          ) : null}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-90 p-0">
        <div className="flex items-center justify-between px-4 py-3">
          <DropdownMenuLabel className="p-0">Notifications</DropdownMenuLabel>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs"
            disabled={count === 0 || isPendingToutes}
            onClick={() => marquerToutesCommeLues()}
          >
            {isPendingToutes ? (
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
            ) : (
              <CheckCheck className="mr-2 h-3.5 w-3.5" />
            )}
            Tout lire
          </Button>
        </div>

        <DropdownMenuSeparator />

        <ScrollArea className="max-h-105">
          {isLoadingNotifications ? (
            <div className="space-y-3 p-4">
              <div className="h-16 animate-pulse rounded-lg bg-muted" />
              <div className="h-16 animate-pulse rounded-lg bg-muted" />
              <div className="h-16 animate-pulse rounded-lg bg-muted" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 px-4 py-10 text-center">
              <Bell className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm font-medium">Aucune notification non lue</p>
              <p className="text-xs text-muted-foreground">
                Les rappels d’événements à venir apparaîtront ici.
              </p>
            </div>
          ) : (
            <div className="p-2">
              {notifications.map((notification) => (
                <DropdownMenuItem
                  key={notification.id}
                  className="flex cursor-pointer flex-col items-start gap-1 rounded-lg p-3"
                  onClick={() => handleNotificationClick(notification.id, notification.evenementId)}
                  disabled={isPendingUne}
                >
                  <div className="flex w-full items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium leading-tight">{notification.titre}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {tronquerTexte(notification.message)}
                      </p>
                    </div>

                    {!notification.lu ? (
                      <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-primary" />
                    ) : null}
                  </div>

                  <div className="flex w-full items-center justify-between text-[11px] text-muted-foreground">
                    <span>{formaterDateHeure(notification.createdAt)}</span>
                    {notification.dossier?.reference ? (
                      <span>{notification.dossier.reference}</span>
                    ) : null}
                  </div>
                </DropdownMenuItem>
              ))}
            </div>
          )}
        </ScrollArea>

        <DropdownMenuSeparator />

        <div className="p-2">
          <Button
            type="button"
            variant="ghost"
            className="w-full justify-center"
            onClick={() => navigate('/cabinet/agenda')}
          >
            Voir l’agenda
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
