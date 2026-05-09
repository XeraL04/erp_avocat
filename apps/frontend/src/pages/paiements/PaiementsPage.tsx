import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
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
import { formaterMontantDA } from '@/lib/utils';

import { CONFIG_MODE, type FiltreModeType } from '@/components/paiement/paiement.config';
import KpiCardPaiement from '@/components/paiement/KpiCardPaiement';
import DialogCreerPaiement from '@/components/paiement/DialogCreerPaiement';
import DialogModifierPaiement from '@/components/paiement/DialogModifierPaiement';

export default function PaiementsPage() {
  const qc = useQueryClient();
  const utilisateur = useAuthStore((s) => s.utilisateur);
  const peutModifier = utilisateur?.role === 'admin' || utilisateur?.role === 'assistant';
  const peutSupprimer = utilisateur?.role === 'admin';

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
      toast.success('Paiement supprimé');
      setPaiementASupprimer(null);
      setPage(1);
    },
    onError: () => toast.error('Impossible de supprimer'),
  });

  return (
    <div className="space-y-5">
      {/* ── En-tête ─────────────────────────────────────────────── */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Paiements</h2>
          <p className="text-xs text-muted-foreground">
            Encaissements et suivi financier du cabinet
          </p>
        </div>
        {peutModifier && (
          <Button size="sm" onClick={() => setDialogCreer(true)}>
            <Plus className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
            Enregistrer un paiement
          </Button>
        )}
      </div>

      {/* ── KPI ─────────────────────────────────────────────────── */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <KpiCardPaiement
            label="Total encaissé"
            value={formaterMontantDA(stats.totalEncaisse)}
            icone={<Wallet className="h-4 w-4" />}
            variante="primary"
          />
          <KpiCardPaiement
            label="Espèces"
            value={formaterMontantDA(stats.cash)}
            icone={<Banknote className="h-4 w-4" />}
            variante="success"
          />
          <KpiCardPaiement
            label="Virement"
            value={formaterMontantDA(stats.virement)}
            icone={<CreditCard className="h-4 w-4" />}
            variante="primary"
          />
          <KpiCardPaiement
            label="CCP"
            value={formaterMontantDA(stats.ccp)}
            icone={<Wallet className="h-4 w-4" />}
            variante="warning"
          />
        </div>
      )}

      {/* ── Filtres ─────────────────────────────────────────────── */}
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
            <SelectItem value="tous">Tous les modes</SelectItem>
            <SelectItem value="cash">Espèces</SelectItem>
            <SelectItem value="virement">Virement</SelectItem>
            <SelectItem value="ccp">CCP</SelectItem>
          </SelectContent>
        </Select>
        {meta && (
          <p className="text-xs text-muted-foreground">
            {meta.total} paiement{meta.total > 1 ? 's' : ''}
          </p>
        )}
      </div>

      {/* ── Erreur réseau ───────────────────────────────────────── */}
      {isError && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <WifiOff className="h-6 w-6 text-destructive" aria-hidden="true" />
            </div>
            <p className="text-sm font-medium">Impossible de charger les paiements</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => qc.invalidateQueries({ queryKey: ['paiements', 'global'] })}
            >
              Réessayer
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── Skeleton ────────────────────────────────────────────── */}
      {isLoading && (
        <Card>
          <CardContent className="p-0">
            <SkeletonTable avecAvatar={true} avecBadge={false} lignes={5} />
          </CardContent>
        </Card>
      )}

      {/* ── Contenu ─────────────────────────────────────────────── */}
      {!isLoading && !isError && (
        <>
          {/* Empty state */}
          {paiements.length === 0 && (
            <Card>
              <CardContent className="p-0">
                <EmptyState
                  icone={Wallet}
                  titre={
                    filtreMode !== 'tous'
                      ? `Aucun paiement en ${CONFIG_MODE[filtreMode as keyof typeof CONFIG_MODE]?.label ?? filtreMode}`
                      : 'Aucun paiement enregistré'
                  }
                  description={
                    filtreMode !== 'tous'
                      ? 'Aucun paiement ne correspond à ce mode. Changez le filtre.'
                      : 'Commencez par enregistrer le premier encaissement du cabinet.'
                  }
                  action={
                    peutModifier && filtreMode === 'tous'
                      ? {
                          label: 'Enregistrer un paiement',
                          onClick: () => setDialogCreer(true),
                          icone: Plus,
                        }
                      : undefined
                  }
                />
              </CardContent>
            </Card>
          )}

          {/* Liste */}
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
                        {/* Icône mode */}
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

                        {/* Infos */}
                        <div className="min-w-0 flex-1 space-y-0.5">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-sm font-semibold tabular-nums">
                              {formaterMontantDA(p.montant)}
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
                            <span>{format(parseISO(p.date), 'd MMM yyyy', { locale: fr })}</span>
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
                              <span>Honoraire {formaterMontantDA(p.honoraire.montantTotal)}</span>
                            )}
                            {p.note && <span className="max-w-48 truncate italic">{p.note}</span>}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex shrink-0 items-center gap-0.5">
                          {peutModifier && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              aria-label={`Modifier le paiement de ${formaterMontantDA(p.montant)}`}
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
                              aria-label={`Supprimer le paiement de ${formaterMontantDA(p.montant)}`}
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

                {/* Pagination */}
                {meta && meta.totalPages > 1 && (
                  <div className="flex items-center justify-between border-t px-5 py-3">
                    <p className="text-xs text-muted-foreground">
                      Page {meta.page} / {meta.totalPages}
                    </p>
                    <div className="flex gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page <= 1}
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
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* ── Dialogs ─────────────────────────────────────────────── */}
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

      {/* ── Confirmation suppression ─────────────────────────────── */}
      <AlertDialog
        open={!!paiementASupprimer}
        onOpenChange={(o) => !o && setPaiementASupprimer(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce paiement ?</AlertDialogTitle>
            <AlertDialogDescription>
              Paiement de{' '}
              <strong>{paiementASupprimer && formaterMontantDA(paiementASupprimer.montant)}</strong>{' '}
              — cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={suppressionEnCours}>Annuler</AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button variant="destructive" disabled={suppressionEnCours} onClick={() => effacer()}>
                {suppressionEnCours && (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                )}
                {suppressionEnCours ? 'Suppression…' : 'Supprimer'}
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
