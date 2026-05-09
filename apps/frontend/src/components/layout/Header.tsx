import { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { KeyRound, LogOut, Menu, Moon, Sun, User, Users } from 'lucide-react';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

import { logout } from '@/api/auth.api';
import { useAuthStore } from '@/stores/auth.store';
import { initialesAvatar } from '@/lib/utils';

interface HeaderProps {
  titre?: string;
  onToggleSidebar?: () => void;
}

type Theme = 'light' | 'dark';

export default function Header({ titre, onToggleSidebar }: HeaderProps) {
  const navigate = useNavigate();
  const utilisateur = useAuthStore((s) => s.utilisateur);
  const deconnecter = useAuthStore((s) => s.deconnecter);
  const estAdminCabinet = utilisateur?.role === 'admin';

  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === 'undefined') return 'light';
    const saved = sessionStorage.getItem('erp-theme') as Theme | null;
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    sessionStorage.setItem('erp-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((current) => (current === 'dark' ? 'light' : 'dark'));
  };

  const { mutate: seDeconnecter, isPending } = useMutation({
    mutationFn: logout,
    onSettled: () => {
      deconnecter();
      navigate('/login', { replace: true });
    },
  });

  const initiales = utilisateur?.nom ? initialesAvatar(utilisateur.nom) : 'U';

  return (
    <TooltipProvider delayDuration={250}>
      <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-border/70 bg-background/85 px-4 backdrop-blur-md md:px-6">
        {/* Gauche */}
        <div className="flex min-w-0 items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 shrink-0 md:hidden"
            onClick={onToggleSidebar}
            aria-label="Ouvrir le menu de navigation"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </Button>

          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold tracking-tight text-foreground sm:text-lg">
              {titre ?? 'ERP Avocat'}
            </h1>
            <p className="hidden text-xs text-muted-foreground sm:block">
              Gestion opérationnelle du cabinet
            </p>
          </div>
        </div>

        {/* Droite */}
        <div className="flex items-center gap-1.5 shrink-0">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10"
                onClick={toggleTheme}
                aria-label={theme === 'dark' ? 'Passer en mode clair' : 'Passer en mode sombre'}
              >
                {theme === 'dark' ? (
                  <Sun className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Moon className="h-4 w-4" aria-hidden="true" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {theme === 'dark' ? 'Mode clair' : 'Mode sombre'}
            </TooltipContent>
          </Tooltip>

          <Separator orientation="vertical" className="mx-1 h-6" />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="h-10 px-2.5 hover:bg-accent"
                aria-label="Ouvrir le menu utilisateur"
              >
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                    {initiales}
                  </AvatarFallback>
                </Avatar>

                <div className="ml-2 hidden min-w-0 flex-col items-start leading-none sm:flex">
                  <span className="max-w-40 truncate text-sm font-medium text-foreground">
                    {utilisateur?.nom}
                  </span>
                  <span className="text-xs capitalize text-muted-foreground">
                    {utilisateur?.role}
                  </span>
                </div>
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="space-y-1">
                  <p className="truncate text-sm font-medium text-foreground">{utilisateur?.nom}</p>
                  <p className="truncate text-xs text-muted-foreground">{utilisateur?.email}</p>
                </div>
              </DropdownMenuLabel>

              <DropdownMenuSeparator />

              <DropdownMenuItem onClick={() => navigate('/profil')}>
                <User className="mr-2 h-4 w-4" aria-hidden="true" />
                Mon profil
              </DropdownMenuItem>

              <DropdownMenuItem onClick={() => navigate('/mot-de-passe')}>
                <KeyRound className="mr-2 h-4 w-4" aria-hidden="true" />
                Mot de passe
              </DropdownMenuItem>

              {estAdminCabinet && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/cabinet/utilisateurs')}>
                    <Users className="mr-2 h-4 w-4" aria-hidden="true" />
                    Gérer l’équipe
                  </DropdownMenuItem>
                </>
              )}

              <DropdownMenuSeparator />

              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                disabled={isPending}
                onClick={() => seDeconnecter()}
              >
                <LogOut className="mr-2 h-4 w-4" aria-hidden="true" />
                {isPending ? 'Déconnexion…' : 'Se déconnecter'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
    </TooltipProvider>
  );
}
