import { useState, useId } from 'react';
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

import { creerAssistant } from '@/api/utilisateur.api';

// ─── Schéma ───────────────────────────────────────────────────────────────────
const schema = z.object({
  nom: z.string().trim().min(2, 'Minimum 2 caractères'),
  email: z.string().email('Email invalide'),
  motDePasse: z.string().min(6, 'Minimum 6 caractères'),
});
type FormData = z.infer<typeof schema>;

// ─── Props ────────────────────────────────────────────────────────────────────
interface Props {
  onFermer: () => void;
  onSuccess: () => void;
}

// ─── Composant ────────────────────────────────────────────────────────────────
export default function DialogCreerAssistant({ onFermer, onSuccess }: Props) {
  const uid = useId();
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { nom: '', email: '', motDePasse: '' },
  });

  const { mutate, isPending } = useMutation({
    mutationFn: creerAssistant,
    onSuccess: (u) => {
      toast.success(`Assistant ${u.nom} créé avec succès`);
      onSuccess();
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      if (msg?.includes('EMAIL_DEJA_UTILISE')) {
        form.setError('email', { message: 'Cet email est déjà utilisé' });
      } else {
        toast.error(msg ?? 'Erreur lors de la création');
      }
    },
  });

  return (
    // Guard !isPending : empêche la fermeture pendant une mutation
    <Dialog open onOpenChange={(o) => !o && !isPending && onFermer()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ajouter un assistant</DialogTitle>
          <DialogDescription>
            L'assistant pourra se connecter avec ces identifiants et accéder aux dossiers du
            cabinet.
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
                    <Input
                      placeholder="Ex : Amira Benali"
                      autoComplete="name"
                      disabled={isPending}
                      {...field}
                    />
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
                    <Input
                      type="email"
                      placeholder="assistant@cabinet.dz"
                      autoComplete="email"
                      disabled={isPending}
                      {...field}
                    />
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
                  <FormLabel>Mot de passe *</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Minimum 6 caractères"
                        className="pr-10"
                        autoComplete="new-password"
                        disabled={isPending}
                        {...field}
                      />
                      {/*
                        aria-label dynamique : annonce l'action ET l'état actuel
                        aria-controls pointe sur l'input mot de passe via useId
                      */}
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
                {isPending ? 'Création…' : 'Créer le compte'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
