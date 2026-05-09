import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Scale, Eye, EyeOff, Loader2 } from 'lucide-react';
import type { AxiosError } from 'axios';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

import { login, extraireMessageErreur } from '@/api/auth.api';
import type { ReponseLogin } from '@/api/auth.api';
import { useAuthStore } from '@/stores/auth.store';

const schemaLogin = z.object({
  email: z.string({ required_error: "L'email est requis" }).email('Email invalide'),
  motDePasse: z
    .string({ required_error: 'Le mot de passe est requis' })
    .min(6, 'Minimum 6 caractères'),
});

type FormLogin = z.infer<typeof schemaLogin>;

export default function LoginPage() {
  const navigate = useNavigate();
  const connecter = useAuthStore((s) => s.connecter);
  const [afficherMotDePasse, setAfficherMotDePasse] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormLogin>({
    resolver: zodResolver(schemaLogin),
  });

  const { mutate, isPending, error } = useMutation<ReponseLogin, AxiosError, FormLogin>({
    mutationFn: login,
    onSuccess: ({ accessToken, utilisateur }) => {
      connecter(accessToken, utilisateur);
      navigate(utilisateur.role === 'superadmin' ? '/superadmin/dashboard' : '/cabinet/dashboard');
    },
  });

  const messageErreur = error ? extraireMessageErreur(error) : null;

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      {/* Ambiance de fond */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-60">
        <div className="absolute inset-x-0 top-0 h-56 bg-[radial-gradient(circle_at_top,theme(colors.primary/10),transparent_65%)]" />
        <div className="absolute left-1/2 top-24 h-72 w-72 -translate-x-1/2 rounded-full bg-[color:var(--color-surface-accent)] blur-3xl opacity-40" />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid w-full max-w-5xl items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          {/* Colonne branding */}
          <div className="hidden lg:flex lg:flex-col lg:justify-center">
            <div className="max-w-xl space-y-6">
              <div className="inline-flex items-center gap-3 rounded-full border border-border/70 bg-card/80 px-4 py-2 shadow-sm backdrop-blur">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                  <Scale className="h-5 w-5" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold tracking-tight text-foreground">ERP Avocat</p>
                  <p className="text-xs text-muted-foreground">Plateforme de gestion de cabinet</p>
                </div>
              </div>

              <div className="space-y-4">
                <h1 className="max-w-lg text-4xl font-semibold leading-tight tracking-tight text-foreground">
                  Une interface sobre, rapide et pensée pour la gestion juridique.
                </h1>
                <p className="max-w-xl text-base leading-7 text-muted-foreground">
                  Accédez à votre espace de travail pour piloter vos dossiers, vos clients, vos
                  paiements et l’activité de votre cabinet dans un environnement clair et structuré.
                </p>
              </div>

              <div className="grid max-w-xl grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-border/70 bg-card/70 p-4 shadow-xs backdrop-blur">
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                    Dossiers
                  </p>
                  <p className="mt-2 text-sm font-medium text-foreground">
                    Suivi clair des affaires et statuts
                  </p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-card/70 p-4 shadow-xs backdrop-blur">
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                    Paiements
                  </p>
                  <p className="mt-2 text-sm font-medium text-foreground">
                    Vision nette sur les honoraires
                  </p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-card/70 p-4 shadow-xs backdrop-blur">
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                    Cabinet
                  </p>
                  <p className="mt-2 text-sm font-medium text-foreground">
                    Outil centralisé et professionnel
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Colonne login */}
          <div className="mx-auto flex w-full max-w-md flex-col justify-center">
            <div className="mb-6 flex flex-col items-center gap-3 lg:hidden">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md">
                <Scale className="h-7 w-7" aria-hidden="true" />
              </div>
              <div className="text-center">
                <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                  ERP Avocat
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">Gestion de cabinet juridique</p>
              </div>
            </div>

            <Card className="border-border/70 bg-card/90 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-card/85">
              <CardHeader className="space-y-2 pb-6">
                <div className="space-y-1">
                  <CardTitle className="text-2xl font-semibold tracking-tight">Connexion</CardTitle>
                  <CardDescription className="text-sm leading-6">
                    Entrez vos identifiants pour accéder à votre espace sécurisé.
                  </CardDescription>
                </div>
              </CardHeader>

              <CardContent>
                <form
                  onSubmit={handleSubmit((data) => mutate(data))}
                  className="space-y-5"
                  noValidate
                >
                  {messageErreur && (
                    <Alert variant="destructive" role="alert">
                      <AlertDescription>{messageErreur}</AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="email">Adresse email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="avocat@cabinet.dz"
                      autoComplete="email"
                      disabled={isPending}
                      aria-invalid={!!errors.email}
                      aria-describedby={errors.email ? 'email-error' : undefined}
                      className="h-11"
                      {...register('email')}
                    />
                    {errors.email && (
                      <p id="email-error" className="text-sm text-destructive" role="alert">
                        {errors.email.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="motDePasse">Mot de passe</Label>
                    <div className="relative">
                      <Input
                        id="motDePasse"
                        type={afficherMotDePasse ? 'text' : 'password'}
                        placeholder="••••••••"
                        autoComplete="current-password"
                        disabled={isPending}
                        className="h-11 pr-11"
                        aria-invalid={!!errors.motDePasse}
                        aria-describedby={errors.motDePasse ? 'motdepasse-error' : undefined}
                        {...register('motDePasse')}
                      />
                      <button
                        type="button"
                        onClick={() => setAfficherMotDePasse((v) => !v)}
                        disabled={isPending}
                        className="absolute right-1.5 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
                        aria-label={
                          afficherMotDePasse
                            ? 'Masquer le mot de passe'
                            : 'Afficher le mot de passe'
                        }
                        aria-pressed={afficherMotDePasse}
                      >
                        {afficherMotDePasse ? (
                          <EyeOff className="h-4 w-4" aria-hidden="true" />
                        ) : (
                          <Eye className="h-4 w-4" aria-hidden="true" />
                        )}
                      </button>
                    </div>
                    {errors.motDePasse && (
                      <p id="motdepasse-error" className="text-sm text-destructive" role="alert">
                        {errors.motDePasse.message}
                      </p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    className="h-11 w-full text-sm font-medium"
                    disabled={isPending}
                  >
                    {isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                    )}
                    {isPending ? 'Connexion en cours…' : 'Se connecter'}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <p className="mt-6 text-center text-xs text-muted-foreground">
              ERP SaaS Cabinet d&apos;Avocat © {new Date().getFullYear()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
