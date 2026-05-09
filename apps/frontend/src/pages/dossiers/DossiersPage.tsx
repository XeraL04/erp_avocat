import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Plus,
  Search,
  FolderOpen,
  MoreHorizontal,
  Pencil,
  Trash2,
  ChevronRight,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { useDebounce } from 'use-debounce';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
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
import type {
  Dossier,
  StatutDossier,
  TypeAffaire,
  InstitutionDossier,
  ClientPopule,
} from '@/types';
import {
  nomAffiche,
  LABELS_STATUT_DOSSIER,
  LABELS_TYPE_AFFAIRE,
  LABELS_INSTITUTION,
  GROUPES_INSTITUTION,
} from '@/types';
import { styleStatutDossier, formaterDateCourte, cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';
import DialogCreerDossier from '@/components/dossier/DialogCreerDossier';
import DialogModifierDossier from '@/components/dossier/DialogModifierDossier';

// ─── Types state de navigation ────────────────────────────────────────────────
interface LocationState {
  ouvrirCreerDossier?: boolean;
  clientId?: string;
}

export default function DossiersPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const utilisateur = useAuthStore((s) => s.utilisateur);
  const estAdmin = utilisateur?.role === 'admin';

  // ─── Filtres ────────────────────────────────────────────────────
  const [recherche, setRecherche] = useState('');
  const [filtreStatut, setFiltreStatut] = useState<StatutDossier | 'tous'>('tous');
  const [filtreType, setFiltreType] = useState<TypeAffaire | 'tous'>('tous');
  const [filtreInstitution, setFiltreInstitution] = useState<InstitutionDossier | 'tous'>('tous');
  const [page, setPage] = useState(1);
  const [rechercheDebounced] = useDebounce(recherche, 300);

  // ─── Dialogs ────────────────────────────────────────────────────
  const [dialogCreer, setDialogCreer] = useState(false);
  const [clientPreselectionne, setClientPreselectionne] = useState<string | undefined>();
  const [dossierAModifier, setDossierAModifier] = useState<Dossier | null>(null);
  const [dossierASupprimer, setDossierASupprimer] = useState<Dossier | null>(null);

  // ─── Ouverture automatique depuis DialogCreerClient ─────────────
  useEffect(() => {
    const state = location.state as LocationState | null;
    if (state?.ouvrirCreerDossier) {
      setTimeout(() => {
        setClientPreselectionne(state.clientId);
        setDialogCreer(true);
      }, 0);
      window.history.replaceState({}, '');
    }
  }, [location.state]);

  // ─── Query ──────────────────────────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: [
      'cabinet',
      'dossiers',
      rechercheDebounced,
      filtreStatut,
      filtreType,
      filtreInstitution,
      page,
    ],
    queryFn: () =>
      listerDossiers({
        q: rechercheDebounced || undefined,
        statut: filtreStatut === 'tous' ? undefined : filtreStatut,
        typeAffaire: filtreType === 'tous' ? undefined : filtreType,
        institution: filtreInstitution === 'tous' ? undefined : filtreInstitution,
        page,
        limit: 20,
      }),
  });

  const dossiers = data?.data ?? [];
  const meta = data?.meta;
  const filtresActifs = !!(
    recherche ||
    filtreStatut !== 'tous' ||
    filtreType !== 'tous' ||
    filtreInstitution !== 'tous'
  );

  // ─── Suppression ────────────────────────────────────────────────
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
    setFiltreInstitution('tous');
    setPage(1);
  }, []);

  const nomClient = (dossier: Dossier): string => {
    if (typeof dossier.clientId === 'object' && dossier.clientId !== null)
      return nomAffiche(dossier.clientId as ClientPopule);
    return '—';
  };

  const fermerDialogCreer = () => {
    setDialogCreer(false);
    setClientPreselectionne(undefined);
  };

  return (
    <div className="space-y-6 px-1">
      {/* ── En-tête ────────────────────────────────────────────── */}
      <div
        className="animate-fade-up opacity-0 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"
        style={{ animationDelay: '0ms', animationFillMode: 'forwards' }}
      >
        <div className="space-y-0.5">
          <h2 className="text-xl font-semibold tracking-tight">Dossiers</h2>
          <p className="text-sm text-muted-foreground">
            {meta
              ? `${meta.total} dossier${meta.total > 1 ? 's' : ''} au total`
              : 'Gestion de vos affaires juridiques'}
          </p>
        </div>
        <Button size="sm" onClick={() => setDialogCreer(true)}>
          <Plus className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
          Nouveau dossier
        </Button>
      </div>

      {/* ── Filtres ────────────────────────────────────────────── */}
      <div
        className="animate-fade-up opacity-0 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center"
        style={{ animationDelay: '60ms', animationFillMode: 'forwards' }}
      >
        {/* Recherche */}
        <div className="relative flex-1 sm:min-w-56">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            placeholder="Référence, adversaire, n° dossier…"
            className="h-9 pl-8.5 pr-9 text-sm"
            value={recherche}
            onChange={(e) => {
              setRecherche(e.target.value);
              setPage(1);
            }}
          />
          {recherche && (
            <button
              onClick={() => {
                setRecherche('');
                setPage(1);
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground"
              aria-label="Effacer la recherche"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Statut */}
        <Select
          value={filtreStatut}
          onValueChange={(v) => {
            setFiltreStatut(v as StatutDossier | 'tous');
            setPage(1);
          }}
        >
          <SelectTrigger className="h-9 w-full text-sm sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="tous">Tous les statuts</SelectItem>
            {(Object.entries(LABELS_STATUT_DOSSIER) as [StatutDossier, string][]).map(
              ([val, label]) => (
                <SelectItem key={val} value={val}>
                  {label}
                </SelectItem>
              )
            )}
          </SelectContent>
        </Select>

        {/* Type affaire */}
        <Select
          value={filtreType}
          onValueChange={(v) => {
            setFiltreType(v as TypeAffaire | 'tous');
            setPage(1);
          }}
        >
          <SelectTrigger className="h-9 w-full text-sm sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="tous">Tous les types</SelectItem>
            {(Object.entries(LABELS_TYPE_AFFAIRE) as [TypeAffaire, string][]).map(
              ([val, label]) => (
                <SelectItem key={val} value={val}>
                  {label}
                </SelectItem>
              )
            )}
          </SelectContent>
        </Select>

        {/* Institution */}
        <Select
          value={filtreInstitution}
          onValueChange={(v) => {
            setFiltreInstitution(v as InstitutionDossier | 'tous');
            setPage(1);
          }}
        >
          <SelectTrigger className="h-9 w-full text-sm sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="tous">Toutes les institutions</SelectItem>
            {GROUPES_INSTITUTION.map((groupe) => (
              <SelectGroup key={groupe.label}>
                <SelectLabel>{groupe.label}</SelectLabel>
                {groupe.options.map((val) => (
                  <SelectItem key={val} value={val}>
                    {LABELS_INSTITUTION[val]}
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>

        {/* Reset */}
        {filtresActifs && (
          <Button
            variant="ghost"
            size="sm"
            className="h-9 shrink-0 text-muted-foreground hover:text-foreground"
            onClick={reinitialiserFiltres}
          >
            <X className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
            Réinitialiser
          </Button>
        )}
      </div>

      {/* ── Tableau ────────────────────────────────────────────── */}
      <div
        className="animate-fade-up opacity-0"
        style={{ animationDelay: '120ms', animationFillMode: 'forwards' }}
      >
        <Card>
          <CardContent className="p-0">
            {isLoading && <SkeletonTable avecAvatar={false} avecBadge={true} />}

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

            {!isLoading && dossiers.length > 0 && (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="pl-5 text-xs">Référence</TableHead>
                      <TableHead className="hidden text-xs md:table-cell">Parties</TableHead>
                      <TableHead className="hidden text-xs lg:table-cell">Type</TableHead>
                      <TableHead className="hidden text-xs lg:table-cell">Institution</TableHead>
                      <TableHead className="hidden text-xs sm:table-cell">Ouverture</TableHead>
                      <TableHead className="hidden text-xs sm:table-cell">Statut</TableHead>
                      <TableHead className="w-12 pr-4" />
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {dossiers.map((dossier, i) => {
                      const s = styleStatutDossier(dossier.statut);
                      return (
                        <TableRow
                          key={dossier._id}
                          className="animate-fade-up opacity-0 cursor-pointer transition-colors"
                          style={{
                            animationDelay: `${160 + i * 30}ms`,
                            animationFillMode: 'forwards',
                          }}
                          onClick={() => navigate(`/cabinet/dossiers/${dossier._id}`)}
                        >
                          {/* Référence */}
                          <TableCell className="pl-5">
                            <p className="font-mono text-xs font-semibold text-foreground">
                              {dossier.reference}
                            </p>
                            {dossier.dossierNumero && (
                              <p className="mt-0.5 text-[11px] text-muted-foreground">
                                N° {dossier.dossierNumero}
                              </p>
                            )}
                          </TableCell>

                          {/* Parties */}
                          <TableCell className="hidden md:table-cell">
                            <p className="text-sm font-medium leading-tight">
                              {nomClient(dossier)}
                            </p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              c/{' '}
                              <span className="font-medium text-foreground/80">
                                {dossier.adversaire}
                              </span>
                            </p>
                          </TableCell>

                          {/* Type */}
                          <TableCell className="hidden lg:table-cell">
                            {dossier.typeAffaire ? (
                              <span className="text-xs text-muted-foreground">
                                {LABELS_TYPE_AFFAIRE[dossier.typeAffaire]}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground/30">—</span>
                            )}
                          </TableCell>

                          {/* Institution */}
                          <TableCell className="hidden lg:table-cell">
                            {dossier.institution ? (
                              <span className="text-xs text-muted-foreground">
                                {LABELS_INSTITUTION[dossier.institution]}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground/30">—</span>
                            )}
                          </TableCell>

                          {/* Date ouverture */}
                          <TableCell className="hidden sm:table-cell">
                            <span className="text-xs tabular-nums text-muted-foreground">
                              {formaterDateCourte(dossier.dateOuverture)}
                            </span>
                          </TableCell>

                          {/* Statut */}
                          <TableCell className="hidden sm:table-cell">
                            <span
                              className={cn(
                                'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium',
                                s.text,
                                s.bg,
                                s.border
                              )}
                            >
                              <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', s.dot)} />
                              {s.label}
                            </span>
                          </TableCell>

                          {/* Actions */}
                          <TableCell className="pr-3 text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                  onClick={(e) => e.stopPropagation()}
                                  aria-label="Actions sur ce dossier"
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-40">
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/cabinet/dossiers/${dossier._id}`);
                                  }}
                                >
                                  <ChevronRight className="mr-2 h-3.5 w-3.5" />
                                  Ouvrir
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDossierAModifier(dossier);
                                  }}
                                >
                                  <Pencil className="mr-2 h-3.5 w-3.5" />
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
                                      <Trash2 className="mr-2 h-3.5 w-3.5" />
                                      Archiver
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>

          {/* ── Pagination ──────────────────────────────────────── */}
          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-between border-t px-4 py-3">
              <p className="text-xs text-muted-foreground">
                Page {meta.page} sur {meta.totalPages}
                <span className="mx-1.5 text-muted-foreground/40">·</span>
                {meta.total} dossier{meta.total > 1 ? 's' : ''}
              </p>
              <div className="flex gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2.5 text-xs"
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Précédent
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2.5 text-xs"
                  disabled={page >= meta.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Suivant
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* ── Dialogs ─────────────────────────────────────────────── */}
      <DialogCreerDossier
        ouvert={dialogCreer}
        onFermer={fermerDialogCreer}
        clientPreselectionne={clientPreselectionne}
      />

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
              {dossierASupprimer && (
                <>
                  Le dossier <strong>{nomClient(dossierASupprimer)}</strong> c/{' '}
                  <strong>{dossierASupprimer.adversaire}</strong>{' '}
                  <span className="font-mono text-xs">({dossierASupprimer.reference})</span> sera
                  archivé. Documents, paiements et événements liés restent accessibles.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={suppression}>Annuler</AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button variant="destructive" disabled={suppression} onClick={() => supprimer()}>
                {suppression ? 'Archivage…' : 'Archiver'}
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
