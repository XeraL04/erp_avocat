// // src/components/profile/ChangePasswordDialog.tsx

import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff, KeyRound, Loader2 } from 'lucide-react';

import { changerMotDePasse, extraireMessageErreur } from '@/api/auth.api';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';

type Props = {
  children: React.ReactNode;
};

export default function ChangePasswordDialog({ children }: Props) {
  const { t, i18n } = useTranslation('profile');
  const [open, setOpen] = useState(false);

  const [showPasswords, setShowPasswords] = useState({
    old: false,
    new: false,
    confirm: false,
  });

  const toggleShow = (field: 'old' | 'new' | 'confirm') =>
    setShowPasswords((prev) => ({ ...prev, [field]: !prev[field] }));

  const langue = i18n.language?.startsWith('ar') ? 'ar' : 'fr';
  const rtl = langue === 'ar';

  const schema = useMemo(
    () =>
      z
        .object({
          ancienMotDePasse: z
            .string()
            .min(1, t('profile.passwordModal.validation.currentPasswordRequired')),
          nouveauMotDePasse: z
            .string()
            .min(6, t('profile.passwordModal.validation.newPasswordMin')),
          confirmerMotDePasse: z
            .string()
            .min(1, t('profile.passwordModal.validation.confirmPasswordRequired')),
        })
        .refine((data) => data.nouveauMotDePasse === data.confirmerMotDePasse, {
          path: ['confirmerMotDePasse'],
          message: t('profile.passwordModal.validation.passwordsMismatch'),
        }),
    [t]
  );

  type FormValues = z.infer<typeof schema>;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      ancienMotDePasse: '',
      nouveauMotDePasse: '',
      confirmerMotDePasse: '',
    },
  });

  const {
    mutate,
    isPending,
    isSuccess,
    error,
    reset: resetMutation,
  } = useMutation({
    mutationFn: (values: FormValues) =>
      changerMotDePasse({
        ancienMotDePasse: values.ancienMotDePasse,
        nouveauMotDePasse: values.nouveauMotDePasse,
      }),
    onSuccess: () => {
      reset();
    },
  });

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      reset();
      resetMutation();
      setShowPasswords({ old: false, new: false, confirm: false });
    }
    setOpen(nextOpen);
  };

  const onSubmit = (values: FormValues) => {
    mutate(values);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>

      <DialogContent dir={rtl ? 'rtl' : 'ltr'} className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('profile.passwordModal.title')}</DialogTitle>
          <DialogDescription>{t('profile.passwordModal.description')}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{extraireMessageErreur(error)}</AlertDescription>
            </Alert>
          ) : null}

          {isSuccess ? (
            <Alert>
              <AlertDescription>{t('profile.passwordModal.successMessage')}</AlertDescription>
            </Alert>
          ) : null}

          {/* Ancien mot de passe */}
          <div className="space-y-2">
            <Label htmlFor="ancienMotDePasse">
              {t('profile.passwordModal.fields.currentPassword')}
            </Label>
            <div className="relative">
              <Input
                id="ancienMotDePasse"
                type={showPasswords.old ? 'text' : 'password'}
                autoComplete="current-password"
                disabled={isPending}
                className="pr-10"
                {...register('ancienMotDePasse')}
              />
              <button
                type="button"
                onClick={() => toggleShow('old')}
                className="absolute inset-y-0 right-3 flex items-center text-muted-foreground"
                aria-label={
                  showPasswords.old
                    ? t('profile.passwordModal.actions.hidePassword')
                    : t('profile.passwordModal.actions.showPassword')
                }
              >
                {showPasswords.old ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.ancienMotDePasse ? (
              <p className="text-sm text-destructive">{errors.ancienMotDePasse.message}</p>
            ) : null}
          </div>

          {/* Nouveau mot de passe */}
          <div className="space-y-2">
            <Label htmlFor="nouveauMotDePasse">
              {t('profile.passwordModal.fields.newPassword')}
            </Label>
            <div className="relative">
              <Input
                id="nouveauMotDePasse"
                type={showPasswords.new ? 'text' : 'password'}
                autoComplete="new-password"
                disabled={isPending}
                className="pr-10"
                {...register('nouveauMotDePasse')}
              />
              <button
                type="button"
                onClick={() => toggleShow('new')}
                className="absolute inset-y-0 right-3 flex items-center text-muted-foreground"
                aria-label={
                  showPasswords.new
                    ? t('profile.passwordModal.actions.hidePassword')
                    : t('profile.passwordModal.actions.showPassword')
                }
              >
                {showPasswords.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.nouveauMotDePasse ? (
              <p className="text-sm text-destructive">{errors.nouveauMotDePasse.message}</p>
            ) : null}
          </div>

          {/* Confirmer mot de passe */}
          <div className="space-y-2">
            <Label htmlFor="confirmerMotDePasse">
              {t('profile.passwordModal.fields.confirmPassword')}
            </Label>
            <div className="relative">
              <Input
                id="confirmerMotDePasse"
                type={showPasswords.confirm ? 'text' : 'password'}
                autoComplete="new-password"
                disabled={isPending}
                className="pr-10"
                {...register('confirmerMotDePasse')}
              />
              <button
                type="button"
                onClick={() => toggleShow('confirm')}
                className="absolute inset-y-0 right-3 flex items-center text-muted-foreground"
                aria-label={
                  showPasswords.confirm
                    ? t('profile.passwordModal.actions.hidePassword')
                    : t('profile.passwordModal.actions.showPassword')
                }
              >
                {showPasswords.confirm ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {errors.confirmerMotDePasse ? (
              <p className="text-sm text-destructive">{errors.confirmerMotDePasse.message}</p>
            ) : null}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              {t('profile.passwordModal.actions.cancel')}
            </Button>

            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <Loader2
                  className={rtl ? 'ml-2 h-4 w-4 animate-spin' : 'mr-2 h-4 w-4 animate-spin'}
                />
              ) : (
                <KeyRound className={rtl ? 'ml-2 h-4 w-4' : 'mr-2 h-4 w-4'} />
              )}
              {t('profile.passwordModal.actions.submit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
