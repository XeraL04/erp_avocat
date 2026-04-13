import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, DollarSign, TrendingUp, AlertCircle, WifiOff } from 'lucide-react';
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
import { listerPaiements, supprimerPaiement } from '@/api/paiement.api';
import type { Paiement } from '@/api/paiement.api';
import { useAuthStore } from '@/stores/auth.store';
import { formaterDate, formaterDateCourte } from '@/lib/utils';
import DialogDefinirHonoraire from '@/components/dossier/DialogDefinirHonoraire';
import DialogAjouterPaiement from '@/components/dossier/DialogAjouterPaiement';

interface Props {
  dossierId: string;
}

const libelleTypeHonoraire: Record<string, string> = {
  forfait: 'Forfait global',
  echelonne: 'Échelonné',
};

const libelleMode: Record<string, string> = {
  cash: 'Espèces',
  virement: 'Virement bancaire',
  ccp: 'CCP',
};

export default function TabHonoraires({ dossierId }: Props) {
  const queryClient = useQueryClient();
  const utilisateur = useAuthStore((s) => s.utilisateur);
  const estAdmin = utilisateur?.role === 'admin';

  const [dialogHonoraire, setDialogHonoraire] = useState(false);
  const [dialogPaiement, setDialogPaiement] = useState(false);
  const [paiementAModifier, setPaiementAModifier] = useState<Paiement | null>(null);
  const [paiementASupprimer, setPaiementASupprimer] = useState<Paiement | null>(null);
  const [confirmerSupprimerHonoraire, setConfirmerSupprimerHonoraire] = useState(false);

  // ─── Query honoraire ──────────────────────────────────────────────────────
  // reponseHonoraire = { honoraire: Honoraire, totalPaye, resteAPayer, statut, devise }
  const {
    data: reponseHonoraire,
    isLoading: chargementHonoraire,
    isError: erreurHonoraire,
  } = useQuery({
    queryKey: ['cabinet', 'honoraire', dossierId],
    queryFn: () => obtenirHonoraire(dossierId),
    throwOnError: false,
  });

  // honoraire = le vrai objet Honoraire extrait de l'enveloppe backend
  const honoraire = reponseHonoraire?.honoraire ?? null;
  const totalPayeInitial = reponseHonoraire?.totalPaye ?? 0;
  const resteAPayerInitial = reponseHonoraire?.resteAPayer ?? honoraire?.montantTotal ?? 0;

  // ─── Query paiements (uniquement si honoraire existe) ────────────────────
  const { data: reponsePaiements, isLoading: chargementPaiements } = useQuery({
    queryKey: ['cabinet', 'paiements', dossierId],
    queryFn: () => listerPaiements(dossierId),
    enabled: !!honoraire,
    throwOnError: false,
  });

  const paiements = reponsePaiements?.paiements ?? [];
  const meta = reponsePaiements?.meta ?? null;

  // ─── Mutations ────────────────────────────────────────────────────────────
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

  // ─── Calculs financiers ───────────────────────────────────────────────────
  // Après chargement des paiements : meta (temps réel) prime sur les valeurs initiales
  const montantTotal = honoraire?.montantTotal ?? 0;
  const totalPaye = meta?.totalPaye ?? totalPayeInitial;
  const resteAPayer = meta?.resteAPayer ?? resteAPayerInitial;
  const pourcentagePaye =
    montantTotal > 0 ? Math.min(100, Math.round((totalPaye / montantTotal) * 100)) : 0;

  const da = (n: number) => n.toLocaleString('fr-DZ') + ' DA';

  // ─── État : chargement ────────────────────────────────────────────────────
  if (chargementHonoraire) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-36 w-full rounded-lg" />
        <Skeleton className="h-48 w-full rounded-lg" />
      </div>
    );
  }

  // ─── État : erreur réseau ─────────────────────────────────────────────────
  if (erreurHonoraire) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
            <WifiOff className="h-7 w-7 text-destructive" />
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

  // ─── État : aucun honoraire défini (null = 404 backend, valide) ───────────
  if (!honoraire) {
    return (
      <>
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
              <DollarSign className="h-7 w-7 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium">Aucun honoraire défini</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Définissez les honoraires de ce dossier pour commencer à enregistrer les paiements.
              </p>
            </div>
            <Button onClick={() => setDialogHonoraire(true)}>
              <Plus className="mr-2 h-4 w-4" />
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

  // ─── État principal : honoraire existant ──────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Bloc honoraire */}
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
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => setConfirmerSupprimerHonoraire(true)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Chiffres clés */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg bg-muted/50 p-3 text-center">
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="mt-0.5 font-semibold tabular-nums">{da(montantTotal)}</p>
            </div>
            <div className="rounded-lg bg-green-50 p-3 text-center dark:bg-green-950/20">
              <p className="text-xs text-muted-foreground">Payé</p>
              <p className="mt-0.5 font-semibold tabular-nums text-green-700 dark:text-green-400">
                {da(totalPaye)}
              </p>
            </div>
            <div
              className={`rounded-lg p-3 text-center ${
                resteAPayer > 0 ? 'bg-orange-50 dark:bg-orange-950/20' : 'bg-muted/50'
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
            <p className="text-xs text-muted-foreground italic">"{honoraire.description}"</p>
          )}

          {resteAPayer === 0 && (
            <div
              className="flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2 text-sm
              text-green-700 dark:bg-green-950/20 dark:text-green-400"
            >
              <TrendingUp className="h-4 w-4" />
              Honoraires intégralement réglés
            </div>
          )}
        </CardContent>
      </Card>

      {/* Liste des paiements */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              Paiements{paiements.length > 0 && ` (${paiements.length})`}
            </CardTitle>
            {resteAPayer > 0 && (
              <Button size="sm" onClick={() => setDialogPaiement(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Paiement
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {chargementPaiements ? (
            <div className="space-y-px px-6 pb-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : paiements.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <AlertCircle className="h-8 w-8 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">Aucun paiement enregistré</p>
              {resteAPayer > 0 && (
                <Button variant="outline" size="sm" onClick={() => setDialogPaiement(true)}>
                  <Plus className="mr-2 h-4 w-4" />
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
                          <span>·</span>
                          <span className="font-mono">{p.reference}</span>
                        </>
                      )}
                      {p.note && (
                        <>
                          <span>·</span>
                          <span className="truncate italic">{p.note}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => setPaiementAModifier(p)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    {estAdmin && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => setPaiementASupprimer(p)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
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

      {/* Confirmation suppression honoraire */}
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

      {/* Confirmation suppression paiement */}
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
