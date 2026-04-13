import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Receipt, MoreHorizontal, Download, Pencil, Trash2, FileCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import {
  listerFactures,
  supprimerFacture,
  telechargerFacturePDF,
  type Facture,
  type StatutFacture,
} from '@/api/facture.api';
import {
  couleurStatutFacture,
  libelleStatutFacture,
  formaterMontantDA,
  formaterDateCourte,
} from '@/lib/utils';

import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useDebounce } from 'use-debounce';

import { useAuthStore } from '@/stores/auth.store';
import { DialogCreerFacture } from '@/components/facture/DialogCreerFacture';
import { DialogModifierFacture } from '@/components/facture/DialogModifierFacture';

// Helper : nom client depuis l'objet embarqué dans Facture
function nomClientFacture(f: Facture): string {
  if (typeof f.client !== 'object' || f.client === null) return '—';
  if (f.client.type === 'morale') return f.client.raisonSociale ?? '—';
  return [f.client.prenom, f.client.nom].filter(Boolean).join(' ') || '—';
}

export default function FacturesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const utilisateur = useAuthStore((s) => s.utilisateur);
  const estAdmin = utilisateur?.role === 'admin';

  const [filtreStatut, setFiltreStatut] = useState<StatutFacture | 'tous'>('tous');

  const [recherche, setRecherche] = useState('');
  const [rechercheDebounced] = useDebounce(recherche, 300);

  const [page, setPage] = useState(1);
  const [dialogCreer, setDialogCreer] = useState(false);
  const [factureAModifier, setFactureAModifier] = useState<Facture | null>(null);
  const [factureASupprimer, setFactureASupprimer] = useState<Facture | null>(null);
  const [telechargementsEnCours, setTelechargementsEnCours] = useState<Set<string>>(new Set());

  const reinitialiserFiltres = useCallback(() => {
    setFiltreStatut('tous');
    setRecherche('');
    setPage(1);
  }, []);

  const filtresActifs = filtreStatut !== 'tous' || recherche !== '';

  const { data, isLoading } = useQuery({
    queryKey: ['cabinet', 'factures', filtreStatut, rechercheDebounced, page],
    queryFn: () =>
      listerFactures({
        statut: filtreStatut !== 'tous' ? filtreStatut : undefined,
        q: rechercheDebounced || undefined, // ← ajouter
        page,
        limit: 20,
      }),
  });

  const factures = data?.data ?? [];
  const meta = data?.meta;

  const { mutate: supprimer, isPending: suppression } = useMutation({
    mutationFn: () => supprimerFacture(factureASupprimer!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cabinet', 'factures'] });
      toast.success('Facture supprimée avec succès');
      setFactureASupprimer(null);
    },
    onError: () => toast.error('Impossible de supprimer cette facture'),
  });

  const handleTelechargement = async (facture: Facture) => {
    setTelechargementsEnCours((prev) => new Set(prev).add(facture.id));
    try {
      await telechargerFacturePDF(facture.id, facture.numero);
      toast.success(`${facture.numero}.pdf téléchargé`);
    } catch {
      toast.error('Erreur lors du téléchargement du PDF');
    } finally {
      setTelechargementsEnCours((prev) => {
        const next = new Set(prev);
        next.delete(facture.id);
        return next;
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Factures</h2>
          <span className="text-sm text-muted-foreground">
            {meta
              ? `${meta.total} facture${meta.total > 1 ? 's' : ''} au total`
              : 'Gestion de la facturation'}
          </span>
        </div>
        <Button onClick={() => setDialogCreer(true)}>
          <Plus className="mr-2 h-4 w-4" /> Nouvelle facture
        </Button>
      </div>

      {/* Filtres */}
      <div className="flex flex-col gap-3 sm:flex-row">
        {/* Barre de recherche */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher par numéro, client, dossier…"
            className="pl-9"
            value={recherche}
            onChange={(e) => {
              setRecherche(e.target.value);
              setPage(1);
            }}
          />
        </div>

        {/* Filtre statut */}
        <Select
          value={filtreStatut}
          onValueChange={(v) => {
            setFiltreStatut(v as StatutFacture | 'tous');
            setPage(1);
          }}
        >
          <SelectTrigger className="w-full sm:w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="tous">Tous les statuts</SelectItem>
            <SelectItem value="brouillon">Brouillon</SelectItem>
            <SelectItem value="emise">Émise</SelectItem>
            <SelectItem value="payee">Payée</SelectItem>
          </SelectContent>
        </Select>

        {filtresActifs && (
          <Button variant="ghost" onClick={reinitialiserFiltres}>
            Réinitialiser
          </Button>
        )}
      </div>

      {/* Liste */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="divide-y">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-4">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-56" />
                  </div>
                  <Skeleton className="h-5 w-24 rounded-full" />
                  <Skeleton className="h-5 w-20 rounded-full" />
                  <Skeleton className="h-8 w-8 rounded" />
                </div>
              ))}
            </div>
          ) : factures.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <Receipt className="h-12 w-12 text-muted-foreground/30" />
              <div>
                <p className="font-medium">
                  {filtresActifs ? 'Aucune facture trouvée' : 'Aucune facture pour le moment'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {filtresActifs
                    ? 'Modifiez vos critères de recherche'
                    : 'Créez votre première facture pour commencer'}
                </p>
                {!filtresActifs && (
                  <Button size="sm" onClick={() => setDialogCreer(true)}>
                    <Plus className="mr-2 h-4 w-4" /> Nouvelle facture
                  </Button>
                )}
              </div>
              {!filtresActifs && (
                <Button size="sm" onClick={() => setDialogCreer(true)}>
                  <Plus className="mr-2 h-4 w-4" /> Nouvelle facture
                </Button>
              )}
            </div>
          ) : (
            <div className="divide-y">
              {factures.map((facture) => (
                <div
                  key={facture.id}
                  onClick={() => navigate(`/cabinet/factures/${facture.id}`)}
                  className="flex cursor-pointer items-center gap-4 p-4 transition-colors hover:bg-muted/40"
                >
                  {/* Icône */}
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <FileCheck className="h-5 w-5 text-primary" />
                  </div>

                  {/* Infos */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-mono text-sm font-semibold">{facture.numero}</p>
                      <span className="text-muted-foreground">·</span>
                      <p className="truncate text-sm font-medium">{nomClientFacture(facture)}</p>
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                      <span>
                        {typeof facture.dossier === 'object' && facture.dossier !== null
                          ? facture.dossier.reference
                          : '—'}
                      </span>
                      <span className="hidden sm:inline">·</span>
                      <span className="hidden sm:inline">
                        {formaterDateCourte(facture.dateEmission)}
                      </span>
                    </div>
                  </div>

                  {/* Montant */}
                  <p className="hidden shrink-0 text-sm font-semibold tabular-nums sm:block">
                    {formaterMontantDA(facture.montant)}
                  </p>

                  {/* Badge statut */}
                  <Badge
                    variant={couleurStatutFacture(facture.statut)}
                    className="hidden shrink-0 sm:flex"
                  >
                    {libelleStatutFacture(facture.statut)}
                  </Badge>

                  {/* Actions — stopPropagation pour ne pas déclencher la navigation */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
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
                          navigate(`/cabinet/factures/${facture.id}`);
                        }}
                      >
                        <FileCheck className="mr-2 h-4 w-4" />
                        Voir le détail
                      </DropdownMenuItem>
                      {facture.statut !== 'payee' && (
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            setFactureAModifier(facture);
                          }}
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          {facture.statut === 'brouillon' ? 'Modifier' : 'Changer le statut'}
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTelechargement(facture);
                        }}
                        disabled={telechargementsEnCours.has(facture.id)}
                      >
                        <Download className="mr-2 h-4 w-4" />
                        {telechargementsEnCours.has(facture.id)
                          ? 'Téléchargement...'
                          : 'Télécharger PDF'}
                      </DropdownMenuItem>
                      {facture.statut === 'brouillon' && estAdmin && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              setFactureASupprimer(facture);
                            }}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Supprimer
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-between border-t px-4 py-3">
              <p className="text-xs text-muted-foreground">
                Page {meta.page} sur {meta.totalPages} · {meta.total} factures
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
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
        </CardContent>
      </Card>

      {/* Dialogs */}
      <DialogCreerFacture ouvert={dialogCreer} onFermer={() => setDialogCreer(false)} />
      {factureAModifier && (
        <DialogModifierFacture
          facture={factureAModifier}
          onFermer={() => setFactureAModifier(null)}
        />
      )}

      {/* Confirmation suppression */}
      <AlertDialog
        open={!!factureASupprimer}
        onOpenChange={(o) => !o && setFactureASupprimer(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette facture ?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{factureASupprimer?.numero}</strong> sera définitivement supprimée. Seules les
              factures en brouillon peuvent être supprimées.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => supprimer()}
              disabled={suppression}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
