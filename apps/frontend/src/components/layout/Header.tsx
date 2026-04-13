import { LogOut, User, KeyRound, Users } from 'lucide-react'; // ← ajouter Users
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

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

import { logout } from '@/api/auth.api';
import { useAuthStore } from '@/stores/auth.store';

interface HeaderProps {
  titre?: string;
}

export default function Header({ titre }: HeaderProps) {
  const navigate = useNavigate();
  const utilisateur = useAuthStore((s) => s.utilisateur);
  const deconnecter = useAuthStore((s) => s.deconnecter);

  // ← Seuls les admins de cabinet voient le lien Équipe
  const estAdminCabinet = utilisateur?.role === 'admin';

  const { mutate: seDeconnecter, isPending } = useMutation({
    mutationFn: logout,
    onSettled: () => {
      deconnecter();
      navigate('/login', { replace: true });
    },
  });

  const initiales =
    utilisateur?.nom
      .split(' ')
      .slice(0, 2)
      .map((m) => m[0].toUpperCase())
      .join('') ?? 'U';

  return (
    <header className="flex h-16 items-center justify-between border-b bg-background px-6">
      <h1 className="text-lg font-semibold text-foreground">{titre ?? 'ERP Avocat'}</h1>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative flex items-center gap-2 px-2">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                {initiales}
              </AvatarFallback>
            </Avatar>
            <div className="hidden sm:flex flex-col items-start">
              <span className="text-sm font-medium leading-none">{utilisateur?.nom}</span>
              <span className="text-xs text-muted-foreground capitalize">{utilisateur?.role}</span>
            </div>
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuLabel className="font-normal">
            <p className="text-sm font-medium">{utilisateur?.nom}</p>
            <p className="text-xs text-muted-foreground">{utilisateur?.email}</p>
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

          {/* ← Visible uniquement pour l'admin du cabinet */}
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
    </header>
  );
}
