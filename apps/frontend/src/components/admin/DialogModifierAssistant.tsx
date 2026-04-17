import { useState, useId, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

import { modifierUtilisateur, type Utilisateur } from '@/api/utilisateur.api';

// ─── Schéma ───────────────────────────────────────────────────────────────────
const schema = z.object({
  nom: z.string().trim().min(2, 'Minimum 2 caractères'),
  email: z.string().email('Email invalide'),
  motDePasse: z.string().min(6, 'Minimum 6 caractères').or(z.literal('')),
});
type FormData = z.infer<typeof schema>;

// ─── Props ────────────────────────────────────────────────────────────────────
interface Props {
  utilisateur: Utilisateur;
  onFermer: () => void;
  onSuccess: () => void;
}

// ─── Composant ────────────────────────────────────────────────────────────────
export default function DialogModifierAssistant({ utilisateur, onFermer, onSuccess }: Props) {
  const uid = useId();
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      nom: utilisateur.nom,
      email: utilisateur.email,
      motDePasse: '',
    },
  });

  // Resynchronise les champs du formulaire quand l'utilisateur change
  useEffect(() => {
    form.reset({
      nom: utilisateur.nom,
      email: utilisateur.email,
      motDePasse: '',
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [utilisateur._id]);

  // Réinitialise la visibilité du mot de passe quand l'utilisateur change
  // (séparé intentionnellement pour éviter un setState en cascade dans le même effect)
  useEffect(() => {
    setShowPassword(false);
  }, [utilisateur._id]);

  // ── Mutation ───────────────────────────────────────────────────────────────
  const { mutate, isPending } = useMutation({
    mutationFn: (values: FormData) =>
      modifierUtilisateur(utilisateur._id, {
        nom: values.nom,
        email: values.email,
        ...(values.motDePasse ? { motDePasse: values.motDePasse } : {}),
      }),
    onSuccess: () => {
      toast.success('Assistant modifié avec succès');
      onSuccess();
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      if (msg?.includes('EMAIL_DEJA_UTILISE')) {
        form.setError('email', { message: 'Cet email est déjà utilisé' });
      } else {
        toast.error(msg ?? 'Erreur lors de la modification');
      }
    },
  });

  return (
    <Dialog open onOpenChange={(o) => !o && !isPending && onFermer()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Modifier l'assistant</DialogTitle>
          <DialogDescription>
            Laissez le mot de passe vide pour ne pas le changer.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            id={`${uid}-form`}
            onSubmit={form.handleSubmit((v) => mutate(v))}
            className="space-y-4"
            noValidate
          >
            {/* Nom */}
            <FormField
              control={form.control}
              name="nom"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom complet *</FormLabel>
                  <FormControl>
                    <Input autoComplete="name" disabled={isPending} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Email */}
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email *</FormLabel>
                  <FormControl>
                    <Input type="email" autoComplete="email" disabled={isPending} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Mot de passe */}
            <FormField
              control={form.control}
              name="motDePasse"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Nouveau mot de passe{' '}
                    <span className="font-normal text-muted-foreground">(optionnel)</span>
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Laisser vide pour ne pas changer"
                        className="pr-10"
                        autoComplete="new-password"
                        disabled={isPending}
                        {...field}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2
                          text-muted-foreground hover:text-foreground"
                        onClick={() => setShowPassword((v) => !v)}
                        aria-label={
                          showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'
                        }
                        aria-pressed={showPassword}
                        disabled={isPending}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" aria-hidden="true" />
                        ) : (
                          <Eye className="h-4 w-4" aria-hidden="true" />
                        )}
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={onFermer} disabled={isPending}>
                Annuler
              </Button>
              <Button type="submit" form={`${uid}-form`} disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
                {isPending ? 'Enregistrement…' : 'Enregistrer'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
