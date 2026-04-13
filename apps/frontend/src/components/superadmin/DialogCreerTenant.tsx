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
  DialogDescription,
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
import { Separator } from '@/components/ui/separator';

import { creerTenant } from '@/api/superadmin.api';
import { extraireMessageErreur } from '@/api/auth.api';

// Convertit un nom en slug valide : "Cabinet Maître Benali" → "cabinet-maitre-benali"
function genererSlug(nom: string): string {
  return nom
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

const schemaCreerTenant = z.object({
  nom: z.string().min(2, 'Minimum 2 caractères'),
  slug: z
    .string()
    .min(2, 'Minimum 2 caractères')
    .regex(/^[a-z0-9-]+$/, 'Lettres minuscules, chiffres et tirets uniquement'),
  email: z.string().email('Email invalide'),
  telephone: z
    .string()
    .min(9, 'Numéro invalide')
    .regex(/^[0-9+\s]+$/, 'Format invalide'),
  adresse: z.string().optional(),
  plan: z.enum(['starter', 'pro', 'premium']),
  adminNom: z.string().min(2, 'Minimum 2 caractères'),
  adminEmail: z.string().email('Email invalide'),
  adminMotDePasse: z.string().min(6, 'Minimum 6 caractères'),
});

type FormCreerTenant = z.infer<typeof schemaCreerTenant>;

interface Props {
  ouvert: boolean;
  onFermer: () => void;
}

export default function DialogCreerTenant({ ouvert, onFermer }: Props) {
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    control,
    formState: { errors },
  } = useForm<FormCreerTenant>({
    resolver: zodResolver(schemaCreerTenant),
    defaultValues: { plan: 'starter' },
  });

  const slugActuel = watch('slug') ?? '';

  // onChange intégré dans register — slug généré automatiquement à chaque frappe
  const handleNomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nom = e.target.value;
    setValue('nom', nom, { shouldDirty: true, shouldValidate: false });
    setValue('slug', genererSlug(nom), { shouldValidate: false });
  };

  const { mutate, isPending } = useMutation({
    mutationFn: creerTenant,
    onSuccess: (tenant) => {
      queryClient.invalidateQueries({ queryKey: ['superadmin', 'tenants'] });
      queryClient.invalidateQueries({ queryKey: ['superadmin', 'dashboard'] });
      toast.success(`Cabinet "${tenant.nom}" créé avec succès`);
      reset();
      onFermer();
    },
    onError: (erreur: unknown) => {
      toast.error(extraireMessageErreur(erreur as AxiosError));
    },
  });

  const handleFermer = () => {
    if (!isPending) {
      reset();
      onFermer();
    }
  };

  return (
    <Dialog open={ouvert} onOpenChange={handleFermer}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nouveau cabinet</DialogTitle>
          <DialogDescription>
            Créez un cabinet et son compte administrateur en une seule étape.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit((data) => mutate(data))} className="space-y-5">
          {/* ── Informations cabinet ───────────────────────────────── */}
          <div className="space-y-3">
            <p className="text-sm font-semibold">Informations du cabinet</p>

            {/* Nom → génère le slug automatiquement */}
            <div className="space-y-1.5">
              <Label htmlFor="nom">Nom du cabinet *</Label>
              <Input
                id="nom"
                placeholder="Cabinet Maître Benali"
                {...register('nom', {
                  onChange: handleNomChange,
                })}
              />
              {errors.nom && <p className="text-xs text-destructive">{errors.nom.message}</p>}
            </div>

            {/* Slug — éditable manuellement si besoin */}
            <div className="space-y-1.5">
              <Label htmlFor="slug">
                Slug (URL) *
                <span className="ml-2 text-xs text-muted-foreground font-normal">
                  généré automatiquement
                </span>
              </Label>
              <Input id="slug" placeholder="cabinet-maitre-benali" {...register('slug')} />
              {slugActuel && (
                <p className="text-xs text-muted-foreground">
                  URL : /cabinet/<strong>{slugActuel}</strong>
                </p>
              )}
              {errors.slug && <p className="text-xs text-destructive">{errors.slug.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email cabinet *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="contact@cabinet.dz"
                  {...register('email')}
                />
                {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="telephone">Téléphone *</Label>
                <Input id="telephone" placeholder="0550 00 00 00" {...register('telephone')} />
                {errors.telephone && (
                  <p className="text-xs text-destructive">{errors.telephone.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="adresse">Adresse</Label>
              <Input
                id="adresse"
                placeholder="Rue Didouche Mourad, Alger"
                {...register('adresse')}
              />
            </div>

            {/* Plan — contrôlé via Controller pour que reset() fonctionne */}
            <div className="space-y-1.5">
              <Label>Plan d'abonnement *</Label>
              <Controller
                name="plan"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="starter">
                        Starter — 50 dossiers · 2 utilisateurs
                      </SelectItem>
                      <SelectItem value="pro">Pro — 200 dossiers · 5 utilisateurs</SelectItem>
                      <SelectItem value="premium">Premium — Illimité</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.plan && <p className="text-xs text-destructive">{errors.plan.message}</p>}
            </div>
          </div>

          <Separator />

          {/* ── Compte administrateur ──────────────────────────────── */}
          <div className="space-y-3">
            <p className="text-sm font-semibold">Compte administrateur</p>

            <div className="space-y-1.5">
              <Label htmlFor="adminNom">Nom complet *</Label>
              <Input id="adminNom" placeholder="Maître Ahmed Benali" {...register('adminNom')} />
              {errors.adminNom && (
                <p className="text-xs text-destructive">{errors.adminNom.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="adminEmail">Email *</Label>
                <Input
                  id="adminEmail"
                  type="email"
                  placeholder="admin@cabinet.dz"
                  {...register('adminEmail')}
                />
                {errors.adminEmail && (
                  <p className="text-xs text-destructive">{errors.adminEmail.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="adminMotDePasse">Mot de passe *</Label>
                <Input
                  id="adminMotDePasse"
                  type="password"
                  placeholder="Min. 6 caractères"
                  {...register('adminMotDePasse')}
                />
                {errors.adminMotDePasse && (
                  <p className="text-xs text-destructive">{errors.adminMotDePasse.message}</p>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleFermer} disabled={isPending}>
              Annuler
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isPending ? 'Création...' : 'Créer le cabinet'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
