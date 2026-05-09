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

import { obtenirHonoraire, supprimerHonoraire } from '@/api/honoraire.api';
import { listerPaiements, supprimerPaiement, creerFactureDepuisPaiement } from '@/api/paiement.api';
import type { Paiement } from '@/api/paiement.api';
import { useAuthStore } from '@/stores/auth.store';
import { formaterDate, formaterDateCourte } from '@/lib/utils';
import DialogDefinirHonoraire from '@/components/dossier/DialogDefinirHonoraire';
import DialogAjouterPaiement from '@/components/dossier/DialogAjouterPaiement';

// ─── Libellés ─────────────────────────────────────────────────────────────────
const libelleTypeHonoraire: Record<string, string> = {
  forfait: 'Forfait global',
  echelonne: 'Échelonné',
};

const libelleMode: Record<string, string> = {
  cash: 'Espèces',
  virement: 'Virement bancaire',
  ccp: 'CCP',
};

// ─── Composant ────────────────────────────────────────────────────────────────
interface Props {
  dossierId: string;
}

export default function TabHonoraires({ dossierId }: Props) {
  const queryClient = useQueryClient();
  const utilisateur = useAuthStore((s) => s.utilisateur);
  const estAdmin = utilisateur?.role === 'admin';

  const [dialogHonoraire, setDialogHonoraire] = useState(false);
  const [dialogPaiement, setDialogPaiement] = useState(false);
  const [paiementAModifier, setPaiementAModifier] = useState<Paiement | null>(null);
  const [paiementASupprimer, setPaiementASupprimer] = useState<Paiement | null>(null);
  const [paiementFacture, setPaiementFacture] = useState<Paiement | null>(null);
  const [confirmerSupprimerHonoraire, setConfirmerSupprimerHonoraire] = useState(false);

  // ── Query honoraire ────────────────────────────────────────────────────────
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
  const totalPayeInitial = reponseHonoraire?.totalPaye ?? 0;
  const resteAPayerInitial = reponseHonoraire?.resteAPayer ?? honoraire?.montantTotal ?? 0;

  // ── Query paiements ────────────────────────────────────────────────────────
  const { data: reponsePaiements, isLoading: chargementPaiements } = useQuery({
    queryKey: ['cabinet', 'paiements', dossierId],
    queryFn: () => listerPaiements(dossierId),
    enabled: !!honoraire,
    throwOnError: false,
  });

  const paiements = reponsePaiements?.paiements ?? [];
  const meta = reponsePaiements?.meta ?? null;

  // ── Mutations ──────────────────────────────────────────────────────────────
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

  const { mutate: effacerPaiement, isPending: suppressionPaiement } = useMutation({
    mutationFn: () => supprimerPaiement(paiementASupprimer!._id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cabinet', 'paiements', dossierId] });
      toast.success('Paiement supprimé');
      setPaiementASupprimer(null);
    },
    onError: () => toast.error('Erreur lors de la suppression'),
  });

  // ── NOUVEAU : Mutation générer facture depuis paiement ────────────────────
  const { mutate: genererFacture, isPending: generationFacture } = useMutation({
    mutationFn: () => creerFactureDepuisPaiement(paiementFacture!._id),
    onSuccess: (data) => {
      toast.success(`Facture ${data.numero} créée depuis ce paiement`);
      setPaiementFacture(null);
      queryClient.invalidateQueries({ queryKey: ['cabinet', 'factures', dossierId] });
    },
    onError: () => toast.error('Erreur lors de la création de la facture'),
  });

  // ── Calculs ────────────────────────────────────────────────────────────────
  const montantTotal = honoraire?.montantTotal ?? 0;
  const totalPaye = meta?.totalPaye ?? totalPayeInitial;
  const resteAPayer = meta?.resteAPayer ?? resteAPayerInitial;
  const pourcentagePaye =
    montantTotal > 0 ? Math.min(100, Math.round((totalPaye / montantTotal) * 100)) : 0;

  const da = (n: number) => n.toLocaleString('fr-DZ') + ' DA';

  // ── États d'erreur/chargement (inchangés) ──────────────────────────────────
  if (chargementHonoraire) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-lg" />
              ))}
            </div>
            <Skeleton className="h-2 w-full rounded-full" />
          </CardContent>
        </Card>
        <Skeleton className="h-48 w-full rounded-lg" />
      </div>
    );
  }

  if (erreurHonoraire) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
            <WifiOff className="h-7 w-7 text-destructive" aria-hidden="true" />
          </div>
          <div>
            <p className="font-medium">Impossible de charger les honoraires</p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Vérifiez votre connexion ou rechargez la page.
            </p>
          </div>
          <Button
            variant="outline"
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
          <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
              <DollarSign className="h-7 w-7 text-muted-foreground" aria-hidden="true" />
            </div>
            <div>
              <p className="font-medium">Aucun honoraire défini</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Définissez les honoraires de ce dossier pour commencer à enregistrer les paiements.
              </p>
            </div>
            <Button onClick={() => setDialogHonoraire(true)}>
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
              Définir l'honoraire
            </Button>
          </CardContent>
        </Card>
        {dialogHonoraire && (
          <DialogDefinirHonoraire
            dossierId={dossierId}
            onFermer={() => setDialogHonoraire(false)}
          />
        )}
      </>
    );
  }

  // ── État principal ─────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* ── Bloc honoraire (inchangé) ─────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">Honoraires</CardTitle>
              <Badge variant="secondary">
                {libelleTypeHonoraire[honoraire.type] ?? honoraire.type}
              </Badge>
            </div>
            {estAdmin && (
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setDialogHonoraire(true)}
                  aria-label="Modifier l'honoraire"
                >
                  <Pencil className="h-4 w-4" aria-hidden="true" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:bg-destructive/5 hover:text-destructive"
                  onClick={() => setConfirmerSupprimerHonoraire(true)}
                  aria-label="Supprimer l'honoraire"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* KPIs — tokens CSS, plus de couleurs hardcodées */}
          <div className="grid grid-cols-3 gap-3">
            {/* Total — neutre */}
            <div className="rounded-lg bg-muted/50 p-3 text-center">
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="mt-0.5 font-semibold tabular-nums">{da(montantTotal)}</p>
            </div>

            {/* Payé — token success */}
            <div className="rounded-lg bg-green-50/50 p-3 text-center dark:bg-green-950/20">
              <p className="text-xs text-muted-foreground">Payé</p>
              <p className="mt-0.5 font-semibold tabular-nums text-green-700 dark:text-green-400">
                {da(totalPaye)}
              </p>
            </div>

            {/* Reste — token warning si > 0, neutre si soldé */}
            <div
              className={`rounded-lg p-3 text-center ${
                resteAPayer > 0 ? 'bg-orange-50/50 dark:bg-orange-950/20' : 'bg-muted/50'
              }`}
            >
              <p className="text-xs text-muted-foreground">Reste</p>
              <p
                className={`mt-0.5 font-semibold tabular-nums ${
                  resteAPayer > 0 ? 'text-orange-700 dark:text-orange-400' : 'text-muted-foreground'
                }`}
              >
                {da(resteAPayer)}
              </p>
            </div>
          </div>

          {/* Barre de progression */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Progression du paiement</span>
              <span className="font-medium text-foreground">{pourcentagePaye}%</span>
            </div>
            <Progress value={pourcentagePaye} className="h-2" />
          </div>

          {honoraire.description && (
            <p className="text-xs italic text-muted-foreground">"{honoraire.description}"</p>
          )}

          {/* Bannière soldé — token success */}
          {resteAPayer === 0 && (
            <div className="flex items-center gap-2 rounded-lg bg-green-50/50 px-3 py-2 text-sm text-green-700 dark:bg-green-950/20 dark:text-green-400">
              <TrendingUp className="h-4 w-4" aria-hidden="true" />
              Honoraires intégralement réglés
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Liste des paiements (AJOUT BOUTON FACTURE) ───────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              Paiements{paiements.length > 0 && ` (${paiements.length})`}
            </CardTitle>
            <div className="flex gap-2">
              {resteAPayer > 0 && (
                <Button size="sm" onClick={() => setDialogPaiement(true)}>
                  <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                  Paiement
                </Button>
              )}
              {paiements.length > 0 && (
                <Button size="sm" variant="outline" disabled={paiements.length === 0}>
                  Factures ({paiements.length})
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {chargementPaiements ? (
            <div className="divide-y">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-6 py-3">
                  <div className="flex-1 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-5 w-20 rounded-full" />
                    </div>
                    <Skeleton className="h-3 w-36" />
                  </div>
                  <div className="flex gap-1">
                    <Skeleton className="h-7 w-7 rounded-md" />
                    <Skeleton className="h-7 w-7 rounded-md" />
                  </div>
                </div>
              ))}
            </div>
          ) : paiements.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <AlertCircle className="h-8 w-8 text-muted-foreground/30" aria-hidden="true" />
              <p className="text-sm text-muted-foreground">Aucun paiement enregistré</p>
              {resteAPayer > 0 && (
                <Button variant="outline" size="sm" onClick={() => setDialogPaiement(true)}>
                  <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                  Enregistrer le premier paiement
                </Button>
              )}
            </div>
          ) : (
            <div className="divide-y">
              {paiements.map((p) => (
                <div
                  key={p._id}
                  className="flex items-center gap-4 px-6 py-3 transition-colors hover:bg-muted/30"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium tabular-nums">{da(p.montant)}</span>
                      <Badge variant="outline" className="text-xs">
                        {libelleMode[p.mode] ?? p.mode}
                      </Badge>
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{formaterDateCourte(p.date)}</span>
                      {p.reference && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono">{p.reference}</span>
                        </>
                      )}
                      {p.note && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="truncate italic">{p.note}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {/* NOUVEAU : Bouton générer facture depuis paiement */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-primary hover:bg-primary/10"
                      onClick={() => setPaiementFacture(p)}
                      aria-label={`Générer facture depuis ce paiement`}
                      disabled={generationFacture}
                    >
                      <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => setPaiementAModifier(p)}
                      aria-label={`Modifier le paiement du ${formaterDateCourte(p.date)}`}
                    >
                      <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                    </Button>
                    {estAdmin && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:bg-destructive/5 hover:text-destructive"
                        onClick={() => setPaiementASupprimer(p)}
                        aria-label={`Supprimer le paiement du ${formaterDateCourte(p.date)}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Dialogs (ajout honoraireId) ───────────────────────────────────────── */}
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
          honoraireId={honoraire._id} // AJOUT : requis par l'API
          resteAPayer={resteAPayer}
          paiement={paiementAModifier}
          onFermer={() => {
            setDialogPaiement(false);
            setPaiementAModifier(null);
          }}
        />
      )}

      {/* ── NOUVEAU : Confirmation génération facture ────────────────────────── */}
      <AlertDialog open={!!paiementFacture} onOpenChange={(o) => !o && setPaiementFacture(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Générer une facture ?</AlertDialogTitle>
            <AlertDialogDescription>
              Une nouvelle facture sera créée à partir de ce paiement de{' '}
              <strong>{paiementFacture && da(paiementFacture.montant)}</strong> du{' '}
              {paiementFacture && formaterDate(paiementFacture.date)}. Statut : brouillon.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={() => genererFacture()} disabled={generationFacture}>
              {generationFacture ? 'Création...' : 'Générer facture'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmations suppression (inchangées) */}
      <AlertDialog open={confirmerSupprimerHonoraire} onOpenChange={setConfirmerSupprimerHonoraire}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer l'honoraire ?</AlertDialogTitle>
            <AlertDialogDescription>
              Tous les paiements liés seront également supprimés. Action irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => effacerHonoraire()}
              disabled={suppressionHonoraire}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!paiementASupprimer}
        onOpenChange={(o) => !o && setPaiementASupprimer(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce paiement ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le paiement de <strong>{paiementASupprimer && da(paiementASupprimer.montant)}</strong>{' '}
              du {paiementASupprimer && formaterDate(paiementASupprimer.date)} sera supprimé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => effacerPaiement()}
              disabled={suppressionPaiement}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// import { useState } from 'react';
// import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
// import { Plus, Pencil, Trash2, DollarSign, TrendingUp, AlertCircle, WifiOff } from 'lucide-react';
// import { toast } from 'sonner';

// import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
// import { Button } from '@/components/ui/button';
// import { Badge } from '@/components/ui/badge';
// import { Skeleton } from '@/components/ui/skeleton';
// import { Progress } from '@/components/ui/progress';
// import {
//   AlertDialog,
//   AlertDialogAction,
//   AlertDialogCancel,
//   AlertDialogContent,
//   AlertDialogDescription,
//   AlertDialogFooter,
//   AlertDialogHeader,
//   AlertDialogTitle,
// } from '@/components/ui/alert-dialog';

// import { obtenirHonoraire, supprimerHonoraire } from '@/api/honoraire.api';
// import { listerPaiements, supprimerPaiement } from '@/api/paiement.api';
// import type { Paiement } from '@/api/paiement.api';
// import { useAuthStore } from '@/stores/auth.store';
// import { formaterDate, formaterDateCourte } from '@/lib/utils';
// import DialogDefinirHonoraire from '@/components/dossier/DialogDefinirHonoraire';
// import DialogAjouterPaiement from '@/components/dossier/DialogAjouterPaiement';

// // ─── Libellés ─────────────────────────────────────────────────────────────────
// const libelleTypeHonoraire: Record<string, string> = {
//   forfait: 'Forfait global',
//   echelonne: 'Échelonné',
// };
// const libelleMode: Record<string, string> = {
//   cash: 'Espèces',
//   virement: 'Virement bancaire',
//   ccp: 'CCP',
// };

// // ─── Composant ────────────────────────────────────────────────────────────────
// interface Props {
//   dossierId: string;
// }

// export default function TabHonoraires({ dossierId }: Props) {
//   const queryClient = useQueryClient();
//   const utilisateur = useAuthStore((s) => s.utilisateur);
//   const estAdmin = utilisateur?.role === 'admin';

//   const [dialogHonoraire, setDialogHonoraire] = useState(false);
//   const [dialogPaiement, setDialogPaiement] = useState(false);
//   const [paiementAModifier, setPaiementAModifier] = useState<Paiement | null>(null);
//   const [paiementASupprimer, setPaiementASupprimer] = useState<Paiement | null>(null);
//   const [confirmerSupprimerHonoraire, setConfirmerSupprimerHonoraire] = useState(false);

//   // ── Query honoraire ────────────────────────────────────────────────────────
//   const {
//     data: reponseHonoraire,
//     isLoading: chargementHonoraire,
//     isError: erreurHonoraire,
//   } = useQuery({
//     queryKey: ['cabinet', 'honoraire', dossierId],
//     queryFn: () => obtenirHonoraire(dossierId),
//     throwOnError: false,
//   });

//   const honoraire = reponseHonoraire?.honoraire ?? null;
//   const totalPayeInitial = reponseHonoraire?.totalPaye ?? 0;
//   const resteAPayerInitial = reponseHonoraire?.resteAPayer ?? honoraire?.montantTotal ?? 0;

//   // ── Query paiements ────────────────────────────────────────────────────────
//   const { data: reponsePaiements, isLoading: chargementPaiements } = useQuery({
//     queryKey: ['cabinet', 'paiements', dossierId],
//     queryFn: () => listerPaiements(dossierId),
//     enabled: !!honoraire,
//     throwOnError: false,
//   });

//   const paiements = reponsePaiements?.paiements ?? [];
//   const meta = reponsePaiements?.meta ?? null;

//   // ── Mutations ──────────────────────────────────────────────────────────────
//   const { mutate: effacerHonoraire, isPending: suppressionHonoraire } = useMutation({
//     mutationFn: () => supprimerHonoraire(dossierId),
//     onSuccess: () => {
//       queryClient.invalidateQueries({ queryKey: ['cabinet', 'honoraire', dossierId] });
//       queryClient.invalidateQueries({ queryKey: ['cabinet', 'paiements', dossierId] });
//       toast.success('Honoraire supprimé');
//       setConfirmerSupprimerHonoraire(false);
//     },
//     onError: () => toast.error('Erreur lors de la suppression'),
//   });

//   const { mutate: effacerPaiement, isPending: suppressionPaiement } = useMutation({
//     mutationFn: () => supprimerPaiement(paiementASupprimer!._id),
//     onSuccess: () => {
//       queryClient.invalidateQueries({ queryKey: ['cabinet', 'paiements', dossierId] });
//       toast.success('Paiement supprimé');
//       setPaiementASupprimer(null);
//     },
//     onError: () => toast.error('Erreur lors de la suppression'),
//   });

//   // ── Calculs ────────────────────────────────────────────────────────────────
//   const montantTotal = honoraire?.montantTotal ?? 0;
//   const totalPaye = meta?.totalPaye ?? totalPayeInitial;
//   const resteAPayer = meta?.resteAPayer ?? resteAPayerInitial;
//   const pourcentagePaye =
//     montantTotal > 0 ? Math.min(100, Math.round((totalPaye / montantTotal) * 100)) : 0;

//   const da = (n: number) => n.toLocaleString('fr-DZ') + ' DA';

//   // ── État : chargement ──────────────────────────────────────────────────────
//   if (chargementHonoraire) {
//     return (
//       <div className="space-y-4">
//         <Card>
//           <CardHeader className="pb-3">
//             <div className="flex items-center justify-between">
//               <div className="flex items-center gap-2">
//                 <Skeleton className="h-5 w-24" />
//                 <Skeleton className="h-5 w-20 rounded-full" />
//               </div>
//             </div>
//           </CardHeader>
//           <CardContent className="space-y-4">
//             <div className="grid grid-cols-3 gap-3">
//               {[...Array(3)].map((_, i) => (
//                 <Skeleton key={i} className="h-16 rounded-lg" />
//               ))}
//             </div>
//             <Skeleton className="h-2 w-full rounded-full" />
//           </CardContent>
//         </Card>
//         <Skeleton className="h-48 w-full rounded-lg" />
//       </div>
//     );
//   }

//   // ── État : erreur réseau ───────────────────────────────────────────────────
//   if (erreurHonoraire) {
//     return (
//       <Card>
//         <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
//           <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
//             <WifiOff className="h-7 w-7 text-destructive" aria-hidden="true" />
//           </div>
//           <div>
//             <p className="font-medium">Impossible de charger les honoraires</p>
//             <p className="mt-1 max-w-sm text-sm text-muted-foreground">
//               Vérifiez votre connexion ou rechargez la page.
//             </p>
//           </div>
//           <Button
//             variant="outline"
//             onClick={() =>
//               queryClient.invalidateQueries({ queryKey: ['cabinet', 'honoraire', dossierId] })
//             }
//           >
//             Réessayer
//           </Button>
//         </CardContent>
//       </Card>
//     );
//   }

//   // ── État : aucun honoraire ─────────────────────────────────────────────────
//   if (!honoraire) {
//     return (
//       <>
//         <Card>
//           <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
//             <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
//               <DollarSign className="h-7 w-7 text-muted-foreground" aria-hidden="true" />
//             </div>
//             <div>
//               <p className="font-medium">Aucun honoraire défini</p>
//               <p className="mt-1 max-w-sm text-sm text-muted-foreground">
//                 Définissez les honoraires de ce dossier pour commencer à enregistrer les paiements.
//               </p>
//             </div>
//             <Button onClick={() => setDialogHonoraire(true)}>
//               <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
//               Définir l'honoraire
//             </Button>
//           </CardContent>
//         </Card>
//         {dialogHonoraire && (
//           <DialogDefinirHonoraire
//             dossierId={dossierId}
//             onFermer={() => setDialogHonoraire(false)}
//           />
//         )}
//       </>
//     );
//   }

//   // ── État principal ─────────────────────────────────────────────────────────
//   return (
//     <div className="space-y-4">
//       {/* ── Bloc honoraire ─────────────────────────────────────── */}
//       <Card>
//         <CardHeader className="pb-3">
//           <div className="flex items-center justify-between">
//             <div className="flex items-center gap-2">
//               <CardTitle className="text-base">Honoraires</CardTitle>
//               <Badge variant="secondary">
//                 {libelleTypeHonoraire[honoraire.type] ?? honoraire.type}
//               </Badge>
//             </div>
//             {estAdmin && (
//               <div className="flex gap-1">
//                 <Button
//                   variant="ghost"
//                   size="icon"
//                   className="h-8 w-8"
//                   onClick={() => setDialogHonoraire(true)}
//                   aria-label="Modifier l'honoraire"
//                 >
//                   <Pencil className="h-4 w-4" aria-hidden="true" />
//                 </Button>
//                 <Button
//                   variant="ghost"
//                   size="icon"
//                   className="h-8 w-8 text-destructive hover:bg-destructive/5 hover:text-destructive"
//                   onClick={() => setConfirmerSupprimerHonoraire(true)}
//                   aria-label="Supprimer l'honoraire"
//                 >
//                   <Trash2 className="h-4 w-4" aria-hidden="true" />
//                 </Button>
//               </div>
//             )}
//           </div>
//         </CardHeader>
//         <CardContent className="space-y-4">
//           {/* KPIs ── tokens CSS, plus de couleurs hardcodées */}
//           <div className="grid grid-cols-3 gap-3">
//             {/* Total — neutre */}
//             <div className="rounded-lg bg-muted/50 p-3 text-center">
//               <p className="text-xs text-muted-foreground">Total</p>
//               <p className="mt-0.5 font-semibold tabular-nums">{da(montantTotal)}</p>
//             </div>

//             {/* Payé — token success */}
//             <div className="rounded-lg bg-(--color-success)/10 p-3 text-center">
//               <p className="text-xs text-muted-foreground">Payé</p>
//               <p className="mt-0.5 font-semibold tabular-nums text-(--color-success)">
//                 {da(totalPaye)}
//               </p>
//             </div>

//             {/* Reste — token warning si > 0, neutre si soldé */}
//             <div
//               className={`rounded-lg p-3 text-center ${
//                 resteAPayer > 0 ? 'bg-(--color-warning)/10' : 'bg-muted/50'
//               }`}
//             >
//               <p className="text-xs text-muted-foreground">Reste</p>
//               <p
//                 className={`mt-0.5 font-semibold tabular-nums ${
//                   resteAPayer > 0 ? 'text-(--color-warning)' : 'text-muted-foreground'
//                 }`}
//               >
//                 {da(resteAPayer)}
//               </p>
//             </div>
//           </div>

//           {/* Barre de progression */}
//           <div className="space-y-1.5">
//             <div className="flex items-center justify-between text-xs text-muted-foreground">
//               <span>Progression du paiement</span>
//               <span className="font-medium text-foreground">{pourcentagePaye}%</span>
//             </div>
//             <Progress value={pourcentagePaye} className="h-2" />
//           </div>

//           {honoraire.description && (
//             <p className="text-xs italic text-muted-foreground">"{honoraire.description}"</p>
//           )}

//           {/* Bannière soldé — token success */}
//           {resteAPayer === 0 && (
//             <div className="flex items-center gap-2 rounded-lg bg-(--color-success)/10 px-3 py-2 text-sm text-[(--color-success)">
//               <TrendingUp className="h-4 w-4" aria-hidden="true" />
//               Honoraires intégralement réglés
//             </div>
//           )}
//         </CardContent>
//       </Card>

//       {/* ── Liste des paiements ─────────────────────────────────── */}
//       <Card>
//         <CardHeader className="pb-3">
//           <div className="flex items-center justify-between">
//             <CardTitle className="text-base">
//               Paiements{paiements.length > 0 && ` (${paiements.length})`}
//             </CardTitle>
//             {resteAPayer > 0 && (
//               <Button size="sm" onClick={() => setDialogPaiement(true)}>
//                 <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
//                 Paiement
//               </Button>
//             )}
//           </div>
//         </CardHeader>
//         <CardContent className="p-0">
//           {chargementPaiements ? (
//             <div className="divide-y">
//               {Array.from({ length: 3 }).map((_, i) => (
//                 <div key={i} className="flex items-center gap-4 px-6 py-3">
//                   <div className="flex-1 space-y-1.5">
//                     <div className="flex items-center gap-2">
//                       <Skeleton className="h-4 w-24" />
//                       <Skeleton className="h-5 w-20 rounded-full" />
//                     </div>
//                     <Skeleton className="h-3 w-36" />
//                   </div>
//                   <div className="flex gap-1">
//                     <Skeleton className="h-7 w-7 rounded-md" />
//                     <Skeleton className="h-7 w-7 rounded-md" />
//                   </div>
//                 </div>
//               ))}
//             </div>
//           ) : paiements.length === 0 ? (
//             <div className="flex flex-col items-center gap-2 py-10 text-center">
//               <AlertCircle className="h-8 w-8 text-muted-foreground/30" aria-hidden="true" />
//               <p className="text-sm text-muted-foreground">Aucun paiement enregistré</p>
//               {resteAPayer > 0 && (
//                 <Button variant="outline" size="sm" onClick={() => setDialogPaiement(true)}>
//                   <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
//                   Enregistrer le premier paiement
//                 </Button>
//               )}
//             </div>
//           ) : (
//             <div className="divide-y">
//               {paiements.map((p) => (
//                 <div
//                   key={p._id}
//                   className="flex items-center gap-4 px-6 py-3 transition-colors hover:bg-muted/30"
//                 >
//                   <div className="min-w-0 flex-1">
//                     <div className="flex items-center gap-2">
//                       <span className="font-medium tabular-nums">{da(p.montant)}</span>
//                       <Badge variant="outline" className="text-xs">
//                         {libelleMode[p.mode] ?? p.mode}
//                       </Badge>
//                     </div>
//                     <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
//                       <span>{formaterDateCourte(p.date)}</span>
//                       {p.reference && (
//                         <>
//                           <span aria-hidden="true">·</span>
//                           <span className="font-mono">{p.reference}</span>
//                         </>
//                       )}
//                       {p.note && (
//                         <>
//                           <span aria-hidden="true">·</span>
//                           <span className="truncate italic">{p.note}</span>
//                         </>
//                       )}
//                     </div>
//                   </div>
//                   <div className="flex gap-1">
//                     <Button
//                       variant="ghost"
//                       size="icon"
//                       className="h-7 w-7"
//                       onClick={() => setPaiementAModifier(p)}
//                       aria-label={`Modifier le paiement du ${formaterDateCourte(p.date)}`}
//                     >
//                       <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
//                     </Button>
//                     {estAdmin && (
//                       <Button
//                         variant="ghost"
//                         size="icon"
//                         className="h-7 w-7 text-destructive hover:bg-destructive/5 hover:text-destructive"
//                         onClick={() => setPaiementASupprimer(p)}
//                         aria-label={`Supprimer le paiement du ${formaterDateCourte(p.date)}`}
//                       >
//                         <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
//                       </Button>
//                     )}
//                   </div>
//                 </div>
//               ))}
//             </div>
//           )}
//         </CardContent>
//       </Card>

//       {/* ── Dialogs ──────────────────────────────────────────────── */}
//       {dialogHonoraire && (
//         <DialogDefinirHonoraire
//           dossierId={dossierId}
//           honoraire={honoraire}
//           onFermer={() => setDialogHonoraire(false)}
//         />
//       )}

//       {(dialogPaiement || paiementAModifier) && (
//         <DialogAjouterPaiement
//           dossierId={dossierId}
//           honoraireId={honoraire._id}
//           resteAPayer={resteAPayer}
//           paiement={paiementAModifier}
//           onFermer={() => {
//             setDialogPaiement(false);
//             setPaiementAModifier(null);
//           }}
//         />
//       )}

//       {/* Confirmation suppression honoraire */}
//       <AlertDialog open={confirmerSupprimerHonoraire} onOpenChange={setConfirmerSupprimerHonoraire}>
//         <AlertDialogContent>
//           <AlertDialogHeader>
//             <AlertDialogTitle>Supprimer l'honoraire ?</AlertDialogTitle>
//             <AlertDialogDescription>
//               Tous les paiements liés seront également supprimés. Action irréversible.
//             </AlertDialogDescription>
//           </AlertDialogHeader>
//           <AlertDialogFooter>
//             <AlertDialogCancel>Annuler</AlertDialogCancel>
//             <AlertDialogAction
//               className="bg-destructive hover:bg-destructive/90"
//               onClick={() => effacerHonoraire()}
//               disabled={suppressionHonoraire}
//             >
//               Supprimer
//             </AlertDialogAction>
//           </AlertDialogFooter>
//         </AlertDialogContent>
//       </AlertDialog>

//       {/* Confirmation suppression paiement */}
//       <AlertDialog
//         open={!!paiementASupprimer}
//         onOpenChange={(o) => !o && setPaiementASupprimer(null)}
//       >
//         <AlertDialogContent>
//           <AlertDialogHeader>
//             <AlertDialogTitle>Supprimer ce paiement ?</AlertDialogTitle>
//             <AlertDialogDescription>
//               Le paiement de <strong>{paiementASupprimer && da(paiementASupprimer.montant)}</strong>{' '}
//               du {paiementASupprimer && formaterDate(paiementASupprimer.date)} sera supprimé.
//             </AlertDialogDescription>
//           </AlertDialogHeader>
//           <AlertDialogFooter>
//             <AlertDialogCancel>Annuler</AlertDialogCancel>
//             <AlertDialogAction
//               className="bg-destructive hover:bg-destructive/90"
//               onClick={() => effacerPaiement()}
//               disabled={suppressionPaiement}
//             >
//               Supprimer
//             </AlertDialogAction>
//           </AlertDialogFooter>
//         </AlertDialogContent>
//       </AlertDialog>
//     </div>
//   );
// }
