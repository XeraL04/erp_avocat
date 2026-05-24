import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
// import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Mail,
  Shield,
  User2,
  CheckCircle2,
  XCircle,
  Building2,
  CalendarDays,
  RefreshCw,
  KeyRound,
} from 'lucide-react';

import { getMonProfil, extraireMessageErreur } from '@/api/auth.api';
import { useAuthStore } from '@/stores/auth.store';
import type { UtilisateurProfil } from '@/types';

import ChangePasswordDialog from '@/components/profile/ChangePasswordDialog';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

function formaterDate(date: string | undefined, locale: string, fallback: string) {
  if (!date) return fallback;

  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return fallback;

  const localeMap: Record<string, string> = {
    fr: 'fr-FR',
    ar: 'ar-DZ',
  };

  return parsed.toLocaleDateString(localeMap[locale] ?? 'fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function couleurRole(role: UtilisateurProfil['role']) {
  switch (role) {
    case 'superadmin':
      return 'destructive';
    case 'admin':
      return 'default';
    case 'assistant':
      return 'secondary';
    default:
      return 'outline';
  }
}

export default function ProfilePage() {
  // const navigate = useNavigate();
  const { t, i18n } = useTranslation('profile');

  console.log('langue actuelle:', i18n.language);

  const definirUtilisateur = useAuthStore((state) => state.definirUtilisateur);

  const {
    data: profil,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['auth', 'me', i18n.language],
    queryFn: getMonProfil,
    staleTime: 1000 * 60 * 5,
  });

  useEffect(() => {
    if (profil) {
      definirUtilisateur(profil);
    }
  }, [profil, definirUtilisateur]);

  const langue = i18n.language?.startsWith('ar') ? 'ar' : 'fr';
  const rtl = langue === 'ar';
  const fallback = t('common.notAvailable');

  if (isLoading) {
    return (
      <div className="space-y-6" dir={rtl ? 'rtl' : 'ltr'}>
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <Skeleton className="h-72 xl:col-span-2" />
          <Skeleton className="h-72" />
        </div>

        <Skeleton className="h-44 w-full" />
      </div>
    );
  }

  if (isError || !profil) {
    return (
      <div className="space-y-6" dir={rtl ? 'rtl' : 'ltr'}>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('profile.title')}</h1>
          <p className="text-muted-foreground">{t('profile.subtitle')}</p>
        </div>

        <Alert variant="destructive">
          <AlertTitle>{t('common.error')}</AlertTitle>
          <AlertDescription>
            {extraireMessageErreur(error) || t('profile.loadError')}
          </AlertDescription>
        </Alert>

        <div className="flex gap-3">
          <Button onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={rtl ? 'ml-2 h-4 w-4' : 'mr-2 h-4 w-4'} />
            {t('common.retry')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir={rtl ? 'rtl' : 'ltr'}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('profile.title')}</h1>
          <p className="text-muted-foreground">{t('profile.subtitle')}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={rtl ? 'ml-2 h-4 w-4' : 'mr-2 h-4 w-4'} />
            {t('profile.refresh')}
          </Button>

          <ChangePasswordDialog>
            <Button>
              <KeyRound className={rtl ? 'ml-2 h-4 w-4' : 'mr-2 h-4 w-4'} />
              {t('profile.changePassword')}
            </Button>
          </ChangePasswordDialog>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>{t('profile.personalInfo')}</CardTitle>
            <CardDescription>{t('profile.personalInfoDescription')}</CardDescription>
          </CardHeader>

          <CardContent className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="flex items-start gap-3 rounded-lg border p-4">
              <User2 className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="space-y-1 min-w-0">
                <p className="text-sm text-muted-foreground">{t('profile.fields.name')}</p>
                <p className="font-medium wrap-break-words">{profil.nom || fallback}</p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-lg border p-4">
              <Mail className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="space-y-1 min-w-0">
                <p className="text-sm text-muted-foreground">{t('profile.fields.email')}</p>
                <p className="font-medium break-all">{profil.email || fallback}</p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-lg border p-4">
              <Shield className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">{t('profile.fields.role')}</p>
                <Badge variant={couleurRole(profil.role)}>{t(`roles.${profil.role}`)}</Badge>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-lg border p-4">
              {profil.actif ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
              ) : (
                <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
              )}
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">{t('profile.fields.status')}</p>
                <p className="font-medium">
                  {profil.actif ? t('status.active') : t('status.inactive')}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-lg border p-4">
              <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="space-y-1 min-w-0">
                <p className="text-sm text-muted-foreground">{t('profile.fields.tenantId')}</p>
                <p className="font-medium break-all">{profil.tenantId ?? fallback}</p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-lg border p-4">
              <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">{t('profile.fields.createdAt')}</p>
                <p className="font-medium">{formaterDate(profil.createdAt, langue, fallback)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('profile.accountCard.title')}</CardTitle>
            <CardDescription>{t('profile.accountCard.description')}</CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">
                {t('profile.accountCard.connectedAs')}
              </p>
              <p className="mt-1 font-semibold wrap-break-words">{profil.nom || fallback}</p>
              <p className="text-sm text-muted-foreground break-all">{profil.email || fallback}</p>
            </div>

            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">
                {t('profile.accountCard.accessLevel')}
              </p>
              <div className="mt-2">
                <Badge variant={couleurRole(profil.role)}>{t(`roles.${profil.role}`)}</Badge>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <ChangePasswordDialog>
                <Button className="w-full">
                  <KeyRound className={rtl ? 'ml-2 h-4 w-4' : 'mr-2 h-4 w-4'} />
                  {t('profile.changePassword')}
                </Button>
              </ChangePasswordDialog>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => refetch()}
                disabled={isFetching}
              >
                <RefreshCw className={rtl ? 'ml-2 h-4 w-4' : 'mr-2 h-4 w-4'} />
                {t('profile.refresh')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
