import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { AxiosError } from 'axios';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { Loader2, KeyRound, User } from 'lucide-react';
import { toast } from 'sonner';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { modifierMonProfil, type Utilisateur } from '@/api/utilisateur.api';
import { useAuthStore } from '@/stores/auth.store';
import { UtilisateurProfil } from '@/types';

const schema = z
  .object({
    nom: z.string().trim().min(2, 'Minimum 2 caractères'),
    email: z.string().email('Email invalide').toLowerCase(),
    ancienMotDePasse: z.string().optional(),
    motDePasse: z.string().optional(),
    confirmerMotDePasse: z.string().optional(),
  })
  .refine(
    (d) => {
      if (d.motDePasse && d.motDePasse.length > 0) {
        return d.ancienMotDePasse && d.ancienMotDePasse.length >= 1;
      }
      return true;
    },
    { message: "L'ancien mot de passe est requis", path: ['ancienMotDePasse'] }
  )
  .refine(
    (d) => {
      if (d.motDePasse && d.motDePasse.length > 0) {
        return d.motDePasse.length >= 6;
      }
      return true;
    },
    { message: 'Minimum 6 caractères', path: ['motDePasse'] }
  )
  .refine(
    (d) => {
      if (d.motDePasse && d.motDePasse.length > 0) {
        return d.motDePasse === d.confirmerMotDePasse;
      }
      return true;
    },
    { message: 'Les mots de passe ne correspondent pas', path: ['confirmerMotDePasse'] }
  );

type Champs = z.infer<typeof schema>;

interface Props {
  utilisateur: UtilisateurProfil;
  onFermer: () => void;
  onSuccess: (u: Utilisateur) => void;
}

export default function DialogModifierAdmin({ utilisateur, onFermer, onSuccess }: Props) {
  const { definirUtilisateur } = useAuthStore();

  const form = useForm<Champs>({
    resolver: zodResolver(schema),
    defaultValues: {
      nom: utilisateur.nom,
      email: utilisateur.email,
      ancienMotDePasse: '',
      motDePasse: '',
      confirmerMotDePasse: '',
    },
  });

  const { mutate, isPending } = useMutation({
    mutationFn: (valeurs: Champs) =>
      modifierMonProfil({
        nom: valeurs.nom,
        email: valeurs.email,
        ...(valeurs.motDePasse
          ? {
              ancienMotDePasse: valeurs.ancienMotDePasse,
              motDePasse: valeurs.motDePasse,
            }
          : {}),
      }),
    onSuccess: (u) => {
      // Mettre à jour le store auth pour refléter immédiatement les changements
      definirUtilisateur(u);
      toast.success('Profil mis à jour');
      onSuccess(u);
    },
    onError: (err: AxiosError<{ message?: string }>) => {
      const message = err?.response?.data?.message ?? 'Erreur lors de la mise à jour';
      if (message.includes('mot de passe')) {
        form.setError('ancienMotDePasse', { message: 'Ancien mot de passe incorrect' });
      } else if (message.includes('email')) {
        form.setError('email', { message: 'Cet email est déjà utilisé' });
      } else {
        toast.error(message);
      }
    },
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onFermer()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Mon profil
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => mutate(v))} className="space-y-4">
            {/* ── Infos de base ──────────────────────────────────── */}
            <FormField
              control={form.control}
              name="nom"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom complet</FormLabel>
                  <FormControl>
                    <Input placeholder="Maître Benali" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="admin@cabinet.dz" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Separator />

            {/* ── Changement de mot de passe (optionnel) ─────────── */}
            <div className="space-y-1">
              <p className="flex items-center gap-1.5 text-sm font-medium">
                <KeyRound className="h-4 w-4 text-muted-foreground" />
                Changer le mot de passe
                <span className="text-xs font-normal text-muted-foreground">(optionnel)</span>
              </p>
            </div>

            <FormField
              control={form.control}
              name="ancienMotDePasse"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ancien mot de passe</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="motDePasse"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nouveau</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirmerMotDePasse"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirmer</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={onFermer} disabled={isPending}>
                Annuler
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Enregistrer
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
