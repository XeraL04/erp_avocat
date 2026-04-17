import { LogOut, User, KeyRound, Users, Menu, Sun, Moon } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';

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

export default function Header({ titre, onToggleSidebar }: HeaderProps) {
  const navigate = useNavigate();
  const utilisateur = useAuthStore((s) => s.utilisateur);
  const deconnecter = useAuthStore((s) => s.deconnecter);
  const estAdminCabinet = utilisateur?.role === 'admin';

  // ── Dark mode ──────────────────────────────────────────────────────────────
  // next-themes est installé mais pas encore configuré → implémentation manuelle
  // légère sans dépendance supplémentaire, compatible avec la class "dark" de Tailwind
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'light';
    const saved = sessionStorage.getItem('erp-theme') as 'light' | 'dark' | null;
    if (saved) return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    sessionStorage.setItem('erp-theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));

  // ── Déconnexion ────────────────────────────────────────────────────────────
  const { mutate: seDeconnecter, isPending } = useMutation({
    mutationFn: logout,
    onSettled: () => {
      deconnecter();
      navigate('/login', { replace: true });
    },
  });

  const initiales = utilisateur?.nom ? initialesAvatar(utilisateur.nom) : 'U';

  return (
    <TooltipProvider delayDuration={300}>
      <header className="flex h-16 items-center justify-between border-b bg-background px-4 md:px-6 shrink-0">
        {/* ── Gauche : hamburger + titre ── */}
        <div className="flex items-center gap-3 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden shrink-0"
            onClick={onToggleSidebar}
            aria-label="Ouvrir le menu de navigation"
          >
            <Menu className="h-5 w-5" />
          </Button>

          <h1 className="text-lg font-semibold text-foreground truncate">
            {titre ?? 'ERP Avocat'}
          </h1>
        </div>

        {/* ── Droite : dark mode + avatar ── */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Toggle dark mode */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                aria-label={theme === 'dark' ? 'Passer en mode clair' : 'Passer en mode sombre'}
              >
                {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {theme === 'dark' ? 'Mode clair' : 'Mode sombre'}
            </TooltipContent>
          </Tooltip>

          <Separator orientation="vertical" className="h-6 mx-1" />

          {/* Menu utilisateur */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative flex items-center gap-2 px-2 h-10">
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                    {initiales}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden sm:flex flex-col items-start">
                  <span className="text-sm font-medium leading-none">{utilisateur?.nom}</span>
                  <span className="text-xs text-muted-foreground capitalize">
                    {utilisateur?.role}
                  </span>
                </div>
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-52">
              {/* Infos utilisateur */}
              <DropdownMenuLabel className="font-normal">
                <p className="text-sm font-medium truncate">{utilisateur?.nom}</p>
                <p className="text-xs text-muted-foreground truncate">{utilisateur?.email}</p>
              </DropdownMenuLabel>

              <DropdownMenuSeparator />

              <DropdownMenuItem onClick={() => navigate('/profil')}>
                <User className="mr-2 h-4 w-4" />
                Mon profil
              </DropdownMenuItem>

              <DropdownMenuItem onClick={() => navigate('/mot-de-passe')}>
                <KeyRound className="mr-2 h-4 w-4" />
                Mot de passe
              </DropdownMenuItem>

              {estAdminCabinet && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/cabinet/utilisateurs')}>
                    <Users className="mr-2 h-4 w-4" />
                    Gérer l'équipe
                  </DropdownMenuItem>
                </>
              )}

              <DropdownMenuSeparator />

              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                disabled={isPending}
                onClick={() => seDeconnecter()}
              >
                <LogOut className="mr-2 h-4 w-4" />
                {isPending ? 'Déconnexion...' : 'Se déconnecter'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
    </TooltipProvider>
  );
}
