import { useState, useId, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Eye, EyeOff, X } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

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
  nom: z.string().trim().min(2),
  email: z.string().email(),
  motDePasse: z.string().min(6).or(z.literal('')),
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

  const { t, i18n } = useTranslation('utilisateurs');
  const { t: tc } = useTranslation('common');
  const estRTL = i18n.language === 'ar';

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      nom: utilisateur.nom,
      email: utilisateur.email,
      motDePasse: '',
    },
  });

  useEffect(() => {
    form.reset({ nom: utilisateur.nom, email: utilisateur.email, motDePasse: '' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [utilisateur._id]);

  useEffect(() => {
    setShowPassword(false);
  }, [utilisateur._id]);

  const { mutate, isPending } = useMutation({
    mutationFn: (values: FormData) =>
      modifierUtilisateur(utilisateur._id, {
        nom: values.nom,
        email: values.email,
        ...(values.motDePasse ? { motDePasse: values.motDePasse } : {}),
      }),
    onSuccess: () => {
      toast.success(t('assistant_updated_toast'));
      onSuccess();
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      if (msg?.includes('EMAIL_DEJA_UTILISE')) {
        form.setError('email', { message: t('email_already_used') });
      } else {
        toast.error(msg ?? tc('error'));
      }
    },
  });

  return (
    <Dialog open onOpenChange={(o) => !o && !isPending && onFermer()}>
      <DialogContent className="sm:max-w-md" dir={estRTL ? 'rtl' : 'ltr'} showCloseButton={false}>
        {/* X custom — inset-inline-end s'adapte RTL/LTR automatiquement */}
        <button
          onClick={() => !isPending && onFermer()}
          disabled={isPending}
          aria-label={tc('close')}
          className="absolute z-10 rounded-sm opacity-70 ring-offset-background
            transition-opacity hover:opacity-100 focus:outline-none focus:ring-2
            focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
          style={{ insetInlineEnd: '1rem', insetBlockStart: '1rem' }}
        >
          <X className="h-4 w-4" />
          <span className="sr-only">{tc('close')}</span>
        </button>

        <DialogHeader>
          <DialogTitle>{t('edit_assistant')}</DialogTitle>
          <DialogDescription>{t('edit_assistant_desc')}</DialogDescription>
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
                  <FormLabel>{t('form_fullname')} *</FormLabel>
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
                  <FormLabel>{tc('email')} *</FormLabel>
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
                    {t('form_new_password')}{' '}
                    <span className="font-normal text-muted-foreground">({tc('optional')})</span>
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        placeholder={t('form_password_empty_hint')}
                        className={estRTL ? 'pl-10' : 'pr-10'}
                        autoComplete="new-password"
                        disabled={isPending}
                        {...field}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className={`absolute top-1/2 h-7 w-7 -translate-y-1/2
                          text-muted-foreground hover:text-foreground
                          ${estRTL ? 'left-1' : 'right-1'}`}
                        onClick={() => setShowPassword((v) => !v)}
                        aria-label={showPassword ? t('hide_password') : t('show_password')}
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
                {tc('cancel')}
              </Button>
              <Button type="submit" form={`${uid}-form`} disabled={isPending}>
                {isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                {isPending ? tc('saving') : tc('save')}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
