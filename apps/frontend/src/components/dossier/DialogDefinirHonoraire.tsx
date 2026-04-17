import { useEffect, useId } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import type { Honoraire } from '@/types';
import { definirHonoraire, modifierHonoraire } from '@/api/honoraire.api';

// ─── Schéma ───────────────────────────────────────────────────────────────────
const schema = z.object({
  type: z.enum(['forfait', 'echelonne']),
  montantTotal: z.coerce.number().min(1, 'Montant requis'),
  description: z.string().max(500).optional(),
});

type FormHonoraire = z.infer<typeof schema>;

// ─── Composant ────────────────────────────────────────────────────────────────
interface Props {
  dossierId: string;
  honoraire?: Honoraire | null;
  onFermer: () => void;
}

export default function DialogDefinirHonoraire({ dossierId, honoraire, onFermer }: Props) {
  const queryClient = useQueryClient();
  const uid = useId();
  const estModif = !!honoraire;

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<FormHonoraire>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: honoraire?.type ?? 'forfait',
      montantTotal: honoraire?.montantTotal ?? undefined,
      description: honoraire?.description ?? '',
    },
  });

  useEffect(() => {
    if (honoraire) {
      reset({
        type: honoraire.type,
        montantTotal: honoraire.montantTotal,
        description: honoraire.description ?? '',
      });
    }
  }, [honoraire, reset]);

  const { mutate, isPending } = useMutation({
    mutationFn: (donnees: FormHonoraire) =>
      estModif ? modifierHonoraire(dossierId, donnees) : definirHonoraire(dossierId, donnees),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cabinet', 'honoraire', dossierId] });
      queryClient.invalidateQueries({ queryKey: ['cabinet', 'paiements', dossierId] });
      toast.success(estModif ? 'Honoraire modifié' : 'Honoraire défini avec succès');
      onFermer();
    },
    onError: () => toast.error("Erreur lors de l'enregistrement"),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && !isPending && onFermer()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{estModif ? "Modifier l'honoraire" : "Définir l'honoraire"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit((d) => mutate(d))} className="space-y-4" noValidate>
          {/* ── Type d'honoraire ───────────────────────────────── */}
          <div className="space-y-1.5">
            <Label htmlFor={`${uid}-type`}>Type d'honoraire *</Label>
            <Controller
              name="type"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange} disabled={isPending}>
                  <SelectTrigger id={`${uid}-type`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="forfait">Forfait global</SelectItem>
                    <SelectItem value="echelonne">Paiement échelonné</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {/* ── Montant total ──────────────────────────────────── */}
          <div className="space-y-1.5">
            <Label htmlFor={`${uid}-montant`}>Montant total (DA) *</Label>
            <Input
              id={`${uid}-montant`}
              type="number"
              min="1"
              placeholder="ex : 50 000"
              disabled={isPending}
              aria-invalid={!!errors.montantTotal}
              aria-describedby={errors.montantTotal ? `${uid}-montant-error` : undefined}
              onWheel={(e) => (e.target as HTMLInputElement).blur()}
              {...register('montantTotal')}
            />
            {errors.montantTotal && (
              <p id={`${uid}-montant-error`} className="text-xs text-destructive" role="alert">
                {errors.montantTotal.message}
              </p>
            )}
          </div>

          {/* ── Description ────────────────────────────────────── */}
          <div className="space-y-1.5">
            <Label htmlFor={`${uid}-desc`}>
              Description{' '}
              <span className="text-xs font-normal text-muted-foreground">(optionnel)</span>
            </Label>
            <Textarea
              id={`${uid}-desc`}
              rows={2}
              placeholder="Accord verbal, conditions particulières…"
              className="resize-none"
              disabled={isPending}
              {...register('description')}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onFermer} disabled={isPending}>
              Annuler
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
              {isPending ? 'Enregistrement en cours…' : estModif ? 'Modifier' : 'Définir'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
