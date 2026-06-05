import { useState, useId } from 'react';
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

import { creerAssistant } from '@/api/utilisateur.api';

const schema = z.object({
  nom: z.string().trim().min(2),
  email: z.string().email(),
  motDePasse: z.string().min(6),
});
type FormData = z.infer<typeof schema>;

interface Props {
  onFermer: () => void;
  onSuccess: () => void;
}

export default function DialogCreerAssistant({ onFermer, onSuccess }: Props) {
  const uid = useId();
  const [showPassword, setShowPassword] = useState(false);

  const { t, i18n } = useTranslation('utilisateurs');
  const { t: tc } = useTranslation('common');
  const estRTL = i18n.language === 'ar';

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { nom: '', email: '', motDePasse: '' },
  });

  const { mutate, isPending } = useMutation({
    mutationFn: creerAssistant,
    onSuccess: (u) => {
      toast.success(`${t('assistant_singular')} ${u.nom} ${t('created_success')}`);
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
      <DialogContent className="sm:max-w-md" showCloseButton={false}>
        <button
          onClick={() => !isPending && onFermer()}
          disabled={isPending}
          aria-label={tc('close')}
          className={`absolute top-4 ${estRTL ? 'left-4' : 'right-4'} rounded-sm opacity-70 
            ring-offset-background transition-opacity hover:opacity-100 focus:outline-none 
            focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none`}
        >
          <X className="h-4 w-4" />
          <span className="sr-only">{tc('close')}</span>
        </button>

        {/* ── Contenu en RTL/LTR ── */}
        <div>
          {/* <div dir={estRTL ? 'rtl' : 'ltr'}> */}
          <DialogHeader>
            <DialogTitle>{t('add_assistant')}</DialogTitle>
            <DialogDescription>{t('create_assistant_desc')}</DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form
              id={`${uid}-form`}
              onSubmit={form.handleSubmit((v) => mutate(v))}
              className="mt-4 space-y-4"
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
                      <Input
                        placeholder={t('form_fullname_placeholder')}
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
                    <FormLabel>{tc('email')} *</FormLabel>
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
                    <FormLabel>{t('form_password')} *</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          placeholder={t('form_password_placeholder')}
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
                  {isPending ? t('creating') : t('create_account')}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
