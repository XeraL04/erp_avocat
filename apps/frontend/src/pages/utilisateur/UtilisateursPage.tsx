import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Users,
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  XCircle,
  MoreHorizontal,
  ShieldCheck,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { EmptyState } from '@/components/ui/empty-state';

import {
  listerUtilisateurs,
  changerStatutUtilisateur,
  supprimerUtilisateur,
  type Utilisateur,
} from '@/api/utilisateur.api';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';
import DialogCreerAssistant from '@/components/admin/DialogCreerAssistant';
import DialogModifierAssistant from '@/components/admin/DialogModifierAssistant';

export default function UtilisateursPage() {
  const queryClient = useQueryClient();
  const moi = useAuthStore((s) => s.utilisateur);

  const [dialogCreer, setDialogCreer] = useState(false);
  const [userAModifier, setUserAModifier] = useState<Utilisateur | null>(null);
  const [userASupprimer, setUserASupprimer] = useState<Utilisateur | null>(null);

  // ── Query ──────────────────────────────────────────────────────────────────
  const { data: utilisateurs = [], isLoading } = useQuery({
    queryKey: ['cabinet', 'utilisateurs'],
    queryFn: listerUtilisateurs,
  });

  // ── Mutations ──────────────────────────────────────────────────────────────
  const { mutate: basculerStatut, isPending: changementStatut } = useMutation({
    mutationFn: ({ id, actif }: { id: string; actif: boolean }) =>
      changerStatutUtilisateur(id, actif),
    onSuccess: (u) => {
      queryClient.invalidateQueries({ queryKey: ['cabinet', 'utilisateurs'] });
      toast.success(`${u.nom} ${u.actif ? 'activé' : 'désactivé'}`);
    },
    onError: () => toast.error('Erreur lors du changement de statut'),
  });

  const { mutate: supprimer, isPending: suppressionEnCours } = useMutation({
    mutationFn: () => supprimerUtilisateur(userASupprimer!._id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cabinet', 'utilisateurs'] });
      toast.success('Assistant supprimé');
      setUserASupprimer(null);
    },
    onError: () => toast.error('Erreur lors de la suppression'),
  });

  return (
    <div className="space-y-6">
      {/* ── En-tête ─────────────────────────────────────────────── */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Équipe</h2>
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            {isLoading
              ? 'Chargement…'
              : `${utilisateurs.length} assistant${utilisateurs.length > 1 ? 's' : ''}`}
          </p>
        </div>
        <Button size="sm" onClick={() => setDialogCreer(true)}>
          <Plus className="mr-1.5 h-4 w-4" />
          Ajouter un assistant
        </Button>
      </div>

      {/* ── Compte admin (moi) — non modifiable ─────────────────── */}
      {moi && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <ShieldCheck className="h-5 w-5 text-primary" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{moi.nom}</p>
              <p className="truncate text-sm text-muted-foreground">{moi.email}</p>
            </div>
            {/* Badge admin — token primary, pas de classe hover inutile */}
            <span className="shrink-0 inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
              Administrateur
            </span>
          </CardContent>
        </Card>
      )}

      {/* ── Skeleton ────────────────────────────────────────────── */}
      {isLoading && (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-4 py-3 sm:px-6 sm:py-4">
                  {/* Avatar */}
                  <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
                  {/* Infos */}
                  <div className="flex-1 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-4 w-36" />
                      <Skeleton className="h-5 w-14 rounded-full" />
                    </div>
                    <Skeleton className="h-3 w-52" />
                  </div>
                  {/* Menu */}
                  <Skeleton className="h-8 w-8 shrink-0 rounded-md" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Empty state ─────────────────────────────────────────── */}
      {!isLoading && utilisateurs.length === 0 && (
        <EmptyState
          icone={Users}
          titre="Aucun assistant"
          description="Ajoutez un assistant pour qu'il puisse accéder au cabinet."
          action={{
            label: 'Ajouter un assistant',
            onClick: () => setDialogCreer(true),
            icone: Plus,
          }}
        />
      )}

      {/* ── Liste assistants ─────────────────────────────────────── */}
      {!isLoading && utilisateurs.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {utilisateurs.map((u) => (
                <div key={u._id} className="flex items-center gap-4 px-4 py-3 sm:px-6 sm:py-4">
                  {/* Avatar initiales */}
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground"
                    aria-hidden="true"
                  >
                    {u.nom.charAt(0).toUpperCase()}
                  </div>

                  {/* Infos */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-sm font-medium">{u.nom}</span>

                      {/* Badge statut — tokens sémantiques, plus de dark: manuel */}
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
                          u.actif
                            ? 'bg-status-actif-bg text-status-actif'
                            : 'bg-destructive/10 text-destructive'
                        )}
                      >
                        <span
                          className={cn(
                            'h-1.5 w-1.5 rounded-full',
                            u.actif ? 'bg-status-actif' : 'bg-destructive'
                          )}
                        />
                        {u.actif ? 'Actif' : 'Désactivé'}
                      </span>
                    </div>

                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span>{u.email}</span>
                      <span>·</span>
                      <span>
                        Ajouté le {format(parseISO(u.createdAt), 'd MMM yyyy', { locale: fr })}
                      </span>
                    </div>
                  </div>

                  {/* Actions dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        aria-label={`Actions pour ${u.nom}`}
                      >
                        <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setUserAModifier(u)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Modifier
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        disabled={changementStatut}
                        onClick={() => basculerStatut({ id: u._id, actif: !u.actif })}
                      >
                        {u.actif ? (
                          <>
                            <XCircle className="mr-2 h-4 w-4" />
                            Désactiver
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            Activer
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => setUserASupprimer(u)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Supprimer
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Dialogs ──────────────────────────────────────────────── */}
      {dialogCreer && (
        <DialogCreerAssistant
          onFermer={() => setDialogCreer(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['cabinet', 'utilisateurs'] });
            setDialogCreer(false);
          }}
        />
      )}

      {userAModifier && (
        <DialogModifierAssistant
          utilisateur={userAModifier}
          onFermer={() => setUserAModifier(null)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['cabinet', 'utilisateurs'] });
            setUserAModifier(null);
          }}
        />
      )}

      {/* ── Confirmation suppression ─────────────────────────────── */}
      <AlertDialog open={!!userASupprimer} onOpenChange={(o) => !o && setUserASupprimer(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cet assistant ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le compte de <strong>{userASupprimer?.nom}</strong> sera définitivement supprimé. Il
              ne pourra plus se connecter au cabinet.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => supprimer()}
              disabled={suppressionEnCours}
            >
              {suppressionEnCours && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
