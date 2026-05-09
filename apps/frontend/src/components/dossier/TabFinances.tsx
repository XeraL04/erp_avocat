import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Pencil,
  Trash2,
  DollarSign,
  TrendingUp,
  AlertCircle,
  WifiOff,
  FileText,
  Download,
  CheckCircle,
  Eye,
  X,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { obtenirHonoraire, supprimerHonoraire } from '@/api/honoraire.api';
import { listerPaiements, supprimerPaiement } from '@/api/paiement.api';
import { listerFacturesDossier, supprimerFacture, modifierFacture } from '@/api/facture.api';
import type { Facture, StatutFacture } from '@/api/facture.api';
import type { Paiement } from '@/api/paiement.api';
import { useAuthStore } from '@/stores/auth.store';
import { formaterDate, formaterDateCourte, cn } from '@/lib/utils';
import DialogDefinirHonoraire from './DialogDefinirHonoraire';
import DialogAjouterPaiement from './DialogAjouterPaiement';
import { DialogCreerFacture } from '../facture/DialogCreerFacture';

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  dossierId: string;
  clientId: string;
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const LIBELLE_TYPE_HONORAIRE: Record<string, string> = {
  forfait: 'Forfait global',
  echelonne: 'Échelonné',
};

const LIBELLE_MODE: Record<string, string> = {
  cash: 'Espèces',
  virement: 'Virement',
  ccp: 'CCP',
};

const STATUT_FACTURE_CLASSES: Record<StatutFacture, string> = {
  brouillon: 'bg-facture-brouillon-bg text-facture-brouillon border-transparent',
  emise: 'bg-facture-emise-bg     text-facture-emise     border-transparent',
  payee: 'bg-facture-payee-bg     text-facture-payee     border-transparent',
};

const LIBELLE_STATUT_FACTURE: Record<StatutFacture, string> = {
  brouillon: 'Brouillon',
  emise: 'Émise',
  payee: 'Payée',
};

// ─── Helper ───────────────────────────────────────────────────────────────────

function refDossierFacture(facture: Facture): string {
  if (typeof facture.dossier === 'object' && facture.dossier !== null)
    return (facture.dossier as { reference: string }).reference ?? '';
  return '';
}

// ─── Composant principal ──────────────────────────────────────────────────────

export default function TabFinances({ dossierId, clientId }: Props) {
  const queryClient = useQueryClient();
  const utilisateur = useAuthStore((s) => s.utilisateur);
  const token = useAuthStore((s) => s.accessToken);
  const estAdmin = utilisateur?.role === 'admin';

  const [dialogHonoraire, setDialogHonoraire] = useState(false);
  const [dialogPaiement, setDialogPaiement] = useState(false);
  const [dialogFacture, setDialogFacture] = useState(false);
  const [paiementAModifier, setPaiementAModifier] = useState<Paiement | null>(null);
  const [paiementASupprimer, setPaiementASupprimer] = useState<Paiement | null>(null);
  const [confirmerSupprimerHonoraire, setConfirmerSupprimerHonoraire] = useState(false);
  const [factureASupprimer, setFactureASupprimer] = useState<Facture | null>(null);
  const [telechargementsEnCours, setTelechargementsEnCours] = useState<Set<string>>(new Set());
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [pdfEnChargement, setPdfEnChargement] = useState<string | null>(null);

  // ── Queries ────────────────────────────────────────────────────────────────

  const {
    data: reponseHonoraire,
    isLoading: chargementHonoraire,
    isError: erreurHonoraire,
  } = useQuery({
    queryKey: ['cabinet', 'honoraire', dossierId],
    queryFn: () => obtenirHonoraire(dossierId),
    throwOnError: false,
  });

  const honoraire = reponseHonoraire?.honoraire ?? null;
  const totalPayeRep = reponseHonoraire?.totalPaye ?? 0;
  const resteAPayerRep = reponseHonoraire?.resteAPayer ?? 0;

  const { data: reponsePaiements, isLoading: chargementPaiements } = useQuery({
    queryKey: ['cabinet', 'paiements', dossierId],
    queryFn: () => listerPaiements(dossierId),
    enabled: !!honoraire,
    throwOnError: false,
  });

  const { data: factures = [], isLoading: chargementFactures } = useQuery({
    queryKey: ['cabinet', 'factures', dossierId],
    queryFn: () => listerFacturesDossier(dossierId),
    throwOnError: false,
  });

  // ── Calculs ────────────────────────────────────────────────────────────────

  const paiements = reponsePaiements?.paiements ?? [];
  const meta = reponsePaiements?.meta ?? null;
  const montantTotal = meta?.montantTotal ?? honoraire?.montantTotal ?? 0;
  const totalPaye = meta?.totalPaye ?? totalPayeRep;
  const resteAPayer = meta?.resteAPayer ?? resteAPayerRep;
  const pourcentagePaye =
    montantTotal > 0 ? Math.min(100, Math.round((totalPaye / montantTotal) * 100)) : 0;

  const da = (n: number) => n.toLocaleString('fr-DZ') + ' DA';

  // ── Mutations honoraire ────────────────────────────────────────────────────

  const { mutate: effacerHonoraire, isPending: suppressionHonoraire } = useMutation({
    mutationFn: () => supprimerHonoraire(dossierId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cabinet', 'honoraire', dossierId] });
      queryClient.invalidateQueries({ queryKey: ['cabinet', 'paiements', dossierId] });
      toast.success('Honoraire supprimé');
      setConfirmerSupprimerHonoraire(false);
    },
    onError: () => toast.error('Erreur lors de la suppression'),
  });

  // ── Mutations paiement ─────────────────────────────────────────────────────

  const { mutate: effacerPaiement, isPending: suppressionPaiement } = useMutation({
    mutationFn: () => supprimerPaiement(paiementASupprimer!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cabinet', 'paiements', dossierId] });
      toast.success('Paiement supprimé');
      setPaiementASupprimer(null);
    },
    onError: () => toast.error('Erreur lors de la suppression'),
  });

  // ── Mutations facture ──────────────────────────────────────────────────────

  const { mutate: effacerFacture, isPending: suppressionFacture } = useMutation({
    mutationFn: () => supprimerFacture(factureASupprimer!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cabinet', 'factures', dossierId] });
      toast.success('Facture supprimée');
      setFactureASupprimer(null);
    },
    onError: () =>
      toast.error(
        'Impossible de supprimer (seules les factures brouillon peuvent être supprimées)'
      ),
  });

  const { mutate: changerStatutFacture } = useMutation({
    mutationFn: ({ id, statut }: { id: string; statut: StatutFacture }) =>
      modifierFacture(id, { statut }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cabinet', 'factures', dossierId] });
      toast.success('Statut mis à jour');
    },
    onError: () => toast.error('Erreur lors de la mise à jour'),
  });

  // ── PDF helpers ────────────────────────────────────────────────────────────

  async function fetchPdfAvecAuth(factureId: string): Promise<string> {
    const response = await fetch(`/api/cabinet/factures/${factureId}/pdf`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error(`Erreur ${response.status}`);
    const blob = await response.blob();
    return URL.createObjectURL(blob);
  }

  async function handlePrevisualiser(factureId: string) {
    if (pdfEnChargement) return;
    setPdfEnChargement(factureId);
    try {
      const url = await fetchPdfAvecAuth(factureId);
      setPdfBlobUrl(url);
    } catch {
      toast.error('Impossible de charger la prévisualisation');
    } finally {
      setPdfEnChargement(null);
    }
  }

  async function handleTelechargePDF(facture: Facture) {
    setTelechargementsEnCours((prev) => new Set(prev).add(facture.id));
    try {
      const url = await fetchPdfAvecAuth(facture.id);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${facture.numero}.pdf`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      toast.error('Erreur lors de la génération du PDF');
    } finally {
      setTelechargementsEnCours((prev) => {
        const next = new Set(prev);
        next.delete(facture.id);
        return next;
      });
    }
  }

  function fermerPrevisualisation() {
    if (pdfBlobUrl) URL.revokeObjectURL(pdfBlobUrl);
    setPdfBlobUrl(null);
  }

  // ── États globaux ──────────────────────────────────────────────────────────

  if (chargementHonoraire) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-36 w-full rounded-lg" />
        <Skeleton className="h-44 w-full rounded-lg" />
        <Skeleton className="h-44 w-full rounded-lg" />
      </div>
    );
  }

  if (erreurHonoraire) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/8">
            <WifiOff className="h-4 w-4 text-destructive" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-medium">Impossible de charger les données financières</p>
            <p className="mt-1 max-w-xs text-xs text-muted-foreground">
              Vérifiez votre connexion ou rechargez la page.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              queryClient.invalidateQueries({ queryKey: ['cabinet', 'honoraire', dossierId] })
            }
          >
            Réessayer
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!honoraire) {
    return (
      <>
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
              <DollarSign className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-medium">Aucun honoraire défini</p>
              <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                Définissez les honoraires pour commencer à enregistrer paiements et factures.
              </p>
            </div>
            {estAdmin && (
              <Button size="sm" onClick={() => setDialogHonoraire(true)}>
                <Plus className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                Définir l'honoraire
              </Button>
            )}
          </CardContent>
        </Card>

        {dialogHonoraire && (
          <DialogDefinirHonoraire
            dossierId={dossierId}
            honoraire={null}
            onFermer={() => setDialogHonoraire(false)}
          />
        )}
      </>
    );
  }

  // ── Rendu principal ────────────────────────────────────────────────────────

  return (
    <div className="space-y-3">
      {/* ── SECTION 1 — HONORAIRES ─────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3 pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Honoraires
              </CardTitle>
              <Badge variant="secondary" className="text-xs font-normal">
                {LIBELLE_TYPE_HONORAIRE[honoraire.type] ?? honoraire.type}
              </Badge>
            </div>
            {estAdmin && (
              <div className="flex gap-0.5">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                  onClick={() => setDialogHonoraire(true)}
                  aria-label="Modifier l'honoraire"
                >
                  <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  onClick={() => setConfirmerSupprimerHonoraire(true)}
                  aria-label="Supprimer l'honoraire"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                </Button>
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-3.5">
          {/* KPIs 3 colonnes */}
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-md bg-muted/40 px-3 py-2.5">
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="mt-0.5 text-sm font-semibold tabular-nums">{da(montantTotal)}</p>
            </div>
            <div className="rounded-md bg-status-encours-bg px-3 py-2.5">
              <p className="text-xs text-muted-foreground">Payé</p>
              <p className="mt-0.5 text-sm font-semibold tabular-nums text-status-encours">
                {da(totalPaye)}
              </p>
            </div>
            <div
              className={cn(
                'rounded-md px-3 py-2.5',
                resteAPayer > 0 ? 'bg-status-suspendu-bg' : 'bg-muted/40'
              )}
            >
              <p className="text-xs text-muted-foreground">Reste</p>
              <p
                className={cn(
                  'mt-0.5 text-sm font-semibold tabular-nums',
                  resteAPayer > 0 ? 'text-status-suspendu' : 'text-muted-foreground'
                )}
              >
                {da(resteAPayer)}
              </p>
            </div>
          </div>

          {/* Barre de progression */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Progression</span>
              <span className="text-xs font-medium tabular-nums">{pourcentagePaye}%</span>
            </div>
            <Progress value={pourcentagePaye} className="h-1.5" />
          </div>

          {/* Intégralement réglé */}
          {resteAPayer === 0 && totalPaye > 0 && (
            <div className="flex items-center gap-1.5 rounded-md bg-status-encours-bg px-3 py-2 text-xs text-status-encours">
              <TrendingUp className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              Honoraires intégralement réglés
            </div>
          )}

          {honoraire.description && (
            <p className="text-xs italic text-muted-foreground">{honoraire.description}</p>
          )}
        </CardContent>
      </Card>

      {/* ── SECTION 2 — PAIEMENTS ──────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3 pt-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
              Paiements
              {paiements.length > 0 && (
                <span className="rounded-full bg-muted px-1.5 py-0.5 text-xs font-medium tabular-nums">
                  {paiements.length}
                </span>
              )}
            </CardTitle>
            {resteAPayer > 0 && (
              <Button size="sm" onClick={() => setDialogPaiement(true)}>
                <Plus className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                Ajouter
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {chargementPaiements ? (
            <div className="space-y-1 px-5 pb-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-11 w-full rounded-md" />
              ))}
            </div>
          ) : paiements.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <AlertCircle className="h-7 w-7 text-muted-foreground/25" aria-hidden="true" />
              <p className="text-xs text-muted-foreground">Aucun paiement enregistré</p>
              {resteAPayer > 0 && (
                <Button variant="outline" size="sm" onClick={() => setDialogPaiement(true)}>
                  <Plus className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                  Premier paiement
                </Button>
              )}
            </div>
          ) : (
            <ul className="divide-y">
              {paiements.map((p) => (
                <li
                  key={p.id}
                  className="group flex items-center gap-3 px-5 py-2.5 transition-colors hover:bg-accent/40"
                >
                  {/* Dot mode paiement */}
                  <span
                    className={cn(
                      'h-2 w-2 shrink-0 rounded-full',
                      p.mode === 'cash' && 'bg-mode-especes',
                      p.mode === 'virement' && 'bg-mode-virement',
                      p.mode === 'ccp' && 'bg-mode-cheque'
                    )}
                    aria-hidden="true"
                  />

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold tabular-nums">{da(p.montant)}</span>
                      <span className="text-xs text-muted-foreground">
                        {LIBELLE_MODE[p.mode] ?? p.mode}
                      </span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span className="tabular-nums">{formaterDateCourte(p.date)}</span>
                      {p.reference && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono">{p.reference}</span>
                        </>
                      )}
                      {p.note && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="max-w-40 truncate italic">{p.note}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-foreground"
                      onClick={() => setPaiementAModifier(p)}
                      aria-label="Modifier le paiement"
                    >
                      <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                    </Button>
                    {estAdmin && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => setPaiementASupprimer(p)}
                        aria-label="Supprimer le paiement"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* ── SECTION 3 — FACTURES ───────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3 pt-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
              Factures
              {factures.length > 0 && (
                <span className="rounded-full bg-muted px-1.5 py-0.5 text-xs font-medium tabular-nums">
                  {factures.length}
                </span>
              )}
            </CardTitle>
            <Button size="sm" onClick={() => setDialogFacture(true)}>
              <Plus className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
              Créer
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {chargementFactures ? (
            <div className="space-y-1 px-5 pb-4">
              {Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-md" />
              ))}
            </div>
          ) : factures.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <FileText className="h-7 w-7 text-muted-foreground/25" aria-hidden="true" />
              <p className="text-xs text-muted-foreground">Aucune facture générée</p>
              <Button variant="outline" size="sm" onClick={() => setDialogFacture(true)}>
                <Plus className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                Première facture
              </Button>
            </div>
          ) : (
            <ul className="divide-y">
              {factures.map((f) => (
                <li
                  key={f.id}
                  className="group flex items-center gap-3 px-5 py-2.5 transition-colors hover:bg-accent/40"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold">{f.numero}</span>
                      <span
                        className={cn(
                          'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium',
                          STATUT_FACTURE_CLASSES[f.statut]
                        )}
                      >
                        {LIBELLE_STATUT_FACTURE[f.statut]}
                      </span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span className="tabular-nums">{formaterDateCourte(f.dateEmission)}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-medium tabular-nums">{da(f.montant)}</span>
                      {refDossierFacture(f) && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono">{refDossierFacture(f)}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                    {estAdmin && f.statut === 'brouillon' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-primary"
                        aria-label="Passer en émise"
                        onClick={() => changerStatutFacture({ id: f.id, statut: 'emise' })}
                      >
                        <CheckCircle className="h-3.5 w-3.5" aria-hidden="true" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-foreground"
                      aria-label="Prévisualiser la facture"
                      disabled={pdfEnChargement === f.id}
                      onClick={() => handlePrevisualiser(f.id)}
                    >
                      {pdfEnChargement === f.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                      ) : (
                        <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-foreground"
                      aria-label="Télécharger le PDF"
                      disabled={telechargementsEnCours.has(f.id)}
                      onClick={() => handleTelechargePDF(f)}
                    >
                      {telechargementsEnCours.has(f.id) ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                      ) : (
                        <Download className="h-3.5 w-3.5" aria-hidden="true" />
                      )}
                    </Button>
                    {estAdmin && f.statut === 'brouillon' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        aria-label="Supprimer la facture"
                        onClick={() => setFactureASupprimer(f)}
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* ── DIALOGS MÉTIER ─────────────────────────────────────── */}
      {dialogHonoraire && (
        <DialogDefinirHonoraire
          dossierId={dossierId}
          honoraire={honoraire}
          onFermer={() => setDialogHonoraire(false)}
        />
      )}

      {(dialogPaiement || paiementAModifier) && (
        <DialogAjouterPaiement
          dossierId={dossierId}
          honoraireId={honoraire._id}
          resteAPayer={resteAPayer}
          paiement={paiementAModifier}
          onFermer={() => {
            setDialogPaiement(false);
            setPaiementAModifier(null);
          }}
        />
      )}

      {dialogFacture && (
        <DialogCreerFacture
          dossierId={dossierId}
          clientId={clientId}
          ouvert={dialogFacture}
          onFermer={() => setDialogFacture(false)}
        />
      )}

      {/* Prévisualisation PDF */}
      <Dialog open={!!pdfBlobUrl} onOpenChange={(o) => !o && fermerPrevisualisation()}>
        <DialogContent
          className="flex h-[90vh] max-w-4xl flex-col gap-0 p-0 [&>button]:hidden"
          aria-describedby={undefined}
        >
          <DialogHeader className="shrink-0 border-b px-5 py-3">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-sm font-medium">Prévisualisation</DialogTitle>
                <DialogDescription className="mt-0.5 text-xs text-muted-foreground">
                  Visualisation avant téléchargement.
                </DialogDescription>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={fermerPrevisualisation}
                aria-label="Fermer la prévisualisation"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            {pdfBlobUrl && (
              <iframe
                src={pdfBlobUrl}
                className="h-full w-full border-0"
                title="Prévisualisation PDF"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Suppression honoraire ──────────────────────────────── */}
      <AlertDialog open={confirmerSupprimerHonoraire} onOpenChange={setConfirmerSupprimerHonoraire}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer l'honoraire ?</AlertDialogTitle>
            <AlertDialogDescription>
              Tous les paiements liés seront également supprimés. Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={suppressionHonoraire}>Annuler</AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                variant="destructive"
                disabled={suppressionHonoraire}
                onClick={() => effacerHonoraire()}
              >
                {suppressionHonoraire ? 'Suppression…' : 'Supprimer'}
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Suppression paiement ───────────────────────────────── */}
      <AlertDialog
        open={!!paiementASupprimer}
        onOpenChange={(o) => !o && setPaiementASupprimer(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce paiement ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le paiement de <strong>{da(paiementASupprimer?.montant ?? 0)}</strong> du{' '}
              {paiementASupprimer ? formaterDate(paiementASupprimer.date) : ''} sera définitivement
              supprimé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={suppressionPaiement}>Annuler</AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                variant="destructive"
                disabled={suppressionPaiement}
                onClick={() => effacerPaiement()}
              >
                {suppressionPaiement ? 'Suppression…' : 'Supprimer'}
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Suppression facture ────────────────────────────────── */}
      <AlertDialog
        open={!!factureASupprimer}
        onOpenChange={(o) => !o && setFactureASupprimer(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer la facture {factureASupprimer?.numero} ?</AlertDialogTitle>
            <AlertDialogDescription>
              Seules les factures en statut <strong>brouillon</strong> peuvent être supprimées.
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={suppressionFacture}>Annuler</AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                variant="destructive"
                disabled={suppressionFacture}
                onClick={() => effacerFacture()}
              >
                {suppressionFacture ? 'Suppression…' : 'Supprimer'}
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
