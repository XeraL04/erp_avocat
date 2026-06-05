import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { fr, ar } from 'date-fns/locale';
import {
  Wallet,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  FolderOpen,
  WifiOff,
  Banknote,
  CreditCard,
} from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  listerTousPaiements,
  supprimerPaiement,
  nomClient,
  type PaiementPopule,
} from '@/api/paiement.api';
import { useAuthStore } from '@/stores/auth.store';

import {
  getConfigMode,
  formaterMontant,
  type FiltreModeType,
} from '@/components/paiement/paiement.config';
import KpiCardPaiement from '@/components/paiement/KpiCardPaiement';
import DialogCreerPaiement from '@/components/paiement/DialogCreerPaiement';
import DialogModifierPaiement from '@/components/paiement/DialogModifierPaiement';

export default function PaiementsPage() {
  const qc = useQueryClient();
  const utilisateur = useAuthStore((s) => s.utilisateur);
  const peutModifier = utilisateur?.role === 'admin' || utilisateur?.role === 'assistant';
  const peutSupprimer = utilisateur?.role === 'admin';

  const { t, i18n } = useTranslation('paiements');
  const { t: tc } = useTranslation('common');

  const estRTL = i18n.language === 'ar';
  const localeDate = estRTL ? ar : fr;
  const localeMontant = estRTL ? 'ar-DZ' : 'fr-DZ';
  const CONFIG_MODE = useMemo(() => getConfigMode(t), [t]);

  const [filtreMode, setFiltreMode] = useState<FiltreModeType>('tous');
  const [page, setPage] = useState(1);
  const [dialogCreer, setDialogCreer] = useState(false);
  const [paiementEdite, setPaiementEdite] = useState<PaiementPopule | null>(null);
  const [paiementASupprimer, setPaiementASupprimer] = useState<PaiementPopule | null>(null);

  const LIMIT = 20;

  const { data, isLoading, isError } = useQuery({
    queryKey: ['paiements', 'global', filtreMode, page],
    queryFn: () =>
      listerTousPaiements({
        mode: filtreMode !== 'tous' ? filtreMode : undefined,
        page,
        limit: LIMIT,
      }),
    placeholderData: (prev) => prev,
  });

  const paiements = data?.paiements ?? [];
  const stats = data?.stats;
  const meta = data?.meta;

  const invalidate = () => qc.invalidateQueries({ queryKey: ['paiements'] });

  const { mutate: effacer, isPending: suppressionEnCours } = useMutation({
    mutationFn: () => supprimerPaiement(paiementASupprimer!._id),
    onSuccess: () => {
      invalidate();
      toast.success(t('paiement_supprime'));
      setPaiementASupprimer(null);
      setPage(1);
    },
    onError: () => toast.error(tc('error')),
  });

  return (
    <div className="space-y-5">
      {/* ── En-tête ── */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">{t('title')}</h2>
          <p className="text-xs text-muted-foreground">{t('subtitle')}</p>
        </div>
        {peutModifier && (
          <Button size="sm" onClick={() => setDialogCreer(true)}>
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            {t('record_payment')}
          </Button>
        )}
      </div>

      {/* ── KPI ── */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <KpiCardPaiement
            label={t('kpi_total')}
            value={formaterMontant(stats.totalEncaisse, localeMontant)}
            icone={<Wallet className="h-4 w-4" />}
            variante="primary"
          />
          <KpiCardPaiement
            label={t('kpi_cash')}
            value={formaterMontant(stats.cash, localeMontant)}
            icone={<Banknote className="h-4 w-4" />}
            variante="success"
          />
          <KpiCardPaiement
            label={t('kpi_virement')}
            value={formaterMontant(stats.virement, localeMontant)}
            icone={<CreditCard className="h-4 w-4" />}
            variante="primary"
          />
          <KpiCardPaiement
            label={t('kpi_ccp')}
            value={formaterMontant(stats.ccp, localeMontant)}
            icone={<Wallet className="h-4 w-4" />}
            variante="warning"
          />
        </div>
      )}

      {/* ── Filtres ── */}
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={filtreMode}
          onValueChange={(v) => {
            setFiltreMode(v as FiltreModeType);
            setPage(1);
          }}
        >
          <SelectTrigger className="h-9 w-44 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="tous">{t('filter_all_modes')}</SelectItem>
            <SelectItem value="cash">{t('mode_cash')}</SelectItem>
            <SelectItem value="virement">{t('mode_virement')}</SelectItem>
            <SelectItem value="ccp">{t('mode_ccp')}</SelectItem>
          </SelectContent>
        </Select>

        {meta && (
          <p className="text-xs text-muted-foreground">
            {meta.total} {meta.total > 1 ? t('payments_plural') : t('payment_singular')}
          </p>
        )}
      </div>

      {/* ── Erreur réseau ── */}
      {isError && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <WifiOff className="h-6 w-6 text-destructive" aria-hidden="true" />
            </div>
            <p className="text-sm font-medium">{t('load_error')}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => qc.invalidateQueries({ queryKey: ['paiements', 'global'] })}
            >
              {tc('retry')}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── Skeleton ── */}
      {isLoading && (
        <Card>
          <CardContent className="p-0">
            <SkeletonTable avecAvatar={true} avecBadge={false} lignes={5} />
          </CardContent>
        </Card>
      )}

      {/* ── Contenu ── */}
      {!isLoading && !isError && (
        <>
          {paiements.length === 0 && (
            <Card>
              <CardContent className="p-0">
                <EmptyState
                  icone={Wallet}
                  titre={
                    filtreMode !== 'tous'
                      ? `${t('no_payment_mode')} ${
                          CONFIG_MODE[filtreMode as keyof typeof CONFIG_MODE]?.label ?? filtreMode
                        }`
                      : t('no_payments')
                  }
                  description={
                    filtreMode !== 'tous' ? t('no_payment_mode_desc') : t('no_payments_desc')
                  }
                  action={
                    peutModifier && filtreMode === 'tous'
                      ? {
                          label: t('record_payment'),
                          onClick: () => setDialogCreer(true),
                          icone: Plus,
                        }
                      : undefined
                  }
                />
              </CardContent>
            </Card>
          )}

          {paiements.length > 0 && (
            <Card>
              <CardContent className="p-0">
                <div className="divide-y">
                  {paiements.map((p) => {
                    const modeConfig = CONFIG_MODE[p.mode];
                    const ModeIcone = modeConfig?.Icone ?? Wallet;
                    const client = p.dossier?.client;

                    return (
                      <div
                        key={p._id}
                        className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/30 sm:px-5"
                      >
                        <div
                          className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                          style={{
                            backgroundColor: modeConfig?.badgeStyle.backgroundColor,
                            color: modeConfig?.badgeStyle.color,
                          }}
                          aria-hidden="true"
                        >
                          <ModeIcone className="h-3.5 w-3.5" />
                        </div>

                        <div className="min-w-0 flex-1 space-y-0.5">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-sm font-semibold tabular-nums">
                              {formaterMontant(p.montant, localeMontant)}
                            </span>
                            <span
                              className="inline-flex items-center gap-1 rounded-full px-1.5 py-px text-xs font-medium"
                              style={modeConfig?.badgeStyle}
                            >
                              <ModeIcone className="h-3 w-3" aria-hidden="true" />
                              {modeConfig?.label ?? p.mode}
                            </span>
                            {p.reference && (
                              <span className="font-mono text-xs text-muted-foreground">
                                {p.reference}
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                            <span>
                              {format(parseISO(p.date), 'd MMM yyyy', { locale: localeDate })}
                            </span>
                            {p.dossier && (
                              <Link
                                to={`/cabinet/dossiers/${p.dossier._id}`}
                                className="flex items-center gap-1 transition-colors hover:text-foreground"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <FolderOpen className="h-3 w-3 shrink-0" aria-hidden="true" />
                                <span className="font-mono">{p.dossier.reference}</span>
                                {client && (
                                  <span className="hidden sm:inline">· {nomClient(client)}</span>
                                )}
                              </Link>
                            )}
                            {p.honoraire && (
                              <span>
                                {t('honoraire_label')}{' '}
                                {formaterMontant(p.honoraire.montantTotal, localeMontant)}
                              </span>
                            )}
                            {p.note && <span className="max-w-48 truncate italic">{p.note}</span>}
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-0.5">
                          {peutModifier && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              aria-label={`${tc('edit')} ${formaterMontant(p.montant, localeMontant)}`}
                              onClick={() => setPaiementEdite(p)}
                            >
                              <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                            </Button>
                          )}
                          {peutSupprimer && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              aria-label={`${tc('delete')} ${formaterMontant(p.montant, localeMontant)}`}
                              onClick={() => setPaiementASupprimer(p)}
                            >
                              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {meta && meta.totalPages > 1 && (
                  <div className="flex items-center justify-between border-t px-5 py-3">
                    <p className="text-xs text-muted-foreground">
                      {tc('page')} {meta.page} / {meta.totalPages}
                    </p>
                    <div className="flex gap-1.5">
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
          )}
        </>
      )}

      {dialogCreer && (
        <DialogCreerPaiement
          onFermer={() => setDialogCreer(false)}
          onSuccess={() => {
            invalidate();
            setDialogCreer(false);
          }}
        />
      )}

      {paiementEdite && (
        <DialogModifierPaiement
          paiement={paiementEdite}
          onFermer={() => setPaiementEdite(null)}
          onSuccess={() => {
            invalidate();
            setPaiementEdite(null);
          }}
        />
      )}

      <AlertDialog
        open={!!paiementASupprimer}
        onOpenChange={(o) => !o && setPaiementASupprimer(null)}
      >
        <AlertDialogContent dir={estRTL ? 'rtl' : 'ltr'}>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('delete_title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('delete_desc_prefix')}{' '}
              <strong>
                {paiementASupprimer && formaterMontant(paiementASupprimer.montant, localeMontant)}
              </strong>{' '}
              — {t('delete_irreversible')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={suppressionEnCours}>{tc('cancel')}</AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button variant="destructive" disabled={suppressionEnCours} onClick={() => effacer()}>
                {suppressionEnCours && (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                )}
                {suppressionEnCours ? t('deleting') : tc('delete')}
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
