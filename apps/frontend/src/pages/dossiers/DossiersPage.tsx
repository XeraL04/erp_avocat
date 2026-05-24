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
import { useTranslation } from 'react-i18next';

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

  const { t, i18n } = useTranslation('dossiers');
  const { t: tc } = useTranslation('common');
  const estRTL = i18n.language === 'ar';

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
      toast.success(t('archived'));
      setDossierASupprimer(null);
    },
    onError: () => toast.error(tc('error')),
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
      {/* ── En-tête ── */}
      <div
        className="animate-fade-up opacity-0 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"
        style={{ animationDelay: '0ms', animationFillMode: 'forwards' }}
      >
        <div className="space-y-0.5">
          <h2 className="text-xl font-semibold tracking-tight">{t('title')}</h2>
          <p className="text-sm text-muted-foreground">
            {meta
              ? estRTL
                ? `${meta.total} ${meta.total === 1 ? 'ملف' : 'ملفات'} في المجموع`
                : `${meta.total} dossier${meta.total > 1 ? 's' : ''} au total`
              : estRTL
                ? 'إدارة قضاياك القانونية'
                : 'Gestion de vos affaires juridiques'}
          </p>
        </div>
        <Button size="sm" onClick={() => setDialogCreer(true)}>
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          {t('new_dossier')}
        </Button>
      </div>

      {/* ── Filtres ── */}
      <div
        className="animate-fade-up opacity-0 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center"
        style={{ animationDelay: '60ms', animationFillMode: 'forwards' }}
      >
        {/* Recherche */}
        <div className="relative flex-1 sm:min-w-56">
          <Search
            className={`pointer-events-none absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground ${estRTL ? 'right-3' : 'left-3'}`}
            aria-hidden="true"
          />
          <Input
            placeholder={
              estRTL ? 'المرجع، الخصم، رقم الملف…' : 'Référence, adversaire, n° dossier…'
            }
            className={`h-9 text-sm ${estRTL ? 'pr-8.5 pl-9' : 'pl-8.5 pr-9'}`}
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
              className={`absolute top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground ${estRTL ? 'left-2.5' : 'right-2.5'}`}
              aria-label={estRTL ? 'مسح البحث' : 'Effacer la recherche'}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Filtre statut */}
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
            <SelectItem value="tous">{t('all_status')}</SelectItem>
            {(Object.entries(LABELS_STATUT_DOSSIER) as [StatutDossier, string][]).map(
              ([val, label]) => (
                <SelectItem key={val} value={val}>
                  {label}
                </SelectItem>
              )
            )}
          </SelectContent>
        </Select>

        {/* Filtre type affaire */}
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
            <SelectItem value="tous">{t('all_types')}</SelectItem>
            {(Object.entries(LABELS_TYPE_AFFAIRE) as [TypeAffaire, string][]).map(
              ([val, label]) => (
                <SelectItem key={val} value={val}>
                  {label}
                </SelectItem>
              )
            )}
          </SelectContent>
        </Select>

        {/* Filtre institution */}
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
            <SelectItem value="tous">{estRTL ? 'كل الجهات' : 'Toutes les institutions'}</SelectItem>
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

        {/* Reset filtres */}
        {filtresActifs && (
          <Button
            variant="ghost"
            size="sm"
            className="h-9 shrink-0 text-muted-foreground hover:text-foreground"
            onClick={reinitialiserFiltres}
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
            {estRTL ? 'إعادة ضبط' : 'Réinitialiser'}
          </Button>
        )}
      </div>

      {/* ── Tableau ── */}
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
                titre={filtresActifs ? t('no_dossiers_filtered') : t('no_dossiers')}
                description={
                  filtresActifs
                    ? estRTL
                      ? 'لا يوجد ملف يطابق معايير البحث. عدّل الفلاتر أو أعد ضبطها.'
                      : 'Aucun dossier ne correspond à vos critères. Modifiez ou réinitialisez les filtres.'
                    : t('no_dossiers_desc')
                }
                action={
                  !filtresActifs
                    ? { label: t('new_dossier'), onClick: () => setDialogCreer(true), icone: Plus }
                    : undefined
                }
              />
            )}

            {!isLoading && dossiers.length > 0 && (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="pl-5 text-xs">{t('reference')}</TableHead>
                      <TableHead className="hidden text-xs md:table-cell">
                        {estRTL ? 'الأطراف' : 'Parties'}
                      </TableHead>
                      <TableHead className="hidden text-xs lg:table-cell">{t('type')}</TableHead>
                      <TableHead className="hidden text-xs lg:table-cell">
                        {estRTL ? 'الجهة' : 'Institution'}
                      </TableHead>
                      <TableHead className="hidden text-xs sm:table-cell">
                        {t('opening_date')}
                      </TableHead>
                      <TableHead className="hidden text-xs sm:table-cell">{tc('status')}</TableHead>
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
                                  aria-label={`${tc('actions')} ${dossier.reference}`}
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent
                                align={estRTL ? 'start' : 'end'}
                                className="w-40"
                              >
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/cabinet/dossiers/${dossier._id}`);
                                  }}
                                >
                                  <ChevronRight
                                    className={`h-3.5 w-3.5 ${estRTL ? 'rotate-180' : ''}`}
                                  />
                                  {estRTL ? 'فتح' : 'Ouvrir'}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDossierAModifier(dossier);
                                  }}
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                  {tc('edit')}
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
                                      <Trash2 className="h-3.5 w-3.5" />
                                      {estRTL ? 'أرشفة' : 'Archiver'}
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

          {/* ── Pagination ── */}
          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-between border-t px-4 py-3">
              <p className="text-xs text-muted-foreground">
                {tc('page')} {meta.page} {tc('of')} {meta.totalPages}
                <span className="mx-1.5 text-muted-foreground/40">·</span>
                {meta.total}{' '}
                {estRTL
                  ? meta.total === 1
                    ? 'ملف'
                    : 'ملفات'
                  : `dossier${meta.total > 1 ? 's' : ''}`}
              </p>
              <div className="flex gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2.5 text-xs"
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  {tc('previous')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2.5 text-xs"
                  disabled={page >= meta.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  {tc('next')}
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* ── Dialogs ── */}
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
        <AlertDialogContent dir={estRTL ? 'rtl' : 'ltr'}>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('archive_title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {dossierASupprimer && (
                <>
                  {estRTL ? 'ملف ' : 'Le dossier '}
                  <strong>{nomClient(dossierASupprimer)}</strong> c/{' '}
                  <strong>{dossierASupprimer.adversaire}</strong>{' '}
                  <span className="font-mono text-xs">({dossierASupprimer.reference})</span>{' '}
                  {t('archive_warning')}
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={suppression}>{tc('cancel')}</AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button variant="destructive" disabled={suppression} onClick={() => supprimer()}>
                {suppression
                  ? estRTL
                    ? 'جاري الأرشفة…'
                    : 'Archivage…'
                  : estRTL
                    ? 'أرشفة'
                    : 'Archiver'}
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
