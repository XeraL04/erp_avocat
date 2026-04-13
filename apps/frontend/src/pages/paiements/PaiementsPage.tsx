// src/pages/cabinet/PaiementsPage.tsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Wallet, Plus, Pencil, Trash2, Loader2, FolderOpen, WifiOff, Banknote, CreditCard } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

import { listerTousPaiements, supprimerPaiement, nomClient, type PaiementPopule } from '@/api/paiement.api';
import { useAuthStore } from '@/stores/auth.store';

import { CONFIG_MODE, FiltreModeType, formaterMontant } from '@/components/paiement/paiement.config';
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
    queryFn: () => listerTousPaiements({ mode: filtreMode !== 'tous' ? filtreMode : undefined, page, limit: LIMIT }),
    placeholderData: (prev) => prev,
  });

  const paiements = data?.paiements ?? [];
  const stats = data?.stats;
  const meta = data?.meta;

  const invalidate = () => qc.invalidateQueries({ queryKey: ['paiements'] });

  const { mutate: effacer, isPending: suppressionEnCours } = useMutation({
    mutationFn: () => supprimerPaiement(paiementASupprimer!._id),
    onSuccess: () => { invalidate(); toast.success('Paiement supprimé'); setPaiementASupprimer(null); },
    onError: () => toast.error('Impossible de supprimer'),
  });

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Paiements</h2>
          <p className="text-sm text-muted-foreground">Encaissements et suivi financier du cabinet</p>
        </div>
        {peutModifier && (
          <Button size="sm" onClick={() => setDialogCreer(true)}>
            <Plus className="mr-1.5 h-4 w-4" /> Enregistrer un paiement
          </Button>
        )}
      </div>

      {/* KPI */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <KpiCardPaiement label="Total encaissé" value={formaterMontant(stats.totalEncaisse)} icone={<Wallet className="h-4 w-4" />} couleur="text-primary" bg="bg-primary/10" />
          <KpiCardPaiement label="Espèces" value={formaterMontant(stats.cash)} icone={<Banknote className="h-4 w-4" />} couleur="text-green-600 dark:text-green-400" bg="bg-green-100 dark:bg-green-950/30" />
          <KpiCardPaiement label="Virement" value={formaterMontant(stats.virement)} icone={<CreditCard className="h-4 w-4" />} couleur="text-blue-600 dark:text-blue-400" bg="bg-blue-100 dark:bg-blue-950/30" />
          <KpiCardPaiement label="CCP" value={formaterMontant(stats.ccp)} icone={<Wallet className="h-4 w-4" />} couleur="text-purple-600 dark:text-purple-400" bg="bg-purple-100 dark:bg-purple-950/30" />
        </div>
      )}

      {/* Filtres */}
      <div className="flex flex-wrap items-center gap-2">
        <Select value={filtreMode} onValueChange={(v) => { setFiltreMode(v as FiltreModeType); setPage(1); }}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="tous">Tous les modes</SelectItem>
            <SelectItem value="cash">💵 Espèces</SelectItem>
            <SelectItem value="virement">🏦 Virement</SelectItem>
            <SelectItem value="ccp">📮 CCP</SelectItem>
          </SelectContent>
        </Select>
        {meta && <p className="text-sm text-muted-foreground">{meta.total} paiement{meta.total > 1 ? 's' : ''}</p>}
      </div>

      {/* Erreur */}
      {isError && (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
              <WifiOff className="h-7 w-7 text-destructive" />
            </div>
            <p className="font-medium">Impossible de charger les paiements</p>
            <Button variant="outline" onClick={() => qc.invalidateQueries({ queryKey: ['paiements', 'global'] })}>
              Réessayer
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Skeleton */}
      {isLoading && (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}
        </div>
      )}

      {/* Liste */}
      {!isLoading && !isError && (
        <>
          {paiements.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center text-muted-foreground">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                <Wallet className="h-7 w-7 opacity-40" />
              </div>
              <div>
                <p className="font-medium text-foreground">Aucun paiement enregistré</p>
                <p className="mt-1 text-sm">Commencez par enregistrer un premier paiement</p>
              </div>
              {peutModifier && (
                <Button variant="outline" size="sm" onClick={() => setDialogCreer(true)}>
                  <Plus className="mr-1.5 h-4 w-4" /> Enregistrer un paiement
                </Button>
              )}
            </div>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="divide-y">
                  {paiements.map((p) => {
                    const mode = CONFIG_MODE[p.mode];
                    const client = p.dossier?.client;
                    return (
                      <div key={p._id} className="flex items-start gap-3 px-4 py-4 transition-colors hover:bg-muted/30 sm:px-6">
                        <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${mode.badge}`}>
                          {mode.icone}
                        </div>
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-base font-semibold tabular-nums">{formaterMontant(p.montant)}</span>
                            <Badge variant="secondary" className={`px-1.5 py-0 text-xs ${mode.badge}`}>{mode.label}</Badge>
                            {p.reference && <span className="font-mono text-xs text-muted-foreground">{p.reference}</span>}
                          </div>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                            <span>{format(parseISO(p.date), 'd MMM yyyy', { locale: fr })}</span>
                            {p.dossier && (
                              <Link to={`/cabinet/dossiers/${p.dossier._id}`} className="flex items-center gap-1 transition-colors hover:text-foreground" onClick={(e) => e.stopPropagation()}>
                                <FolderOpen className="h-3 w-3 shrink-0" />
                                <span className="font-mono">{p.dossier.reference}</span>
                                {client && <span className="hidden sm:inline">· {nomClient(client)}</span>}
                              </Link>
                            )}
                            {p.honoraire && <span>Honoraire {formaterMontant(p.honoraire.montantTotal)}</span>}
                            {p.note && <span className="max-w-50 truncate italic">{p.note}</span>}
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-0.5">
                          {peutModifier && (
                            <Button variant="ghost" size="icon" className="h-8 w-8" title="Modifier" onClick={() => setPaiementEdite(p)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                          {peutSupprimer && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" title="Supprimer" onClick={() => setPaiementASupprimer(p)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {meta && meta.totalPages > 1 && (
                  <>
                    <Separator />
                    <div className="flex items-center justify-between px-6 py-3">
                      <p className="text-xs text-muted-foreground">Page {meta.page} / {meta.totalPages}</p>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Précédent</Button>
                        <Button variant="outline" size="sm" disabled={page >= meta.totalPages} onClick={() => setPage((p) => p + 1)}>Suivant</Button>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Dialogs */}
      {dialogCreer && (
        <DialogCreerPaiement onFermer={() => setDialogCreer(false)} onSuccess={() => { invalidate(); setDialogCreer(false); }} />
      )}
      {paiementEdite && (
        <DialogModifierPaiement paiement={paiementEdite} onFermer={() => setPaiementEdite(null)} onSuccess={() => { invalidate(); setPaiementEdite(null); }} />
      )}

      {/* Confirmation suppression */}
      <AlertDialog open={!!paiementASupprimer} onOpenChange={(o) => !o && setPaiementASupprimer(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce paiement ?</AlertDialogTitle>
            <AlertDialogDescription>
              Paiement de <strong>{paiementASupprimer && formaterMontant(paiementASupprimer.montant)}</strong> — action irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={() => effacer()} disabled={suppressionEnCours}>
              {suppressionEnCours && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}