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

import { modifierDossier } from '@/api/dossier.api';
import type { Dossier } from '@/api/dossier.api';

const schemaModifierDossier = z
  .object({
    titre: z.string().min(2, 'Minimum 2 caractères').max(200).optional(),
    type: z.enum(['civil', 'penal', 'commercial', 'administratif', 'autre']).optional(),
    description: z.string().max(2000).nullable().optional(),
    dateOuverture: z.string().optional(),
  })
  .refine((data) => Object.values(data).some((v) => v !== undefined && v !== ''), {
    message: 'Au moins un champ doit être modifié',
  });

type FormModifierDossier = z.infer<typeof schemaModifierDossier>;

interface Props {
  dossier: Dossier;
  onFermer: () => void;
}

export default function DialogModifierDossier({ dossier, onFermer }: Props) {
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<FormModifierDossier>({
    resolver: zodResolver(schemaModifierDossier),
    defaultValues: {
      titre: dossier.titre,
      type: dossier.type,
      description: dossier.description ?? '',
      dateOuverture: dossier.dateOuverture
        ? new Date(dossier.dateOuverture).toISOString().split('T')[0]
        : '',
    },
  });

  useEffect(() => {
    reset({
      titre: dossier.titre,
      type: dossier.type,
      description: dossier.description ?? '',
      dateOuverture: dossier.dateOuverture
        ? new Date(dossier.dateOuverture).toISOString().split('T')[0]
        : '',
    });
  }, [dossier, reset]);

  const { mutate, isPending } = useMutation({
    mutationFn: (data: FormModifierDossier) => modifierDossier(dossier._id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cabinet', 'dossiers'] });
      queryClient.invalidateQueries({ queryKey: ['cabinet', 'dossier', dossier._id] });
      toast.success('Dossier modifié avec succès');
      onFermer();
    },
    onError: () => toast.error('Erreur lors de la modification'),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && !isPending && onFermer()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Modifier le dossier</DialogTitle>
          <p className="font-mono text-sm text-muted-foreground">{dossier.reference}</p>
        </DialogHeader>

        <form onSubmit={handleSubmit((data) => mutate(data))} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="titre">Titre</Label>
            <Input id="titre" {...register('titre')} />
            {errors.titre && <p className="text-xs text-destructive">{errors.titre.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>Type d'affaire</Label>
            <Controller
              name="type"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="civil">Civil</SelectItem>
                    <SelectItem value="penal">Pénal</SelectItem>
                    <SelectItem value="commercial">Commercial</SelectItem>
                    <SelectItem value="administratif">Administratif</SelectItem>
                    <SelectItem value="autre">Autre</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="dateOuverture">Date d'ouverture</Label>
            <Input id="dateOuverture" type="date" {...register('dateOuverture')} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" rows={3} {...register('description')} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onFermer} disabled={isPending}>
              Annuler
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isPending ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
