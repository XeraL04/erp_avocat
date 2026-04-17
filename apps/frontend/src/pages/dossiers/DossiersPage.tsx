import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  FolderOpen,
  MoreHorizontal,
  Pencil,
  Trash2,
  ChevronRight,
  Scale,
} from 'lucide-react';
import { toast } from 'sonner';
import { useDebounce } from 'use-debounce';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { SkeletonTable } from '@/components/ui/skeleton-table';

import { listerDossiers, supprimerDossier } from '@/api/dossier.api';
import type { Dossier, StatutDossier, TypeDossier, ClientPopule } from '@/types';
import {
  nomAffiche,
  styleStatutDossier,
  libelleTypeDossier,
  formaterDateCourte,
  cn,
} from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';
import DialogCreerDossier from '@/components/dossier/DialogCreerDossier';
import DialogModifierDossier from '@/components/dossier/DialogModifierDossier';

export default function DossiersPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const utilisateur = useAuthStore((s) => s.utilisateur);
  const estAdmin = utilisateur?.role === 'admin';

  // ─── Filtres ──────────────────────────────────────────────────────
  const [recherche, setRecherche] = useState('');
  const [filtreStatut, setFiltreStatut] = useState<StatutDossier | 'tous'>('tous');
  const [filtreType, setFiltreType] = useState<TypeDossier | 'tous'>('tous');
  const [page, setPage] = useState(1);
  const [rechercheDebounced] = useDebounce(recherche, 300);

  // ─── Dialogs ──────────────────────────────────────────────────────
  const [dialogCreer, setDialogCreer] = useState(false);
  const [dossierAModifier, setDossierAModifier] = useState<Dossier | null>(null);
  const [dossierASupprimer, setDossierASupprimer] = useState<Dossier | null>(null);

  // ─── Query ────────────────────────────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ['cabinet', 'dossiers', rechercheDebounced, filtreStatut, filtreType, page],
    queryFn: () =>
      listerDossiers({
        q: rechercheDebounced || undefined,
        statut: filtreStatut === 'tous' ? undefined : filtreStatut,
        type: filtreType === 'tous' ? undefined : filtreType,
        page,
        limit: 20,
      }),
  });

  const dossiers = data?.data ?? [];
  const meta = data?.meta;
  const filtresActifs = !!(recherche || filtreStatut !== 'tous' || filtreType !== 'tous');

  // ─── Suppression ──────────────────────────────────────────────────
  const { mutate: supprimer, isPending: suppression } = useMutation({
    mutationFn: () => supprimerDossier(dossierASupprimer!._id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cabinet', 'dossiers'] });
      queryClient.invalidateQueries({ queryKey: ['cabinet', 'dashboard'] });
      toast.success('Dossier archivé avec succès');
      setDossierASupprimer(null);
    },
    onError: () => toast.error('Erreur lors de la suppression'),
  });

  const reinitialiserFiltres = useCallback(() => {
    setRecherche('');
    setFiltreStatut('tous');
    setFiltreType('tous');
    setPage(1);
  }, []);

  const nomClient = (dossier: Dossier): string => {
    if (typeof dossier.client === 'object' && dossier.client !== null)
      return nomAffiche(dossier.client as ClientPopule);
    return '—';
  };

  return (
    <div className="space-y-6">
      {/* ── En-tête ─────────────────────────────────────────────── */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Dossiers</h2>
          <p className="text-sm text-muted-foreground">
            {meta
              ? `${meta.total} dossier${meta.total > 1 ? 's' : ''} au total`
              : 'Gestion de vos affaires juridiques'}
          </p>
        </div>
        <Button onClick={() => setDialogCreer(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nouveau dossier
        </Button>
      </div>

      {/* ── Filtres ─────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher par titre, référence..."
            className="pl-9"
            value={recherche}
            onChange={(e) => {
              setRecherche(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <Select
          value={filtreStatut}
          onValueChange={(v) => {
            setFiltreStatut(v as StatutDossier | 'tous');
            setPage(1);
          }}
        >
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="tous">Tous les statuts</SelectItem>
            <SelectItem value="en_cours">En cours</SelectItem>
            <SelectItem value="suspendu">Suspendu</SelectItem>
            <SelectItem value="cloture">Clôturé</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={filtreType}
          onValueChange={(v) => {
            setFiltreType(v as TypeDossier | 'tous');
            setPage(1);
          }}
        >
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="tous">Tous les types</SelectItem>
            <SelectItem value="civil">Civil</SelectItem>
            <SelectItem value="penal">Pénal</SelectItem>
            <SelectItem value="commercial">Commercial</SelectItem>
            <SelectItem value="administratif">Administratif</SelectItem>
            <SelectItem value="autre">Autre</SelectItem>
          </SelectContent>
        </Select>
        {filtresActifs && (
          <Button variant="ghost" onClick={reinitialiserFiltres}>
            Réinitialiser
          </Button>
        )}
      </div>

      {/* ── Liste ───────────────────────────────────────────────── */}
      <Card>
        <CardContent className="p-0">
          {/* Skeleton */}
          {isLoading && <SkeletonTable avecAvatar={true} avecBadge={true} />}

          {/* Empty state */}
          {!isLoading && dossiers.length === 0 && (
            <EmptyState
              icone={FolderOpen}
              titre={filtresActifs ? 'Aucun dossier trouvé' : 'Aucun dossier pour le moment'}
              description={
                filtresActifs
                  ? 'Aucun dossier ne correspond à vos critères. Modifiez ou réinitialisez les filtres.'
                  : 'Ouvrez votre premier dossier pour commencer à gérer vos affaires.'
              }
              action={
                !filtresActifs
                  ? { label: 'Nouveau dossier', onClick: () => setDialogCreer(true), icone: Plus }
                  : undefined
              }
            />
          )}

          {/* Liste */}
          {!isLoading && dossiers.length > 0 && (
            <div className="divide-y">
              {dossiers.map((dossier) => {
                const s = styleStatutDossier(dossier.statut);
                return (
                  <div
                    key={dossier._id}
                    className="flex cursor-pointer items-center gap-4 p-4 transition-colors hover:bg-muted/40"
                    onClick={() => navigate(`/cabinet/dossiers/${dossier._id}`)}
                  >
                    {/* Icône */}
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <Scale className="h-5 w-5 text-primary" />
                    </div>

                    {/* Infos */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-medium">{dossier.titre}</p>
                        <span className="shrink-0 font-mono text-xs text-muted-foreground">
                          {dossier.reference}
                        </span>
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="truncate">{nomClient(dossier)}</span>
                        <span className="hidden sm:inline">·</span>
                        <span className="hidden sm:inline">{libelleTypeDossier(dossier.type)}</span>
                        <span className="hidden sm:inline">·</span>
                        <span className="hidden sm:inline">
                          {formaterDateCourte(dossier.dateOuverture)}
                        </span>
                      </div>
                    </div>

                    {/* Badge statut sémantique */}
                    <span
                      className={cn(
                        'hidden sm:inline-flex items-center gap-1.5 shrink-0',
                        'rounded-full border px-2.5 py-0.5 text-xs font-medium',
                        s.text,
                        s.bg,
                        s.border
                      )}
                    >
                      <span className={cn('h-1.5 w-1.5 rounded-full', s.dot)} />
                      {s.label}
                    </span>

                    {/* Actions */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/cabinet/dossiers/${dossier._id}`);
                          }}
                        >
                          <ChevronRight className="mr-2 h-4 w-4" />
                          Ouvrir
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            setDossierAModifier(dossier);
                          }}
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          Modifier
                        </DropdownMenuItem>
                        {estAdmin && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDossierASupprimer(dossier);
                              }}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Archiver
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>

        {/* Pagination */}
        {meta && meta.totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-4 py-3">
            <p className="text-xs text-muted-foreground">
              Page {meta.page} sur {meta.totalPages} · {meta.total} dossiers
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Précédent
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= meta.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Suivant
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* ── Dialogs ─────────────────────────────────────────────── */}
      <DialogCreerDossier ouvert={dialogCreer} onFermer={() => setDialogCreer(false)} />

      {dossierAModifier && (
        <DialogModifierDossier
          dossier={dossierAModifier}
          onFermer={() => setDossierAModifier(null)}
        />
      )}

      <AlertDialog
        open={!!dossierASupprimer}
        onOpenChange={(o) => !o && setDossierASupprimer(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archiver ce dossier ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le dossier <strong>{dossierASupprimer?.titre}</strong>{' '}
              <span className="font-mono text-xs">({dossierASupprimer?.reference})</span> sera
              archivé. Documents, paiements et événements liés restent accessibles.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => supprimer()}
              disabled={suppression}
            >
              Archiver
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
