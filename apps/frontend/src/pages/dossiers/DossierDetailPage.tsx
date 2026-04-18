import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Pencil,
  Trash2,
  FolderOpen,
  Scale,
  Calendar,
  FileText,
  DollarSign,
  ListChecks,
  Clock,
  CheckCircle,
  PauseCircle,
  Play,
  Receipt,
  CalendarClock,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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

import type { ClientPopule, StatutDossier } from '@/types';
import {
  nomAffiche,
  LABELS_QUALITE,
  LABELS_TYPE_AFFAIRE,
  LABELS_SPECIALITE,
  LABELS_INSTITUTION,
} from '@/types';

import { obtenirDossier, supprimerDossier, changerStatutDossier } from '@/api/dossier.api';
import { couleurStatutDossier, libelleStatutDossier, formaterDate } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';

import DialogModifierDossier from '@/components/dossier/DialogModifierDossier';
import TabReports from '@/components/dossier/TabReports';
import TabHonoraires from '@/components/dossier/TabHonoraires';
import TabFactures from '@/components/dossier/TabFactures';
import TabDocuments from '@/components/dossier/TabDocuments';
import TabAgenda from '@/components/dossier/TabAgenda';
import TabEtapes from '@/components/dossier/TabEtapes';

// ─── Config tabs ──────────────────────────────────────────────────────────────
const TABS = [
  { value: 'reports', label: 'Reports', icon: CalendarClock },
  { value: 'honoraires', label: 'Honoraires', icon: DollarSign },
  { value: 'factures', label: 'Factures', icon: Receipt },
  { value: 'documents', label: 'Documents', icon: FileText },
  { value: 'agenda', label: 'Agenda', icon: Calendar },
  { value: 'etapes', label: 'Étapes', icon: ListChecks },
] as const;

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function DossierDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const utilisateur = useAuthStore((s) => s.utilisateur);
  const estAdmin = utilisateur?.role === 'admin';

  const [dialogModifier, setDialogModifier] = useState(false);
  const [confirmerSupprimer, setConfirmerSupprimer] = useState(false);

  // ── Query ──────────────────────────────────────────────────────────────────
  const { data: dossier, isLoading } = useQuery({
    queryKey: ['cabinet', 'dossier', id],
    queryFn: () => obtenirDossier(id!),
    enabled: !!id,
  });

  // ── Mutations ──────────────────────────────────────────────────────────────
  const { mutate: changerStatut, isPending: changementStatut } = useMutation({
    mutationFn: (statut: StatutDossier) => changerStatutDossier(id!, { statut }),
    onSuccess: (dossierMaj) => {
      queryClient.invalidateQueries({ queryKey: ['cabinet', 'dossier', id] });
      queryClient.invalidateQueries({ queryKey: ['cabinet', 'dossiers'] });
      queryClient.invalidateQueries({ queryKey: ['cabinet', 'dashboard'] });
      toast.success(`${libelleStatutDossier(dossierMaj.statut)} — statut mis à jour`);
    },
    onError: () => toast.error('Erreur lors du changement de statut'),
  });

  const { mutate: supprimer, isPending: suppression } = useMutation({
    mutationFn: () => supprimerDossier(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cabinet', 'dossiers'] });
      queryClient.invalidateQueries({ queryKey: ['cabinet', 'dashboard'] });
      toast.success('Dossier archivé avec succès');
      navigate('/cabinet/dossiers', { replace: true });
    },
    onError: () => toast.error('Erreur lors de la suppression'),
  });

  // ── Dérivations ────────────────────────────────────────────────────────────
  const clientPopule =
    typeof dossier?.clientId === 'object' ? (dossier.clientId as ClientPopule) : null;

  const clientId =
    typeof dossier?.clientId === 'string'
      ? dossier.clientId
      : ((dossier?.clientId as ClientPopule)?._id ?? '');

  // ── Chargement / erreur ────────────────────────────────────────────────────
  if (isLoading) return <DossierDetailSkeleton />;

  if (!dossier) {
    return (
      <div className="flex flex-col items-center gap-3 py-24 text-center">
        <FolderOpen className="h-12 w-12 text-muted-foreground/30" aria-hidden="true" />
        <p className="font-medium">Dossier introuvable</p>
        <Button variant="outline" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour
        </Button>
      </div>
    );
  }

  const intituleDossier = clientPopule
    ? `${nomAffiche(clientPopule)} c/ ${dossier.adversaire}`
    : `c/ ${dossier.adversaire}`;

  return (
    <div className="space-y-6">
      {/* ── Fil d'Ariane ────────────────────────────────────────── */}
      <nav
        aria-label="Fil d'Ariane"
        className="flex items-center gap-2 text-sm text-muted-foreground"
      >
        <Link to="/cabinet/dossiers" className="transition-colors hover:text-foreground">
          Dossiers
        </Link>
        <span aria-hidden="true">/</span>
        <span className="truncate font-medium text-foreground">{intituleDossier}</span>
      </nav>

      {/* ── En-tête ─────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Scale className="h-5 w-5 text-primary" aria-hidden="true" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-bold tracking-tight">{dossier.reference}</h2>
              {/* <h2 className="text-xl font-bold tracking-tight">{intituleDossier}</h2> */}
              <Badge variant={couleurStatutDossier(dossier.statut)}>
                {libelleStatutDossier(dossier.statut)}
              </Badge>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="font-mono text-sm text-muted-foreground">
                {/* {dossier.reference} */}
                {intituleDossier}
              </span>
              {dossier.dossierNumero && (
                <>
                  <span className="text-muted-foreground" aria-hidden="true">
                    ·
                  </span>
                  <span className="text-sm text-muted-foreground">N° {dossier.dossierNumero}</span>
                </>
              )}
              {dossier.typeAffaire && (
                <>
                  <span className="text-muted-foreground" aria-hidden="true">
                    ·
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {LABELS_TYPE_AFFAIRE[dossier.typeAffaire]}
                  </span>
                </>
              )}
              {dossier.specialite && (
                <>
                  <span className="text-muted-foreground" aria-hidden="true">
                    ·
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {LABELS_SPECIALITE[dossier.specialite]}
                  </span>
                </>
              )}
              {dossier.institution && (
                <>
                  <span className="text-muted-foreground" aria-hidden="true">
                    ·
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {LABELS_INSTITUTION[dossier.institution]}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-2">
          {estAdmin && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" disabled={changementStatut}>
                  <Clock className="mr-2 h-4 w-4" aria-hidden="true" />
                  Statut
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {dossier.statut !== 'encours' && (
                  <DropdownMenuItem onClick={() => changerStatut('encours')}>
                    <Play className="mr-2 h-4 w-4 text-(--color-success)" />
                    Remettre en cours
                  </DropdownMenuItem>
                )}
                {dossier.statut !== 'suspendu' && (
                  <DropdownMenuItem onClick={() => changerStatut('suspendu')}>
                    <PauseCircle className="mr-2 h-4 w-4 text-(--color-warning)" />
                    Suspendre
                  </DropdownMenuItem>
                )}
                {dossier.statut !== 'cloture' && (
                  <DropdownMenuItem onClick={() => changerStatut('cloture')}>
                    <CheckCircle className="mr-2 h-4 w-4 text-muted-foreground" />
                    Clôturer
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <Button variant="outline" size="sm" onClick={() => setDialogModifier(true)}>
            <Pencil className="mr-2 h-4 w-4" aria-hidden="true" />
            Modifier
          </Button>

          {estAdmin && (
            <Button
              variant="outline"
              size="sm"
              className="border-destructive/30 text-destructive hover:bg-destructive/5 hover:text-destructive"
              onClick={() => setConfirmerSupprimer(true)}
              aria-label="Archiver ce dossier"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </Button>
          )}
        </div>
      </div>

      {/* ── Infos permanentes ───────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Parties */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Parties</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Pour le compte de
              </p>
              {clientPopule ? (
                <div className="space-y-1">
                  <p className="font-medium">{nomAffiche(clientPopule)}</p>
                  <p className="text-xs text-muted-foreground">
                    {LABELS_QUALITE[dossier.qualiteClient]}
                  </p>
                  <p className="text-sm text-muted-foreground">{clientPopule.telephone}</p>
                  {clientPopule.email && (
                    <p className="text-sm text-muted-foreground">{clientPopule.email}</p>
                  )}
                  <Button variant="outline" size="sm" className="mt-1" asChild>
                    <Link to={`/cabinet/clients/${clientPopule._id}`}>Voir la fiche client</Link>
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Client non disponible</p>
              )}
            </div>

            <Separator />

            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Contre
              </p>
              <p className="font-medium">{dossier.adversaire}</p>
              <p className="text-xs text-muted-foreground">
                {LABELS_QUALITE[dossier.qualiteAdversaire]}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Informations */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Informations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <InfoLigne label="Référence" valeur={dossier.reference} mono />

            {dossier.dossierNumero && (
              <>
                <Separator />
                <InfoLigne label="N° dossier" valeur={dossier.dossierNumero} mono />
              </>
            )}
            {dossier.institution && (
              <>
                <Separator />
                <InfoLigne label="Institution" valeur={LABELS_INSTITUTION[dossier.institution]} />
              </>
            )}
            {dossier.typeAffaire && (
              <>
                <Separator />
                <InfoLigne
                  label="Type d'affaire"
                  valeur={LABELS_TYPE_AFFAIRE[dossier.typeAffaire]}
                />
              </>
            )}
            {dossier.specialite && (
              <>
                <Separator />
                <InfoLigne label="Spécialité" valeur={LABELS_SPECIALITE[dossier.specialite]} />
              </>
            )}
            <Separator />
            <InfoLigne label="Ouvert le" valeur={formaterDate(dossier.dateOuverture)} />

            {dossier.dateCloture && (
              <>
                <Separator />
                <InfoLigne label="Clôturé le" valeur={formaterDate(dossier.dateCloture)} />
              </>
            )}

            <Separator />
            <InfoLigne label="Créé le" valeur={formaterDate(dossier.createdAt)} />
          </CardContent>
        </Card>
      </div>

      {/* ── Description ─────────────────────────────────────────── */}
      {dossier.description && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">
              {dossier.description}
            </p>
          </CardContent>
        </Card>
      )}

      {/* ── Tabs ────────────────────────────────────────────────── */}
      <Tabs defaultValue="reports" className="flex flex-col space-y-0">
        <div className="border-b">
          <TabsList className="flex h-auto w-full justify-start gap-0 overflow-x-auto rounded-none bg-transparent p-0">
            {TABS.map(({ value, label, icon: Icon }) => (
              <TabsTrigger
                key={value}
                value={value}
                className="
                  relative flex items-center gap-2 rounded-none border-b-2 border-transparent
                  px-4 py-3 text-sm font-medium text-muted-foreground
                  transition-colors duration-150
                  hover:text-foreground
                  focus-visible:outline-none focus-visible:ring-2
                  focus-visible:ring-ring focus-visible:ring-offset-0
                  data-[state=active]:border-primary
                  data-[state=active]:bg-transparent
                  data-[state=active]:text-primary
                  data-[state=active]:shadow-none
                "
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="whitespace-nowrap">{label}</span>
                {value === 'reports' && (dossier.reports?.length ?? 0) > 0 && (
                  <span className="ml-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary">
                    {dossier.reports.length}
                  </span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="reports" className="mt-6 focus-visible:outline-none">
          <TabReports
            dossierId={dossier._id}
            reports={dossier.reports ?? []}
            estAdmin={estAdmin}
            onMutationSuccess={() =>
              queryClient.invalidateQueries({ queryKey: ['cabinet', 'dossier', id] })
            }
          />
        </TabsContent>

        <TabsContent value="honoraires" className="mt-6 focus-visible:outline-none">
          <TabHonoraires dossierId={id!} />
        </TabsContent>
        <TabsContent value="factures" className="mt-6 focus-visible:outline-none">
          <TabFactures dossierId={id!} clientId={clientId} />
        </TabsContent>
        <TabsContent value="documents" className="mt-6 focus-visible:outline-none">
          <TabDocuments dossierId={id!} />
        </TabsContent>
        <TabsContent value="agenda" className="mt-6 focus-visible:outline-none">
          <TabAgenda dossierId={dossier._id} />
        </TabsContent>
        <TabsContent value="etapes" className="mt-6 focus-visible:outline-none">
          <TabEtapes dossierId={dossier._id} />
        </TabsContent>
      </Tabs>

      {/* ── Dialogs ──────────────────────────────────────────────── */}
      {dialogModifier && (
        <DialogModifierDossier dossier={dossier} onFermer={() => setDialogModifier(false)} />
      )}

      <AlertDialog open={confirmerSupprimer} onOpenChange={setConfirmerSupprimer}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archiver ce dossier ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le dossier <strong>{intituleDossier}</strong>{' '}
              <span className="font-mono text-xs">({dossier.reference})</span> sera archivé.
              Documents, paiements et événements liés restent conservés.
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

// ─── Sous-composants ──────────────────────────────────────────────────────────

function InfoLigne({
  label,
  valeur,
  mono = false,
}: {
  label: string;
  valeur: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={mono ? 'font-mono font-medium' : 'font-medium'}>{valeur}</span>
    </div>
  );
}

function DossierDetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-4 w-48" />
      <div className="flex items-start gap-3">
        <Skeleton className="h-11 w-11 rounded-lg" />
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-64" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
          <Skeleton className="h-4 w-48" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Skeleton className="h-56" />
        <Skeleton className="h-56" />
      </div>
      <div className="border-b">
        <div className="flex gap-0">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-11 w-24 rounded-none" />
          ))}
        </div>
      </div>
      <Skeleton className="h-64" />
    </div>
  );
}
