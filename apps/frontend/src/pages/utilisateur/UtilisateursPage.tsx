import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Users, Plus, Pencil, Trash2,
  CheckCircle2, XCircle, MoreHorizontal,
  ShieldCheck, Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import {
  listerUtilisateurs,
  changerStatutUtilisateur,
  supprimerUtilisateur,
  type Utilisateur,
} from '@/api/utilisateur.api';
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

  // ── Mutation statut ────────────────────────────────────────────────────────
  const { mutate: basculerStatut, isPending: changementStatut } = useMutation({
    mutationFn: ({ id, actif }: { id: string; actif: boolean }) =>
      changerStatutUtilisateur(id, actif),
    onSuccess: (u) => {
      queryClient.invalidateQueries({ queryKey: ['cabinet', 'utilisateurs'] });
      toast.success(`${u.nom} ${u.actif ? 'activé' : 'désactivé'}`);
    },
    onError: () => toast.error('Erreur lors du changement de statut'),
  });

  // ── Mutation suppression ───────────────────────────────────────────────────
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
      {/* En-tête */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Équipe</h2>
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            {isLoading ? 'Chargement…' : `${utilisateurs.length} assistant${utilisateurs.length > 1 ? 's' : ''}`}
          </p>
        </div>
        <Button size="sm" onClick={() => setDialogCreer(true)}>
          <Plus className="mr-1.5 h-4 w-4" />
          Ajouter un assistant
        </Button>
      </div>

      {/* Compte admin (moi) — non modifiable ici */}
      {moi && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <ShieldCheck className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{moi.nom}</p>
              <p className="truncate text-sm text-muted-foreground">{moi.email}</p>
            </div>
            <Badge className="shrink-0 bg-primary/10 text-primary hover:bg-primary/10">
              Administrateur
            </Badge>
          </CardContent>
        </Card>
      )}

      {/* Liste assistants */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-18 w-full rounded-lg" />
          ))}
        </div>
      ) : utilisateurs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
              <Users className="h-7 w-7 opacity-40" />
            </div>
            <div>
              <p className="font-medium">Aucun assistant</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Ajoutez un assistant pour qu'il puisse accéder au cabinet.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setDialogCreer(true)}>
              <Plus className="mr-1.5 h-4 w-4" />
              Ajouter un assistant
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {utilisateurs.map((u) => (
                <div
                  key={u._id}
                  className="flex items-center gap-4 px-4 py-3 sm:px-6 sm:py-4"
                >
                  {/* Avatar initiales */}
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground">
                    {u.nom.charAt(0).toUpperCase()}
                  </div>

                  {/* Infos */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-sm font-medium">{u.nom}</span>
                      <Badge
                        variant="secondary"
                        className={
                          u.actif
                            ? 'bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400'
                            : 'bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400'
                        }
                      >
                        {u.actif ? 'Actif' : 'Désactivé'}
                      </Badge>
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span>{u.email}</span>
                      <span>·</span>
                      <span>
                        Ajouté le {format(parseISO(u.createdAt), 'd MMM yyyy', { locale: fr })}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                        <MoreHorizontal className="h-4 w-4" />
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

      {/* Dialogs */}
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

      {/* Confirmation suppression */}
      <AlertDialog
        open={!!userASupprimer}
        onOpenChange={(o) => !o && setUserASupprimer(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cet assistant ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le compte de <strong>{userASupprimer?.nom}</strong> sera définitivement supprimé.
              Il ne pourra plus se connecter au cabinet.
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