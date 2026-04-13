import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
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

const schema = z.object({
  nom: z.string().trim().min(2, 'Minimum 2 caractères'),
  email: z.string().email('Email invalide'),
  motDePasse: z.string().min(6, 'Minimum 6 caractères'),
});
type FormData = z.infer<typeof schema>;

interface Props {
  onFermer: () => void;
  onSuccess: () => void;
}

export default function DialogCreerAssistant({ onFermer, onSuccess }: Props) {
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
    <Dialog open onOpenChange={(o) => !o && onFermer()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ajouter un assistant</DialogTitle>
          <DialogDescription>
            L'assistant pourra se connecter avec ces identifiants et accéder aux dossiers du
            cabinet.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => mutate(v))} className="space-y-4">
            <FormField
              control={form.control}
              name="nom"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom complet *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex : Amira Benali" {...field} />
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
                  <FormLabel>Email *</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="assistant@cabinet.dz" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                        {...field}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2"
                        onClick={() => setShowPassword((v) => !v)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
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
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isPending ? 'Création…' : 'Créer le compte'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
