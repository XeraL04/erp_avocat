import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Search,
  Users,
  Phone,
  Building2,
  MoreHorizontal,
  Pencil,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useDebounce } from 'use-debounce';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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

import { listerClients, supprimerClient } from '@/api/client.api';
import { nomAffiche } from '@/types';
import type { Client, TypeClient } from '@/types';
import DialogCreerClient from '../../components/admin/DialogCreerClient';
import DialogModifierClient from '../../components/admin/DialogModifierClient';

export default function ClientsPage() {
  const queryClient = useQueryClient();

  const navigate = useNavigate();

  // ─── États filtres ────────────────────────────────────────────────
  const [recherche, setRecherche] = useState('');
  const [filtreType, setFiltreType] = useState<TypeClient | 'tous'>('tous');
  const [page, setPage] = useState(1);

  const [rechercheDebounced] = useDebounce(recherche, 300);

  // ─── États dialogs ────────────────────────────────────────────────
  const [dialogCreer, setDialogCreer] = useState(false);
  const [clientAModifier, setClientAModifier] = useState<Client | null>(null);
  const [clientASupprimer, setClientASupprimer] = useState<Client | null>(null);

  // ─── Query ────────────────────────────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ['cabinet', 'clients', rechercheDebounced, filtreType, page],
    queryFn: () =>
      listerClients({
        q: rechercheDebounced || undefined,
        type: filtreType === 'tous' ? undefined : filtreType,
        page,
        limit: 20,
      }),
  });

  const clients = data?.data ?? [];
  const meta = data?.meta;

  // ─── Suppression ──────────────────────────────────────────────────
  const { mutate: supprimer, isPending: suppression } = useMutation({
    mutationFn: () => supprimerClient(clientASupprimer!._id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cabinet', 'clients'] });
      toast.success('Client archivé avec succès');
      setClientASupprimer(null);
    },
    onError: () => toast.error('Erreur lors de la suppression'),
  });

  const reinitialiserFiltres = useCallback(() => {
    setRecherche('');
    setFiltreType('tous');
    setPage(1);
  }, []);

  return (
    <div className="space-y-6">
      {/* ── En-tête ──────────────────────────────────────────────── */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Clients</h2>
          <p className="text-sm text-muted-foreground">
            {meta
              ? `${meta.total} client${meta.total > 1 ? 's' : ''} au total`
              : 'Gestion de votre clientèle'}
          </p>
        </div>
        <Button onClick={() => setDialogCreer(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nouveau client
        </Button>
      </div>

      {/* ── Filtres ───────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom, raison sociale..."
            className="pl-9"
            value={recherche}
            onChange={(e) => {
              setRecherche(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <Select
          value={filtreType}
          onValueChange={(v) => {
            setFiltreType(v as TypeClient | 'tous');
            setPage(1);
          }}
        >
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="tous">Tous les types</SelectItem>
            <SelectItem value="physique">Personne physique</SelectItem>
            <SelectItem value="morale">Personne morale</SelectItem>
          </SelectContent>
        </Select>

        {(recherche || filtreType !== 'tous') && (
          <Button variant="ghost" onClick={reinitialiserFiltres}>
            Réinitialiser
          </Button>
        )}
      </div>

      {/* ── Tableau ───────────────────────────────────────────────── */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="divide-y">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-5 w-20 rounded-full" />
                  <Skeleton className="h-8 w-8 rounded" />
                </div>
              ))}
            </div>
          ) : clients.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <Users className="h-12 w-12 text-muted-foreground/30" />
              <div>
                <p className="font-medium">
                  {recherche || filtreType !== 'tous'
                    ? 'Aucun client trouvé'
                    : 'Aucun client pour le moment'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {recherche || filtreType !== 'tous'
                    ? 'Modifiez vos critères de recherche'
                    : 'Ajoutez votre premier client pour commencer'}
                </p>
              </div>
              {!recherche && filtreType === 'tous' && (
                <Button size="sm" onClick={() => setDialogCreer(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Nouveau client
                </Button>
              )}
            </div>
          ) : (
            <div className="divide-y">
              {clients.map((client) => (
                <div
                  key={client._id}
                  className="flex cursor-pointer items-center gap-4 p-4 transition-colors hover:bg-muted/40"
                  onClick={() => navigate(`/cabinet/clients/${client._id}`)}
                >
                  {/* Avatar */}
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    {client.type === 'morale' ? (
                      <Building2 className="h-5 w-5 text-primary" />
                    ) : (
                      <Users className="h-5 w-5 text-primary" />
                    )}
                  </div>

                  {/* Infos */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{nomAffiche(client)}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {client.telephone}
                      </span>
                      {client.email && (
                        <span className="hidden truncate sm:block">{client.email}</span>
                      )}
                    </div>
                  </div>

                  {/* Badge type */}
                  <Badge
                    variant={client.type === 'morale' ? 'secondary' : 'outline'}
                    className="shrink-0 hidden sm:flex"
                  >
                    {client.type === 'physique' ? 'Physique' : 'Morale'}
                  </Badge>

                  {/* Actions */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      {/* ✅ stopPropagation : empêche le clic sur "⋯" de naviguer vers le détail */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          setClientAModifier(client);
                        }}
                      >
                        <Pencil className="mr-2 h-4 w-4" />
                        Modifier
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          setClientASupprimer(client);
                        }}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Archiver
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          )}
        </CardContent>

        {/* Pagination */}
        {meta && meta.totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-4 py-3">
            <p className="text-xs text-muted-foreground">
              Page {meta.page} sur {meta.totalPages} · {meta.total} clients
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Précédent
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= meta.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Suivant
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* ── Dialogs ───────────────────────────────────────────────── */}
      <DialogCreerClient ouvert={dialogCreer} onFermer={() => setDialogCreer(false)} />

      {clientAModifier && (
        <DialogModifierClient client={clientAModifier} onFermer={() => setClientAModifier(null)} />
      )}

      {/* Confirmation suppression */}
      <AlertDialog open={!!clientASupprimer} onOpenChange={(o) => !o && setClientASupprimer(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archiver ce client ?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{clientASupprimer && nomAffiche(clientASupprimer)}</strong> sera archivé. Ses
              dossiers restent accessibles mais il n'apparaîtra plus dans la liste des clients
              actifs.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => supprimer()}
              disabled={suppression}
            >
              Archiver
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
