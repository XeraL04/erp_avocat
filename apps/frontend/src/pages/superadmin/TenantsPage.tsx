import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  MoreHorizontal,
  Eye,
  Edit,
  ShieldOff,
  ShieldCheck,
  Loader2,
  Building2,
} from 'lucide-react';
import { toast } from 'sonner';
import type { AxiosError } from 'axios';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import {
  getTenants,
  changerStatutTenant,
} from '@/api/superadmin.api';
import type { Tenant } from '@/types';
import { couleurStatutTenant, libellePlan, formaterDate } from '@/lib/utils';
import { extraireMessageErreur } from '@/api/auth.api';

import DialogCreerTenant from '@/components/superadmin/DialogCreerTenant';
import DialogModifierTenant from '@/components/superadmin/DialogModifierTenant';

const LIMITE_PAR_PAGE = 10;

export default function TenantsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();

  // États locaux
  const [recherche, setRecherche] = useState('');
  const [rechercheDebounced, setRechercheDebounced] = useState('');
  const [filtreStatut, setFiltreStatut] = useState('tous');
  const [filtrePlan, setFiltrePlan] = useState('tous');
  const [page, setPage] = useState(1);
  const [dialogCreer, setDialogCreer] = useState(
    searchParams.get('action') === 'nouveau'
  );
  const [tenantAModifier, setTenantAModifier] = useState<Tenant | null>(null);
  const [confirmSuspendre, setConfirmSuspendre] = useState<Tenant | null>(null);

  // Debounce de la recherche — 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setRechercheDebounced(recherche);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [recherche]);

  // Requête liste des cabinets
  const { data, isLoading } = useQuery({
    queryKey: ['superadmin', 'tenants', page, rechercheDebounced, filtreStatut, filtrePlan],
    queryFn: () =>
      getTenants({
        page,
        limit: LIMITE_PAR_PAGE,
        search: rechercheDebounced || undefined,
        statut: filtreStatut !== 'tous' ? filtreStatut : undefined,
        plan: filtrePlan !== 'tous' ? filtrePlan : undefined,
      }),
  });

  // Mutation — changer statut
  const { mutate: changerStatut, isPending: estEnChangement } = useMutation({
    mutationFn: ({
      id,
      statut,
    }: {
      id: string;
      statut: 'actif' | 'suspendu';
    }) => changerStatutTenant(id, statut),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['superadmin', 'tenants'] });
      queryClient.invalidateQueries({ queryKey: ['superadmin', 'dashboard'] });
      toast.success(
        variables.statut === 'suspendu'
          ? 'Cabinet suspendu avec succès'
          : 'Cabinet réactivé avec succès'
      );
      setConfirmSuspendre(null);
    },
    onError: (erreur: unknown) => {
      toast.error(extraireMessageErreur(erreur as AxiosError));
    },
  });

  const totalPages = data ? Math.ceil(data.meta.total / LIMITE_PAR_PAGE) : 1;

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Cabinets</h2>
          <p className="text-muted-foreground">
            {data ? `${data.meta.total} cabinet(s) au total` : 'Chargement...'}
          </p>
        </div>
        <Button onClick={() => setDialogCreer(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nouveau cabinet
        </Button>
      </div>

      {/* Filtres */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom, email, slug..."
            className="pl-9"
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
          />
        </div>
        <Select value={filtreStatut} onValueChange={(v) => { setFiltreStatut(v); setPage(1); }}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="tous">Tous les statuts</SelectItem>
            <SelectItem value="actif">Actif</SelectItem>
            <SelectItem value="essai">Essai</SelectItem>
            <SelectItem value="suspendu">Suspendu</SelectItem>
            <SelectItem value="expire">Expiré</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filtrePlan} onValueChange={(v) => { setFiltrePlan(v); setPage(1); }}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Plan" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="tous">Tous les plans</SelectItem>
            <SelectItem value="starter">Starter</SelectItem>
            <SelectItem value="pro">Pro</SelectItem>
            <SelectItem value="premium">Premium</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tableau */}
      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cabinet</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="hidden md:table-cell">Dossiers</TableHead>
              <TableHead className="hidden lg:table-cell">Utilisateurs</TableHead>
              <TableHead className="hidden lg:table-cell">Créé le</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              // Lignes skeleton pendant le chargement
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : data?.tenants.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Building2 className="h-8 w-8" />
                    <p className="text-sm">Aucun cabinet trouvé</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              data?.tenants.map((tenant) => (
                <TableRow
                  key={tenant._id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => navigate(`/superadmin/tenants/${tenant._id}`)}
                >
                  <TableCell>
                    <div>
                      <p className="font-medium">{tenant.nom}</p>
                      <p className="text-xs text-muted-foreground">
                        {tenant.email}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{libellePlan(tenant.plan)}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={couleurStatutTenant(tenant.statut)}>
                      {tenant.statut}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <span className="text-sm">
                      {tenant.compteurs.dossiers}
                      <span className="text-muted-foreground">
                        {' '}/ {tenant.limites.maxDossiers === -1 ? '∞' : tenant.limites.maxDossiers}
                      </span>
                    </span>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <span className="text-sm">
                      {tenant.compteurs.utilisateurs}
                      <span className="text-muted-foreground">
                        {' '}/ {tenant.limites.maxUtilisateurs === -1 ? '∞' : tenant.limites.maxUtilisateurs}
                      </span>
                    </span>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                    {formaterDate(tenant.dateDebutEssai ?? '')}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem
                          onClick={() =>
                            navigate(`/superadmin/tenants/${tenant._id}`)
                          }
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          Voir le détail
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setTenantAModifier(tenant)}
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          Modifier
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {tenant.statut === 'suspendu' ? (
                          <DropdownMenuItem
                            onClick={() =>
                              changerStatut({ id: tenant._id, statut: 'actif' })
                            }
                            disabled={estEnChangement}
                          >
                            <ShieldCheck className="mr-2 h-4 w-4 text-green-600" />
                            Réactiver
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => setConfirmSuspendre(tenant)}
                          >
                            <ShieldOff className="mr-2 h-4 w-4" />
                            Suspendre
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <p>
            Page {page} sur {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p - 1)}
              disabled={page === 1}
            >
              Précédent
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={page === totalPages}
            >
              Suivant
            </Button>
          </div>
        </div>
      )}

      {/* Dialog Créer cabinet */}
      <DialogCreerTenant
        ouvert={dialogCreer}
        onFermer={() => {
          setDialogCreer(false);
          searchParams.delete('action');
          setSearchParams(searchParams);
        }}
      />

      {/* Dialog Modifier cabinet */}
      {tenantAModifier && (
        <DialogModifierTenant
          tenant={tenantAModifier}
          ouvert={!!tenantAModifier}
          onFermer={() => setTenantAModifier(null)}
        />
      )}

      {/* Confirmation suspension */}
      <AlertDialog
        open={!!confirmSuspendre}
        onOpenChange={() => setConfirmSuspendre(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Suspendre ce cabinet ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le cabinet <strong>{confirmSuspendre?.nom}</strong> et tous ses
              utilisateurs n'auront plus accès à la plateforme. Cette action est
              réversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() =>
                confirmSuspendre &&
                changerStatut({
                  id: confirmSuspendre._id,
                  statut: 'suspendu',
                })
              }
              disabled={estEnChangement}
            >
              {estEnChangement && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Suspendre
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}