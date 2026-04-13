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
import { Badge } from '@/components/ui/badge';

import { modifierClient } from '@/api/client.api';
import { extraireMessageErreur } from '@/api/auth.api';
import { nomAffiche } from '@/types';
import type { Client } from '@/types';

// ─── Type formulaire (input) — toujours des strings pour react-hook-form ──────
// z.preprocess infère unknown en entrée ce qui casse useForm<z.infer<schema>>.
// On déclare manuellement le type input (strings) séparé du type output (Zod).
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

// ─── Schéma Zod (output après transformation) ─────────────────────────────────
// z.preprocess convertit '' → undefined avant .min() pour éviter l'échec
// silencieux sur les champs cachés (ex: raisonSociale pour un client physique).
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
    // ✅ Cast nécessaire : le type input du schema est unknown (à cause de preprocess)
    // mais le formulaire travaille avec des strings — le resolver gère la transformation
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
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Modifier le client
            <Badge variant={client.type === 'morale' ? 'secondary' : 'outline'}>
              {client.type === 'physique' ? 'Physique' : 'Morale'}
            </Badge>
          </DialogTitle>
          <DialogDescription>{nomAffiche(client)}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit((data) => mutate(data))} className="space-y-4">
          {client.type === 'physique' ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Prénom</Label>
                  <Input {...register('prenom')} />
                  {errors.prenom && (
                    <p className="text-xs text-destructive">{errors.prenom.message}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label>Nom</Label>
                  <Input {...register('nom')} />
                  {errors.nom && <p className="text-xs text-destructive">{errors.nom.message}</p>}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>CIN</Label>
                <Input {...register('cin')} />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Raison sociale</Label>
                <Input {...register('raisonSociale')} />
                {errors.raisonSociale && (
                  <p className="text-xs text-destructive">{errors.raisonSociale.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Représentant légal</Label>
                <Input {...register('representantLegal')} />
              </div>
              <div className="space-y-1.5">
                <Label>NIF / RC</Label>
                <Input {...register('nifRc')} />
              </div>
            </div>
          )}

          <Separator />

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Téléphone *</Label>
                <Input {...register('telephone')} />
                {errors.telephone && (
                  <p className="text-xs text-destructive">{errors.telephone.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Tél. secondaire</Label>
                <Input {...register('telephoneSecondaire')} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" {...register('email')} />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Adresse</Label>
              <Input {...register('adresse')} />
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea rows={2} {...register('notes')} />
            </div>
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
