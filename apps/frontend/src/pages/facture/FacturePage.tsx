import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Receipt,
  Search,
  MoreHorizontal,
  Download,
  Pencil,
  Trash2,
  FileCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { useDebounce } from 'use-debounce';
import { useTranslation } from 'react-i18next';

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

import {
  listerFactures,
  supprimerFacture,
  telechargerFacturePDF,
  type Facture,
  type StatutFacture,
} from '@/api/facture.api';
import { cn, styleStatutFacture, formaterMontantDA, formaterDateCourte } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';
import { DialogCreerFacture } from '@/components/facture/DialogCreerFacture';
import { DialogModifierFacture } from '@/components/facture/DialogModifierFacture';

function nomClientFacture(f: Facture): string {
  if (typeof f.client !== 'object' || f.client === null) return '—';
  if (f.client.type === 'morale') return f.client.raisonSociale ?? '—';
  return [f.client.prenom, f.client.nom].filter(Boolean).join(' ') || '—';
}

export default function FacturesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const utilisateur = useAuthStore((s) => s.utilisateur);
  const estAdmin = utilisateur?.role === 'admin';

  const { t, i18n } = useTranslation('factures');
  const { t: tc } = useTranslation('common');
  const estRTL = i18n.language === 'ar';

  // ─── Filtres ──────────────────────────────────────────────────────
  const [filtreStatut, setFiltreStatut] = useState<StatutFacture | 'tous'>('tous');
  const [recherche, setRecherche] = useState('');
  const [page, setPage] = useState(1);
  const [rechercheDebounced] = useDebounce(recherche, 300);

  // ─── Dialogs ──────────────────────────────────────────────────────
  const [dialogCreer, setDialogCreer] = useState(false);
  const [factureAModifier, setFactureAModifier] = useState<Facture | null>(null);
  const [factureASupprimer, setFactureASupprimer] = useState<Facture | null>(null);
  const [telechargementsEnCours, setTelechargementsEnCours] = useState<Set<string>>(new Set());

  const filtresActifs = filtreStatut !== 'tous' || recherche !== '';

  const reinitialiserFiltres = useCallback(() => {
    setFiltreStatut('tous');
    setRecherche('');
    setPage(1);
  }, []);

  // ─── Query ────────────────────────────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ['cabinet', 'factures', filtreStatut, rechercheDebounced, page],
    queryFn: () =>
      listerFactures({
        statut: filtreStatut !== 'tous' ? filtreStatut : undefined,
        q: rechercheDebounced || undefined,
        page,
        limit: 20,
      }),
  });

  const factures = data?.data ?? [];
  const meta = data?.meta;

  // ─── Suppression ──────────────────────────────────────────────────
  const { mutate: supprimer, isPending: suppression } = useMutation({
    mutationFn: () => supprimerFacture(factureASupprimer!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cabinet', 'factures'] });
      toast.success(t('invoice_deleted'));
      setFactureASupprimer(null);
    },
    onError: () => toast.error(t('invoice_delete_error')),
  });

  // ─── Téléchargement PDF ───────────────────────────────────────────
  const handleTelechargement = async (facture: Facture) => {
    setTelechargementsEnCours((prev) => new Set(prev).add(facture.id));
    try {
      await telechargerFacturePDF(facture.id, facture.numero);
      toast.success(`${facture.numero}.pdf ${t('pdf_downloaded')}`);
    } catch {
      toast.error(t('pdf_download_error'));
    } finally {
      setTelechargementsEnCours((prev) => {
        const next = new Set(prev);
        next.delete(facture.id);
        return next;
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* ── En-tête ── */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{t('title')}</h2>
          <p className="text-sm text-muted-foreground">
            {meta
              ? estRTL
                ? `${meta.total} ${meta.total > 1 ? 'فواتير' : 'فاتورة'} في المجموع`
                : `${meta.total} facture${meta.total > 1 ? 's' : ''} au total`
              : t('subtitle')}
          </p>
        </div>
        <Button onClick={() => setDialogCreer(true)}>
          <Plus className="h-4 w-4" />
          {t('new_invoice')}
        </Button>
      </div>

      {/* ── Filtres ── */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search
            className={`absolute top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground ${estRTL ? 'right-3' : 'left-3'}`}
          />
          <Input
            placeholder={t('search_placeholder')}
            className={estRTL ? 'pr-9' : 'pl-9'}
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
            setFiltreStatut(v as StatutFacture | 'tous');
            setPage(1);
          }}
        >
          <SelectTrigger className="w-full sm:w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="tous">{t('all_statuses')}</SelectItem>
            <SelectItem value="brouillon">{t('status_draft')}</SelectItem>
            <SelectItem value="emise">{t('status_issued')}</SelectItem>
            <SelectItem value="payee">{t('status_paid')}</SelectItem>
          </SelectContent>
        </Select>
        {filtresActifs && (
          <Button variant="ghost" onClick={reinitialiserFiltres}>
            {estRTL ? 'إعادة ضبط' : 'Réinitialiser'}
          </Button>
        )}
      </div>

      {/* ── Liste ── */}
      <Card>
        <CardContent className="p-0">
          {isLoading && <SkeletonTable lignes={5} avecAvatar={true} avecBadge={true} />}

          {!isLoading && factures.length === 0 && (
            <EmptyState
              icone={Receipt}
              titre={filtresActifs ? t('no_invoices_filtered') : t('no_invoices')}
              description={filtresActifs ? t('no_invoices_filtered_desc') : t('no_invoices_desc')}
              action={
                !filtresActifs
                  ? { label: t('new_invoice'), onClick: () => setDialogCreer(true), icone: Plus }
                  : undefined
              }
            />
          )}

          {!isLoading && factures.length > 0 && (
            <div className="divide-y">
              {factures.map((facture) => {
                const s = styleStatutFacture(facture.statut);
                return (
                  <div
                    key={facture.id}
                    onClick={() => navigate(`/cabinet/factures/${facture.id}`)}
                    className="flex cursor-pointer items-center gap-4 p-4 transition-colors hover:bg-muted/40"
                  >
                    {/* Icône */}
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <FileCheck className="h-5 w-5 text-primary" />
                    </div>

                    {/* Infos */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-mono text-sm font-semibold">{facture.numero}</p>
                        <span className="text-muted-foreground">·</span>
                        <p className="truncate text-sm font-medium">{nomClientFacture(facture)}</p>
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                        <span>
                          {typeof facture.dossier === 'object' && facture.dossier !== null
                            ? facture.dossier.reference
                            : '—'}
                        </span>
                        <span className="hidden sm:inline">·</span>
                        <span className="hidden sm:inline">
                          {formaterDateCourte(facture.dateEmission)}
                        </span>
                      </div>
                    </div>

                    {/* Montant */}
                    <p className="hidden shrink-0 text-sm font-semibold tabular-nums sm:block">
                      {formaterMontantDA(facture.montant)}
                    </p>

                    {/* Badge statut */}
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
                          aria-label={`${tc('actions')} ${facture.numero}`}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align={estRTL ? 'start' : 'end'}>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/cabinet/factures/${facture.id}`);
                          }}
                        >
                          <FileCheck className="h-4 w-4" />
                          {t('action_view')}
                        </DropdownMenuItem>
                        {facture.statut !== 'payee' && (
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              setFactureAModifier(facture);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                            {facture.statut === 'brouillon'
                              ? tc('edit')
                              : t('action_change_status')}
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          disabled={telechargementsEnCours.has(facture.id)}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTelechargement(facture);
                          }}
                        >
                          <Download className="h-4 w-4" />
                          {telechargementsEnCours.has(facture.id)
                            ? t('downloading')
                            : t('action_download_pdf')}
                        </DropdownMenuItem>
                        {facture.statut === 'brouillon' && estAdmin && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                setFactureASupprimer(facture);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                              {tc('delete')}
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

          {/* Pagination */}
          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-between border-t px-4 py-3">
              <p className="text-xs text-muted-foreground">
                {tc('page')} {meta.page} {estRTL ? 'من' : 'sur'} {meta.totalPages}
                {' · '}
                {meta.total}{' '}
                {estRTL
                  ? meta.total > 1
                    ? 'فواتير'
                    : 'فاتورة'
                  : `facture${meta.total > 1 ? 's' : ''}`}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  {tc('previous')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= meta.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  {tc('next')}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Dialogs ── */}
      <DialogCreerFacture ouvert={dialogCreer} onFermer={() => setDialogCreer(false)} />
      {factureAModifier && (
        <DialogModifierFacture
          facture={factureAModifier}
          onFermer={() => setFactureAModifier(null)}
        />
      )}

      <AlertDialog
        open={!!factureASupprimer}
        onOpenChange={(o) => !o && setFactureASupprimer(null)}
      >
        <AlertDialogContent dir={estRTL ? 'rtl' : 'ltr'}>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('delete_title')}</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{factureASupprimer?.numero}</strong> {t('delete_desc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tc('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => supprimer()}
              disabled={suppression}
            >
              {tc('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
