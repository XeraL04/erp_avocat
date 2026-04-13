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

import { modifierUtilisateur, type Utilisateur } from '@/api/utilisateur.api';

const schema = z.object({
  nom: z.string().trim().min(2, 'Minimum 2 caractères'),
  email: z.string().email('Email invalide'),
  motDePasse: z.string().min(6, 'Minimum 6 caractères').or(z.literal('')),
});
type FormData = z.infer<typeof schema>;

interface Props {
  utilisateur: Utilisateur;
  onFermer: () => void;
  onSuccess: () => void;
}

export default function DialogModifierAssistant({ utilisateur, onFermer, onSuccess }: Props) {
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      nom: utilisateur.nom,
      email: utilisateur.email,
      motDePasse: '',
    },
  });

  const { mutate, isPending } = useMutation({
    mutationFn: (values: FormData) =>
      modifierUtilisateur(utilisateur._id, {
        nom: values.nom,
        email: values.email,
        // Envoyer motDePasse seulement si rempli
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
    <Dialog open onOpenChange={(o) => !o && onFermer()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Modifier l'assistant</DialogTitle>
          <DialogDescription>
            Laissez le mot de passe vide pour ne pas le changer.
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
                    <Input {...field} />
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
                    <Input type="email" {...field} />
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
                {isPending ? 'Enregistrement…' : 'Enregistrer'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
