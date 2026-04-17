import { useEffect, useId } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import type { AxiosError } from 'axios';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { modifierFacture, type Facture, type StatutFacture } from '@/api/facture.api';
import { couleurStatutFacture, libelleStatutFacture, formaterMontantDA } from '@/lib/utils';
import { extraireMessageErreur } from '@/api/auth.api';

// ─── Transitions autorisées (unidirectionnel) ─────────────────────────────────
const TRANSITIONS: Record<StatutFacture, StatutFacture[]> = {
  brouillon: ['emise'],
  emise: ['payee'],
  payee: [],
};

// ─── Schéma ───────────────────────────────────────────────────────────────────
const schema = z
  .object({
    montant: z
      .number({ invalid_type_error: 'Montant invalide' })
      .positive('Le montant doit être positif')
      .optional(),
    statut: z.enum(['brouillon', 'emise', 'payee']).optional(),
  })
  .refine((d) => d.montant !== undefined || d.statut !== undefined, {
    message: 'Modifiez au moins un champ',
  });
type FormModifier = z.infer<typeof schema>;

// ─── Props ────────────────────────────────────────────────────────────────────
interface Props {
  facture: Facture;
  onFermer: () => void;
}

// ─── Composant ────────────────────────────────────────────────────────────────
export function DialogModifierFacture({ facture, onFermer }: Props) {
  const queryClient = useQueryClient();
  const uid = useId();
  const prochainsStatuts = TRANSITIONS[facture.statut];
  const peutModifierMontant = facture.statut === 'brouillon';

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<FormModifier>({ resolver: zodResolver(schema) });

  useEffect(() => {
    reset({ montant: facture.montant, statut: undefined });
  }, [facture, reset]);

  // ── Mutation ───────────────────────────────────────────────────────────────
  const { mutate, isPending } = useMutation({
    mutationFn: (d: FormModifier) =>
      modifierFacture(facture.id, {
        montant: peutModifierMontant ? d.montant : undefined,
        statut: d.statut,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cabinet', 'factures'] });
      toast.success('Facture mise à jour');
      onFermer();
    },
    onError: (err: unknown) => toast.error(extraireMessageErreur(err as AxiosError)),
  });

  return (
    // Guard !isPending : empêche la fermeture accidentelle pendant une mutation
    <Dialog open onOpenChange={(o) => !o && !isPending && onFermer()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Modifier la facture
            <Badge variant={couleurStatutFacture(facture.statut)}>
              {libelleStatutFacture(facture.statut)}
            </Badge>
          </DialogTitle>
          <DialogDescription className="font-mono">{facture.numero}</DialogDescription>
        </DialogHeader>

        <form
          id={`${uid}-form`}
          onSubmit={handleSubmit((d) => mutate(d))}
          className="space-y-4"
          noValidate
        >
          {/* ── Montant ──────────────────────────────────────── */}
          <div className="space-y-1.5">
            <Label htmlFor={`${uid}-montant`} className="flex items-center gap-2">
              Montant (DA)
              {!peutModifierMontant && (
                <span className="text-xs font-normal text-muted-foreground">
                  (non modifiable — {libelleStatutFacture(facture.statut).toLowerCase()})
                </span>
              )}
            </Label>
            <Input
              id={`${uid}-montant`}
              type="number"
              min="0"
              step="500"
              disabled={!peutModifierMontant || isPending}
              {...register('montant', { valueAsNumber: true })}
            />
            {!peutModifierMontant && (
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                {/* Icône décorative — aria-hidden */}
                <AlertCircle className="h-3 w-3 shrink-0" aria-hidden="true" />
                Montant actuel : {formaterMontantDA(facture.montant)}
              </p>
            )}
            {errors.montant && (
              <p className="text-xs text-destructive" role="alert">
                {errors.montant.message}
              </p>
            )}
          </div>

          {/* ── Changement de statut ──────────────────────────── */}
          {prochainsStatuts.length > 0 && (
            <>
              <Separator />
              <div className="space-y-1.5">
                <Label htmlFor={`${uid}-statut`}>Changer le statut</Label>
                <Controller
                  name="statut"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange} disabled={isPending}>
                      <SelectTrigger id={`${uid}-statut`}>
                        <SelectValue placeholder="Conserver le statut actuel" />
                      </SelectTrigger>
                      <SelectContent>
                        {prochainsStatuts.map((s) => (
                          <SelectItem key={s} value={s}>
                            {libelleStatutFacture(s)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                <p className="text-xs text-muted-foreground">
                  Statut actuel : <strong>{libelleStatutFacture(facture.statut)}</strong>
                  {' → '}
                  {prochainsStatuts.map(libelleStatutFacture).join(' ou ')}
                </p>
              </div>
            </>
          )}

          {/* ── Facture réglée ───────────────────────────────── */}
          {facture.statut === 'payee' && (
            <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
              Cette facture est entièrement réglée. Aucune modification possible.
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onFermer} disabled={isPending}>
              Annuler
            </Button>
            <Button
              type="submit"
              form={`${uid}-form`}
              disabled={isPending || facture.statut === 'payee'}
            >
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
              {isPending ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
