import { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Languages, LogOut, Menu, Moon, Sun, User, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';

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

export default function Header({ onToggleSidebar }: HeaderProps) {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation('common');
  const utilisateur = useAuthStore((s) => s.utilisateur);
  const deconnecter = useAuthStore((s) => s.deconnecter);
  const estAdminCabinet = utilisateur?.role === 'admin';
  const estRTL = i18n.language === 'ar';

  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === 'undefined') return 'light';
    const saved = sessionStorage.getItem('erp-theme') as Theme | null;
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    sessionStorage.setItem('erp-theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme((c) => (c === 'dark' ? 'light' : 'dark'));

  const changerLangue = () => {
    i18n.changeLanguage(estRTL ? 'fr' : 'ar');
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
        {/* ── Gauche (logo + titre) ── */}
        <div className="flex min-w-0 items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 shrink-0 md:hidden"
            onClick={onToggleSidebar}
            aria-label={estRTL ? 'فتح القائمة' : 'Ouvrir le menu de navigation'}
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </Button>
        </div>

        {/* ── Droite (actions) ── */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Bouton langue */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-10 gap-1.5 px-2.5 font-medium"
                onClick={changerLangue}
                aria-label={t('language')}
              >
                <Languages className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="hidden sm:inline text-sm">{estRTL ? 'FR' : 'عربي'}</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {estRTL ? 'Passer en français' : 'التبديل إلى العربية'}
            </TooltipContent>
          </Tooltip>

          {/* Bouton thème */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10"
                onClick={toggleTheme}
                aria-label={
                  theme === 'dark'
                    ? estRTL
                      ? 'الوضع الفاتح'
                      : 'Passer en mode clair'
                    : estRTL
                      ? 'الوضع الداكن'
                      : 'Passer en mode sombre'
                }
              >
                {theme === 'dark' ? (
                  <Sun className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Moon className="h-4 w-4" aria-hidden="true" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {theme === 'dark'
                ? estRTL
                  ? 'الوضع الفاتح'
                  : 'Mode clair'
                : estRTL
                  ? 'الوضع الداكن'
                  : 'Mode sombre'}
            </TooltipContent>
          </Tooltip>

          <Separator orientation="vertical" className="mx-1 h-6" />

          {/* Menu utilisateur */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="h-10 px-2.5 hover:bg-accent"
                aria-label={estRTL ? 'قائمة المستخدم' : 'Ouvrir le menu utilisateur'}
              >
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                    {initiales}
                  </AvatarFallback>
                </Avatar>

                <div
                  className={`${estRTL ? 'mr-2' : 'ml-2'} hidden min-w-0 flex-col items-start leading-none sm:flex`}
                >
                  <span className="max-w-40 truncate text-sm font-medium text-foreground">
                    {utilisateur?.nom}
                  </span>
                  <span className="text-xs capitalize text-muted-foreground">
                    {utilisateur?.role}
                  </span>
                </div>
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align={estRTL ? 'start' : 'end'} className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="space-y-1">
                  <p className="truncate text-sm font-medium text-foreground">{utilisateur?.nom}</p>
                  <p className="truncate text-xs text-muted-foreground">{utilisateur?.email}</p>
                </div>
              </DropdownMenuLabel>

              <DropdownMenuSeparator />

              <DropdownMenuItem onClick={() => navigate('/profil')}>
                <User className="h-4 w-4" aria-hidden="true" />
                {t('profile')}
              </DropdownMenuItem>

              {/* <DropdownMenuItem onClick={() => navigate('/mot-de-passe')}>
                <KeyRound className="h-4 w-4" aria-hidden="true" />
                {t('change_password')}
              </DropdownMenuItem> */}

              {estAdminCabinet && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/cabinet/utilisateurs')}>
                    <Users className="h-4 w-4" aria-hidden="true" />
                    {estRTL ? 'إدارة الفريق' : "Gérer l'équipe"}
                  </DropdownMenuItem>
                </>
              )}

              <DropdownMenuSeparator />

              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                disabled={isPending}
                onClick={() => seDeconnecter()}
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                {isPending ? (estRTL ? 'جاري تسجيل الخروج…' : 'Déconnexion…') : t('logout')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
    </TooltipProvider>
  );
}
