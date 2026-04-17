import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { Resolver } from 'react-hook-form';
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
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';

import { modifierClient } from '@/api/client.api';
import { extraireMessageErreur } from '@/api/auth.api';
import { nomAffiche } from '@/types';
import type { Client } from '@/types';

// ─── Type formulaire input ────────────────────────────────────────────────────
interface FormModifier {
  telephone: string;
  nom?: string;
  prenom?: string;
  cin?: string;
  raisonSociale?: string;
  representantLegal?: string;
  nifRc?: string;
  telephoneSecondaire?: string;
  email?: string;
  adresse?: string;
  notes?: string;
}

// ─── Schéma Zod ───────────────────────────────────────────────────────────────
const vide = (min?: number) =>
  z.preprocess(
    (v) => (v === '' ? undefined : v),
    min ? z.string().min(min, `Minimum ${min} caractères`).optional() : z.string().optional()
  );

const schema = z.object({
  nom: vide(2),
  prenom: vide(2),
  cin: vide(),
  raisonSociale: vide(2),
  representantLegal: vide(),
  nifRc: vide(),
  telephone: z
    .string()
    .min(9, 'Numéro invalide')
    .regex(/^[0-9+\s]+$/, 'Format invalide'),
  telephoneSecondaire: vide(),
  email: z.preprocess(
    (v) => (v === '' ? undefined : v),
    z.string().email('Email invalide').optional()
  ),
  adresse: vide(),
  notes: vide(),
});

// ─── Composant ────────────────────────────────────────────────────────────────
interface Props {
  client: Client;
  onFermer: () => void;
}

export default function DialogModifierClient({ client, onFermer }: Props) {
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormModifier>({
    resolver: zodResolver(schema) as Resolver<FormModifier>,
    defaultValues: {
      nom: client.nom ?? '',
      prenom: client.prenom ?? '',
      cin: client.cin ?? '',
      raisonSociale: client.raisonSociale ?? '',
      representantLegal: client.representantLegal ?? '',
      nifRc: client.nifRc ?? '',
      telephone: client.telephone,
      telephoneSecondaire: client.telephoneSecondaire ?? '',
      email: client.email ?? '',
      adresse: client.adresse ?? '',
      notes: client.notes ?? '',
    },
  });

  useEffect(() => {
    reset({
      nom: client.nom ?? '',
      prenom: client.prenom ?? '',
      cin: client.cin ?? '',
      raisonSociale: client.raisonSociale ?? '',
      representantLegal: client.representantLegal ?? '',
      nifRc: client.nifRc ?? '',
      telephone: client.telephone,
      telephoneSecondaire: client.telephoneSecondaire ?? '',
      email: client.email ?? '',
      adresse: client.adresse ?? '',
      notes: client.notes ?? '',
    });
  }, [client, reset]);

  const { mutate, isPending } = useMutation({
    mutationFn: (data: FormModifier) => modifierClient(client._id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cabinet', 'clients'] });
      queryClient.invalidateQueries({ queryKey: ['cabinet', 'client', client._id] });
      toast.success('Client modifié avec succès');
      onFermer();
    },
    onError: (err: unknown) => {
      toast.error(extraireMessageErreur(err as AxiosError));
    },
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onFermer()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Modifier le client
            {/* Badge type — span inline, cohérent avec le reste du projet */}
            <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
              {client.type === 'physique' ? 'Physique' : 'Morale'}
            </span>
          </DialogTitle>
          <DialogDescription>{nomAffiche(client)}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit((data) => mutate(data))} className="space-y-4" noValidate>
          {/* ── Champs spécifiques au type ─────────────────────── */}
          {client.type === 'physique' ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="mod-prenom">Prénom</Label>
                  <Input
                    id="mod-prenom"
                    disabled={isPending}
                    aria-invalid={!!errors.prenom}
                    aria-describedby={errors.prenom ? 'mod-prenom-error' : undefined}
                    {...register('prenom')}
                  />
                  {errors.prenom && (
                    <p id="mod-prenom-error" className="text-xs text-destructive" role="alert">
                      {errors.prenom.message}
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="mod-nom">Nom</Label>
                  <Input
                    id="mod-nom"
                    disabled={isPending}
                    aria-invalid={!!errors.nom}
                    aria-describedby={errors.nom ? 'mod-nom-error' : undefined}
                    {...register('nom')}
                  />
                  {errors.nom && (
                    <p id="mod-nom-error" className="text-xs text-destructive" role="alert">
                      {errors.nom.message}
                    </p>
                  )}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mod-cin">
                  Numéro d'identification nationale
                  <span className="ml-1 text-xs font-normal text-muted-foreground">
                    (optionnel)
                  </span>
                </Label>
                <Input
                  id="mod-cin"
                  maxLength={18}
                  inputMode="numeric"
                  disabled={isPending}
                  {...register('cin')}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="mod-rs">Raison sociale</Label>
                <Input
                  id="mod-rs"
                  disabled={isPending}
                  aria-invalid={!!errors.raisonSociale}
                  aria-describedby={errors.raisonSociale ? 'mod-rs-error' : undefined}
                  {...register('raisonSociale')}
                />
                {errors.raisonSociale && (
                  <p id="mod-rs-error" className="text-xs text-destructive" role="alert">
                    {errors.raisonSociale.message}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mod-rep">Représentant légal</Label>
                <Input id="mod-rep" disabled={isPending} {...register('representantLegal')} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mod-nif">NIF / RC</Label>
                <Input id="mod-nif" disabled={isPending} {...register('nifRc')} />
              </div>
            </div>
          )}

          <Separator />

          {/* ── Champs communs ──────────────────────────────────── */}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="mod-tel">Téléphone *</Label>
                <Input
                  id="mod-tel"
                  disabled={isPending}
                  aria-invalid={!!errors.telephone}
                  aria-describedby={errors.telephone ? 'mod-tel-error' : undefined}
                  {...register('telephone')}
                />
                {errors.telephone && (
                  <p id="mod-tel-error" className="text-xs text-destructive" role="alert">
                    {errors.telephone.message}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mod-tel2">Tél. secondaire</Label>
                <Input id="mod-tel2" disabled={isPending} {...register('telephoneSecondaire')} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="mod-email">Email</Label>
              <Input
                id="mod-email"
                type="email"
                disabled={isPending}
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? 'mod-email-error' : undefined}
                {...register('email')}
              />
              {errors.email && (
                <p id="mod-email-error" className="text-xs text-destructive" role="alert">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="mod-adresse">Adresse</Label>
              <Input id="mod-adresse" disabled={isPending} {...register('adresse')} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="mod-notes">Notes</Label>
              <Textarea
                id="mod-notes"
                rows={2}
                className="resize-none"
                disabled={isPending}
                {...register('notes')}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onFermer} disabled={isPending}>
              Annuler
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
              {isPending ? 'Enregistrement en cours…' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
