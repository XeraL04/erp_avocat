import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { AxiosError } from 'axios';

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { modifierTenant } from '@/api/superadmin.api';
import { extraireMessageErreur } from '@/api/auth.api';
import type { Tenant } from '@/types';

const schemaModifier = z.object({
  nom: z.string().min(2, 'Minimum 2 caractères'),
  email: z.string().email('Email invalide'),
  telephone: z.string().min(9, 'Numéro invalide'),
  adresse: z.string().optional(),
  plan: z.enum(['starter', 'pro', 'premium']),
});

type FormModifier = z.infer<typeof schemaModifier>;

interface Props {
  tenant: Tenant;
  ouvert: boolean;
  onFermer: () => void;
}

export default function DialogModifierTenant({ tenant, ouvert, onFermer }: Props) {
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<FormModifier>({
    resolver: zodResolver(schemaModifier),
  });

  // Pré-remplir à chaque ouverture avec les données actuelles du tenant
  useEffect(() => {
    if (tenant) {
      reset({
        nom: tenant.nom,
        email: tenant.email,
        telephone: tenant.telephone,
        adresse: tenant.adresse ?? '',
        plan: tenant.plan,
      });
    }
  }, [tenant, reset]);

  const { mutate, isPending } = useMutation({
    mutationFn: (data: FormModifier) => modifierTenant(tenant._id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superadmin', 'tenants'] });
      queryClient.invalidateQueries({ queryKey: ['superadmin', 'tenant', tenant._id] });
      toast.success('Cabinet modifié avec succès');
      onFermer();
    },
    onError: (erreur: unknown) => {
      toast.error(extraireMessageErreur(erreur as AxiosError));
    },
  });

  return (
    <Dialog open={ouvert} onOpenChange={() => !isPending && onFermer()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Modifier le cabinet</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit((data) => mutate(data))} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Nom du cabinet *</Label>
            <Input {...register('nom')} />
            {errors.nom && <p className="text-xs text-destructive">{errors.nom.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Email *</Label>
              <Input type="email" {...register('email')} />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Téléphone *</Label>
              <Input {...register('telephone')} />
              {errors.telephone && (
                <p className="text-xs text-destructive">{errors.telephone.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Adresse</Label>
            <Input {...register('adresse')} />
          </div>

          {/* Plan — contrôlé via Controller pour que reset() reflète la valeur */}
          <div className="space-y-1.5">
            <Label>Plan *</Label>
            <Controller
              name="plan"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="starter">Starter</SelectItem>
                    <SelectItem value="pro">Pro</SelectItem>
                    <SelectItem value="premium">Premium</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            {errors.plan && <p className="text-xs text-destructive">{errors.plan.message}</p>}
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
