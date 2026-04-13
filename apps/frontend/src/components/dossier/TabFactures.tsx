import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Download, Trash2, FileText, WifiOff, Loader2, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
// import {
//   Select, SelectContent, SelectItem,
//   SelectTrigger, SelectValue,
// } from '@/components/ui/select';

import {
  listerFacturesDossier,
  creerFacture,
  modifierFacture,
  supprimerFacture,
  telechargerFacturePDF,
} from '@/api/facture.api';
import type { Facture, StatutFacture } from '@/api/facture.api';
import { useAuthStore } from '@/stores/auth.store';
import { formaterDate } from '@/lib/utils';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const da = (n: number) => n.toLocaleString('fr-DZ') + ' DA';

function dateLocaleVersISO(dateLocale: string): string {
  if (!dateLocale) return new Date().toISOString();
  return new Date(`${dateLocale}T00:00:00.000Z`).toISOString();
}

function extraireMessageErreur(err: unknown, fallback: string): string {
  if (
    err &&
    typeof err === 'object' &&
    'response' in err &&
    err.response &&
    typeof err.response === 'object' &&
    'data' in err.response &&
    err.response.data &&
    typeof err.response.data === 'object' &&
    'message' in err.response.data &&
    typeof (err.response.data as { message?: unknown }).message === 'string'
  ) {
    return (err.response.data as { message: string }).message;
  }
  return fallback;
}

// ─── Config badges statut ─────────────────────────────────────────────────────

const configStatut: Record<
  StatutFacture,
  { label: string; variant: 'secondary' | 'default' | 'outline' | 'destructive'; className: string }
> = {
  brouillon: { label: 'Brouillon', variant: 'secondary', className: '' },
  emise: {
    label: 'Émise',
    variant: 'default',
    className: 'bg-blue-100 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/30 dark:text-blue-400',
  },
  payee: {
    label: 'Payée',
    variant: 'outline',
    className: 'border-green-500 text-green-700 dark:text-green-400',
  },
};

// Transitions de statut autorisées par le backend
const prochainsStatuts: Partial<Record<StatutFacture, StatutFacture>> = {
  brouillon: 'emise',
  emise: 'payee',
};

const libelleTransition: Record<string, string> = {
  emise: 'Marquer comme émise',
  payee: 'Marquer comme payée',
};

// ─── Schéma formulaire création ───────────────────────────────────────────────

const schemaCreer = z.object({
  montant: z
    .number({ invalid_type_error: 'Montant requis' })
    .positive('Le montant doit être positif'),
  dateEmission: z.string().min(1, 'Date requise'),
});

type FormValues = z.infer<typeof schemaCreer>;

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  dossierId: string;
  clientId: string; // nécessaire pour POST /cabinet/factures
}

// ─── Composant principal ──────────────────────────────────────────────────────

export default function TabFactures({ dossierId, clientId }: Props) {
  const queryClient = useQueryClient();
  const utilisateur = useAuthStore((s) => s.utilisateur);
  const estAdmin = utilisateur?.role === 'admin';

  const [dialogCreer, setDialogCreer] = useState(false);
  const [factureASupprimer, setFactureASupprimer] = useState<Facture | null>(null);
  const [telechargementEnCours, setTelecharge] = useState<string | null>(null); // id facture

  // ─── Query ───────────────────────────────────────────────────────────────
  const {
    data: factures = [] as Facture[],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['cabinet', 'factures', dossierId],
    queryFn: () => listerFacturesDossier(dossierId),
    throwOnError: false,
  });

  // ─── Mutation : changer statut ────────────────────────────────────────────
  const { mutate: changerStatut, isPending: changementEnCours } = useMutation({
    mutationFn: ({ id, statut }: { id: string; statut: StatutFacture }) =>
      modifierFacture(id, { statut }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cabinet', 'factures', dossierId] });
      toast.success('Statut mis à jour');
    },
    onError: (err: unknown) =>
      toast.error(extraireMessageErreur(err, 'Erreur lors de la mise à jour')),
  });

  // ─── Mutation : supprimer ─────────────────────────────────────────────────
  const { mutate: effacer, isPending: suppressionEnCours } = useMutation({
    mutationFn: () => supprimerFacture(factureASupprimer!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cabinet', 'factures', dossierId] });
      toast.success('Facture supprimée');
      setFactureASupprimer(null);
    },
    onError: (err: unknown) =>
      toast.error(extraireMessageErreur(err, 'Erreur lors de la suppression')),
  });

  // ─── Téléchargement PDF ───────────────────────────────────────────────────
  async function handleTelechargement(facture: Facture) {
    setTelecharge(facture.id);
    try {
      await telechargerFacturePDF(facture.id, facture.numero);
      toast.success(`${facture.numero}.pdf téléchargé`);
    } catch {
      toast.error('Erreur lors du téléchargement');
    } finally {
      setTelecharge(null);
    }
  }

  // ─── Chargement ───────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-16 w-full rounded-lg" />
        <Skeleton className="h-16 w-full rounded-lg" />
        <Skeleton className="h-16 w-full rounded-lg" />
      </div>
    );
  }

  // ─── Erreur réseau ────────────────────────────────────────────────────────
  if (isError) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
            <WifiOff className="h-7 w-7 text-destructive" />
          </div>
          <div>
            <p className="font-medium">Impossible de charger les factures</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Vérifiez votre connexion ou rechargez la page.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() =>
              queryClient.invalidateQueries({ queryKey: ['cabinet', 'factures', dossierId] })
            }
          >
            Réessayer
          </Button>
        </CardContent>
      </Card>
    );
  }

  // ─── Rendu principal ──────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              Factures{factures.length > 0 && ` (${factures.length})`}
            </CardTitle>
            <Button size="sm" onClick={() => setDialogCreer(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Nouvelle facture
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {factures.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-14 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <FileText className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium">Aucune facture</p>
                <p className="mt-1 max-w-xs text-sm text-muted-foreground">
                  Créez une facture pour ce dossier.
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setDialogCreer(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Créer la première facture
              </Button>
            </div>
          ) : (
            <div className="divide-y">
              {factures.map((facture) => {
                const cfg = configStatut[facture.statut];
                const prochainStatut = prochainsStatuts[facture.statut];

                return (
                  <div
                    key={facture.id}
                    className="flex items-center gap-4 px-6 py-4 transition-colors hover:bg-muted/30"
                  >
                    {/* Icône */}
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                    </div>

                    {/* Infos */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-medium">{facture.numero}</span>
                        <Badge variant={cfg.variant} className={cfg.className}>
                          {cfg.label}
                        </Badge>
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="font-medium tabular-nums text-foreground">
                          {da(facture.montant)}
                        </span>
                        <span>·</span>
                        <span>{formaterDate(facture.dateEmission)}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      {/* Avancer le statut */}
                      {prochainStatut && estAdmin && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 gap-1.5 text-xs"
                          disabled={changementEnCours}
                          onClick={() => changerStatut({ id: facture.id, statut: prochainStatut })}
                        >
                          {libelleTransition[prochainStatut]}
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Button>
                      )}

                      {/* Télécharger PDF */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        disabled={telechargementEnCours === facture.id}
                        onClick={() => handleTelechargement(facture)}
                        title="Télécharger le PDF"
                      >
                        {telechargementEnCours === facture.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Download className="h-4 w-4" />
                        )}
                      </Button>

                      {/* Supprimer (brouillon + admin uniquement) */}
                      {facture.statut === 'brouillon' && estAdmin && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setFactureASupprimer(facture)}
                          title="Supprimer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog création */}
      {dialogCreer && (
        <DialogCreerFacture
          dossierId={dossierId}
          clientId={clientId}
          onFermer={() => setDialogCreer(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['cabinet', 'factures', dossierId] });
            setDialogCreer(false);
          }}
        />
      )}

      {/* Confirmation suppression */}
      <AlertDialog
        open={!!factureASupprimer}
        onOpenChange={(o) => !o && setFactureASupprimer(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette facture ?</AlertDialogTitle>
            <AlertDialogDescription>
              La facture <strong className="font-mono">{factureASupprimer?.numero}</strong> sera
              définitivement supprimée. Action irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => effacer()}
              disabled={suppressionEnCours}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Dialog : créer une facture ───────────────────────────────────────────────

interface DialogCreerFactureProps {
  dossierId: string;
  clientId: string;
  onFermer: () => void;
  onSuccess: () => void;
}

function DialogCreerFacture({ dossierId, clientId, onFermer, onSuccess }: DialogCreerFactureProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schemaCreer),
    defaultValues: {
      montant: undefined,
      dateEmission: new Date().toISOString().split('T')[0],
    },
  });

  const { mutate: creer, isPending } = useMutation({
    mutationFn: (values: FormValues) =>
      creerFacture({
        clientId,
        dossierId,
        montant: values.montant,
        dateEmission: dateLocaleVersISO(values.dateEmission),
      }),
    onSuccess: () => {
      toast.success('Facture créée en brouillon');
      onSuccess();
    },
    onError: (err: unknown) =>
      toast.error(extraireMessageErreur(err, 'Erreur lors de la création')),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onFermer()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nouvelle facture</DialogTitle>
          <DialogDescription>
            La facture sera créée en statut <strong>brouillon</strong> avec un numéro automatique
            (FACT-YYYY-NNN).
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => creer(v))} className="space-y-4">
            {/* Montant */}
            <FormField
              control={form.control}
              name="montant"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Montant (DA)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="Ex : 150000"
                      {...field}
                      value={field.value ?? ''}
                      onChange={(e) =>
                        field.onChange(e.target.value === '' ? undefined : Number(e.target.value))
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Date d'émission */}
            <FormField
              control={form.control}
              name="dateEmission"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date d'émission</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={onFermer} disabled={isPending}>
                Annuler
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Créer la facture
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
