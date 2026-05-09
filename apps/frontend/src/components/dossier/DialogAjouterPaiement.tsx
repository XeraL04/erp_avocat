import { useEffect, useId } from 'react';
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

// ─── Schéma ───────────────────────────────────────────────────────────────────
const schema = z.object({
  montant: z
    .number({ invalid_type_error: 'Montant requis' })
    .positive('Le montant doit être positif'),
  date: z.string().min(1, 'Date requise'),
  mode: z.enum(['cash', 'virement', 'ccp'], { required_error: 'Mode de paiement requis' }),
  reference: z.string().optional(),
  note: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function dateLocaleVersISO(dateLocale: string): string {
  if (!dateLocale) return new Date().toISOString();
  return new Date(`${dateLocale}T00:00:00.000Z`).toISOString();
}
function isoVersDateLocale(iso: string): string {
  if (!iso) return new Date().toISOString().split('T')[0];
  return iso.split('T')[0];
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

// ─── Props ────────────────────────────────────────────────────────────────────
interface Props {
  dossierId: string;
  honoraireId: string;
  resteAPayer: number;
  paiement?: Paiement | null;
  onFermer: () => void;
}

// ─── Composant ────────────────────────────────────────────────────────────────
export default function DialogAjouterPaiement({
  dossierId,
  honoraireId,
  resteAPayer,
  paiement,
  onFermer,
}: Props) {
  const queryClient = useQueryClient();
  const uid = useId();
  const modeModif = !!paiement;

  const valeursDef = () => ({
    montant: paiement?.montant ?? undefined,
    date: paiement?.date
      ? isoVersDateLocale(paiement.date)
      : new Date().toISOString().split('T')[0],
    mode: paiement?.mode ?? ('cash' as const),
    reference: paiement?.reference ?? '',
    note: paiement?.note ?? '',
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: valeursDef(),
  });

  useEffect(() => {
    form.reset(valeursDef());
  }, [paiement]);

  const { mutate: ajouter, isPending: ajoutEnCours } = useMutation({
    mutationFn: (values: FormValues) =>
      ajouterPaiement({
        honoraireId,
        dossierId,
        montant: values.montant,
        date: dateLocaleVersISO(values.date),
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
    onError: (err: unknown) =>
      toast.error(extraireMessageErreur(err, "Erreur lors de l'enregistrement")),
  });

  const { mutate: modifier, isPending: modifEnCours } = useMutation({
    mutationFn: (values: FormValues) =>
      modifierPaiement(paiement!._id, {
        montant: values.montant,
        date: dateLocaleVersISO(values.date),
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
    onError: (err: unknown) =>
      toast.error(extraireMessageErreur(err, 'Erreur lors de la modification')),
  });

  const enCours = ajoutEnCours || modifEnCours;
  const onSubmit = (values: FormValues) => (modeModif ? modifier(values) : ajouter(values));
  const da = (n: number) => n.toLocaleString('fr-DZ') + ' DA';

  const Opt = () => <span className="font-normal text-muted-foreground/70">(opt.)</span>;

  return (
    <Dialog open onOpenChange={(o) => !o && !enCours && onFermer()}>
      <DialogContent className="flex flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
        {/* ── Header ──────────────────────────────────────────── */}
        <DialogHeader className="shrink-0 border-b px-6 py-4">
          <DialogTitle className="text-base">
            {modeModif ? 'Modifier le paiement' : 'Enregistrer un paiement'}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {modeModif
              ? 'Modifiez les informations du paiement.'
              : `Reste à payer : ${da(resteAPayer)}`}
          </DialogDescription>
        </DialogHeader>

        {/* ── Body ────────────────────────────────────────────── */}
        <Form {...form}>
          <form
            id={`${uid}-form`}
            onSubmit={form.handleSubmit(onSubmit)}
            noValidate
            className="px-6 py-5"
          >
            <div className="space-y-4">
              {/* ── Montant + Date sur la même ligne ────────────── */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="montant"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-medium">
                        Montant (DA) <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="ex : 15 000"
                          disabled={enCours}
                          className="h-9 w-full text-sm"
                          value={field.value ?? ''}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value === '' ? undefined : Number(e.target.value)
                            )
                          }
                          onWheel={(e) => (e.target as HTMLInputElement).blur()}
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-medium">
                        Date <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          disabled={enCours}
                          className="h-9 w-full text-sm"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              </div>

              {/* ── Mode de paiement — pleine largeur ───────────── */}
              <FormField
                control={form.control}
                name="mode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium">
                      Mode de paiement <span className="text-destructive">*</span>
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={enCours}>
                      <FormControl>
                        <SelectTrigger className="h-9 w-full text-sm">
                          <SelectValue placeholder="Choisir un mode" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="cash">Espèces</SelectItem>
                        <SelectItem value="virement">Virement bancaire</SelectItem>
                        <SelectItem value="ccp">CCP</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              {/* ── Référence + Note sur la même ligne ──────────── */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="reference"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-medium">
                        Référence <Opt />
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="N° reçu, virement…"
                          disabled={enCours}
                          className="h-9 w-full text-sm"
                          {...field}
                          value={field.value ?? ''}
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="note"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-medium">
                        Note <Opt />
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Remarque libre…"
                          disabled={enCours}
                          className="h-9 w-full text-sm"
                          {...field}
                          value={field.value ?? ''}
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* ── Footer ──────────────────────────────────────────── */}
            <div className="mt-5 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onFermer}
                disabled={enCours}
              >
                Annuler
              </Button>
              <Button type="submit" size="sm" form={`${uid}-form`} disabled={enCours}>
                {enCours && (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                )}
                {enCours
                  ? modeModif
                    ? 'Modification…'
                    : 'Enregistrement…'
                  : modeModif
                    ? 'Modifier'
                    : 'Enregistrer'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
