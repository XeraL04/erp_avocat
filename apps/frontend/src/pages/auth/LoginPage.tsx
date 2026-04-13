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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

import { login, extraireMessageErreur } from '@/api/auth.api';
import type { ReponseLogin } from '@/api/auth.api';
import { useAuthStore } from '@/stores/auth.store';

// Schéma Zod — miroir du backend
const schemaLogin = z.object({
  email: z
    .string({ required_error: "L'email est requis" })
    .email('Email invalide'),
  motDePasse: z
    .string({ required_error: 'Le mot de passe est requis' })
    .min(6, 'Minimum 6 caractères'),
});

type FormLogin = z.infer<typeof schemaLogin>;

// Pas de "JSX.Element" — utiliser React.ReactElement ou laisser inférer
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

  // Génériques explicites : <DataRetour, TypeErreur, VariablesEnvoyées>
  const {
    mutate,
    isPending,
    error,
  } = useMutation<ReponseLogin, AxiosError, FormLogin>({
    mutationFn: login,
    onSuccess: ({ accessToken, utilisateur }) => {
      connecter(accessToken, utilisateur);

      if (utilisateur.role === 'superadmin') {
        navigate('/superadmin/dashboard');
      } else {
        navigate('/cabinet/dashboard');
      }
    },
  });

  // Extraction du message sans "any" — via le helper typé
  const messageErreur = error ? extraireMessageErreur(error) : null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo + Titre */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md">
            <Scale className="h-7 w-7" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight">
              ERP Avocat
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Gestion de cabinet juridique
            </p>
          </div>
        </div>

        {/* Formulaire */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">Connexion</CardTitle>
            <CardDescription>
              Entrez vos identifiants pour accéder à votre espace
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={handleSubmit((data) => mutate(data))}
              className="space-y-4"
            >
              {/* Alerte erreur backend */}
              {messageErreur && (
                <Alert variant="destructive">
                  <AlertDescription>{messageErreur}</AlertDescription>
                </Alert>
              )}

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email">Adresse email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="avocat@cabinet.dz"
                  autoComplete="email"
                  disabled={isPending}
                  {...register('email')}
                />
                {errors.email && (
                  <p className="text-sm text-destructive">
                    {errors.email.message}
                  </p>
                )}
              </div>

              {/* Mot de passe */}
              <div className="space-y-2">
                <Label htmlFor="motDePasse">Mot de passe</Label>
                <div className="relative">
                  <Input
                    id="motDePasse"
                    type={afficherMotDePasse ? 'text' : 'password'}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    disabled={isPending}
                    className="pr-10"
                    {...register('motDePasse')}
                  />
                  <button
                    type="button"
                    onClick={() => setAfficherMotDePasse((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={
                      afficherMotDePasse
                        ? 'Masquer le mot de passe'
                        : 'Afficher le mot de passe'
                    }
                  >
                    {afficherMotDePasse ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {errors.motDePasse && (
                  <p className="text-sm text-destructive">
                    {errors.motDePasse.message}
                  </p>
                )}
              </div>

              {/* Bouton submit */}
              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {isPending ? 'Connexion...' : 'Se connecter'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          ERP SaaS Cabinet d'Avocat © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}