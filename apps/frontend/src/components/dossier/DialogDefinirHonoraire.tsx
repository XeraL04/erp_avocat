import { useEffect } from 'react';
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

// Honoraire vient de @/types, pas de honoraire.api
import type { Honoraire } from '@/types';
import { definirHonoraire, modifierHonoraire } from '@/api/honoraire.api';

// schéma aligné sur le backend (forfait|echelonne, description — pas taux_horaire/pourcentage/notes)
const schema = z.object({
  type: z.enum(['forfait', 'echelonne']),
  montantTotal: z.coerce.number().min(1, 'Montant requis'),
  description: z.string().max(500).optional(),
});

type FormHonoraire = z.infer<typeof schema>;

interface Props {
  dossierId: string;
  honoraire?: Honoraire | null;
  onFermer: () => void;
}

export default function DialogDefinirHonoraire({ dossierId, honoraire, onFermer }: Props) {
  const queryClient = useQueryClient();
  const estModification = !!honoraire;

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
      estModification
        ? modifierHonoraire(dossierId, donnees)
        : definirHonoraire(dossierId, donnees),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cabinet', 'honoraire', dossierId] });
      queryClient.invalidateQueries({ queryKey: ['cabinet', 'paiements', dossierId] });
      toast.success(estModification ? 'Honoraire modifié' : 'Honoraire défini avec succès');
      onFermer();
    },
    onError: () => toast.error("Erreur lors de l'enregistrement"),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && !isPending && onFermer()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {estModification ? "Modifier l'honoraire" : "Définir l'honoraire"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit((d) => mutate(d))} className="space-y-4">
          {/* ✅ FIX 3 : valeurs Select backend exactes (forfait|echelonne) */}
          <div className="space-y-1.5">
            <Label>Type d'honoraire *</Label>
            <Controller
              name="type"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
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

          <div className="space-y-1.5">
            <Label htmlFor="montantTotal">Montant total (DA) *</Label>
            <Input
              id="montantTotal"
              type="number"
              min="1"
              placeholder="ex: 50000"
              {...register('montantTotal')}
              onWheel={(e) => (e.target as HTMLInputElement).blur()}
            />
            {errors.montantTotal && (
              <p className="text-xs text-destructive">{errors.montantTotal.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">
              Description <span className="text-muted-foreground">(optionnel)</span>
            </Label>
            <Textarea
              id="description"
              rows={2}
              placeholder="Accord verbal, conditions particulières..."
              {...register('description')}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onFermer} disabled={isPending}>
              Annuler
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isPending ? 'Enregistrement...' : estModification ? 'Modifier' : 'Définir'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
