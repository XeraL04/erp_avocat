import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

import { ajouterPaiement, modifierPaiement } from '@/api/paiement.api';
import type { Paiement } from '@/api/paiement.api';

// ─── Schéma Zod ───────────────────────────────────────────────────────────────
const schema = z.object({
  montant: z
    .number({ invalid_type_error: 'Montant requis' })
    .positive('Le montant doit être positif'),
  // ✅ input type="date" renvoie "YYYY-MM-DD" → on convertit en ISO avant envoi
  date: z.string().min(1, 'Date requise'),
  mode: z.enum(['cash', 'virement', 'ccp'], {
    required_error: 'Mode de paiement requis',
  }),
  reference: z.string().optional(),
  note: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

// ─── Helper : "2026-04-05" → "2026-04-05T00:00:00.000Z" ─────────────────────
function dateLocaleVersISO(dateLocale: string): string {
  if (!dateLocale) return new Date().toISOString();
  // On parse en UTC pour éviter les décalages de fuseau horaire
  return new Date(`${dateLocale}T00:00:00.000Z`).toISOString();
}

// ─── Helper inverse : ISO → "YYYY-MM-DD" pour l'input type="date" ────────────
function isoVersDateLocale(iso: string): string {
  if (!iso) return new Date().toISOString().split('T')[0];
  return iso.split('T')[0];
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface Props {
  dossierId: string;
  honoraireId: string;
  resteAPayer: number;
  paiement?: Paiement | null;
  onFermer: () => void;
}

export default function DialogAjouterPaiement({
  dossierId,
  honoraireId,
  resteAPayer,
  paiement,
  onFermer,
}: Props) {
  const queryClient = useQueryClient();
  const modeModification = !!paiement;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      montant: paiement?.montant ?? undefined,
      date: paiement?.date
        ? isoVersDateLocale(paiement.date)
        : new Date().toISOString().split('T')[0],
      mode: paiement?.mode ?? 'cash',
      reference: paiement?.reference ?? '',
      note: paiement?.note ?? '',
    },
  });

  useEffect(() => {
    form.reset({
      montant: paiement?.montant ?? undefined,
      date: paiement?.date
        ? isoVersDateLocale(paiement.date)
        : new Date().toISOString().split('T')[0],
      mode: paiement?.mode ?? 'cash',
      reference: paiement?.reference ?? '',
      note: paiement?.note ?? '',
    });
  }, [paiement, form]);

  // ─── Helper : extrait le message d'erreur Axios sans utiliser `any` ──────────
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

  // ─── Mutation ajout ────────────────────────────────────────────────────────
  const { mutate: ajouter, isPending: ajoutEnCours } = useMutation({
    mutationFn: (values: FormValues) =>
      ajouterPaiement({
        honoraireId, // ✅ correspond au backend
        dossierId, // ✅ correspond au backend
        montant: values.montant,
        date: dateLocaleVersISO(values.date), // ✅ ISO 8601 complet
        mode: values.mode,
        reference: values.reference || undefined,
        note: values.note || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cabinet', 'paiements', dossierId] });
      queryClient.invalidateQueries({ queryKey: ['cabinet', 'honoraire', dossierId] });
      toast.success('Paiement enregistré');
      onFermer();
    },
    onError: (err: unknown) => {
      // Affiche le message métier du backend si disponible
      toast.error(extraireMessageErreur(err, "Erreur lors de l'enregistrement"));
    },
  });

  // ─── Mutation modification ─────────────────────────────────────────────────
  const { mutate: modifier, isPending: modifEnCours } = useMutation({
    mutationFn: (values: FormValues) =>
      modifierPaiement(paiement!._id, {
        montant: values.montant,
        date: dateLocaleVersISO(values.date), // ✅ ISO 8601 complet
        mode: values.mode,
        reference: values.reference || undefined,
        note: values.note || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cabinet', 'paiements', dossierId] });
      queryClient.invalidateQueries({ queryKey: ['cabinet', 'honoraire', dossierId] });
      toast.success('Paiement modifié');
      onFermer();
    },
    onError: (err: unknown) => {
      toast.error(extraireMessageErreur(err, 'Erreur lors de la modification'));
    },
  });

  const enCours = ajoutEnCours || modifEnCours;
  const onSubmit = (values: FormValues) => (modeModification ? modifier(values) : ajouter(values));

  const da = (n: number) => n.toLocaleString('fr-DZ') + ' DA';

  return (
    <Dialog open onOpenChange={(o) => !o && onFermer()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {modeModification ? 'Modifier le paiement' : 'Enregistrer un paiement'}
          </DialogTitle>
          <DialogDescription>
            {modeModification
              ? 'Modifiez les informations du paiement.'
              : `Reste à payer : ${da(resteAPayer)}`}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                      placeholder="Ex : 15000"
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

            {/* Date */}
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Mode */}
            <FormField
              control={form.control}
              name="mode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mode de paiement</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Choisir un mode" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="cash">Espèces</SelectItem>
                      <SelectItem value="virement">Virement bancaire</SelectItem>
                      <SelectItem value="ccp">CCP</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Référence */}
            <FormField
              control={form.control}
              name="reference"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Référence <span className="text-xs text-muted-foreground">(optionnelle)</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="N° reçu, virement…" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Note */}
            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Note <span className="text-xs text-muted-foreground">(optionnelle)</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="Remarque libre…" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={onFermer} disabled={enCours}>
                Annuler
              </Button>
              <Button type="submit" disabled={enCours}>
                {enCours && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {modeModification ? 'Modifier' : 'Enregistrer'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
