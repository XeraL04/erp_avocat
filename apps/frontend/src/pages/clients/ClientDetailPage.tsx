import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  FileText,
  Building2,
  Users,
  Pencil,
  Trash2,
  CreditCard,
  FolderOpen,
  StickyNote,
  BadgeCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  obtenirClient,
  obtenirDossiersClient,
  obtenirPaiementsClient,
  supprimerClient,
} from '@/api/client.api';
import { nomAffiche } from '@/types';
import type { Client } from '@/types';
import DialogModifierClient from '../../components/admin/DialogModifierClient';
import type { DossierResume, PaiementResume } from '@/api/client.api';

// ─── Badge statut dossier ─────────────────────────────────────────────────────

const STATUT_DOSSIER: Record<
  string,
  {
    label: string;
    variant: 'default' | 'secondary' | 'outline' | 'destructive';
  }
> = {
  ouvert: { label: 'Ouvert', variant: 'default' },
  en_cours: { label: 'En cours', variant: 'secondary' },
  clos: { label: 'Clôturé', variant: 'outline' },
  archive: { label: 'Archivé', variant: 'destructive' },
};

// ─── Composant ────────────────────────────────────────────────────────────────

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [dialogModifier, setDialogModifier] = useState(false);
  const [confirmerArchivage, setConfirmerArchivage] = useState(false);

  // ── Queries ────────────────────────────────────────────────────────────────
  const { data: client, isLoading: chargementClient } = useQuery<Client>({
    queryKey: ['cabinet', 'client', id],
    queryFn: () => obtenirClient(id!),
    enabled: !!id,
  });

  const { data: dossiersData, isLoading: chargementDossiers } = useQuery<{
    data: DossierResume[];
    meta: { total: number };
  }>({
    queryKey: ['cabinet', 'client', id, 'dossiers'],
    queryFn: () => obtenirDossiersClient(id!),
    enabled: !!id,
  });

  const { data: paiementsData, isLoading: chargementPaiements } = useQuery<{
    data: PaiementResume[];
    meta: { total: number; totalPaye: number; devise: string };
  }>({
    queryKey: ['cabinet', 'client', id, 'paiements'],
    queryFn: () => obtenirPaiementsClient(id!),
    enabled: !!id,
  });

  const dossiers = dossiersData?.data ?? [];
  const paiements = paiementsData?.data ?? [];
  const totalPaye = paiementsData?.meta?.totalPaye ?? 0;

  // ── Archivage ──────────────────────────────────────────────────────────────
  const { mutate: archiver, isPending: archivageEnCours } = useMutation({
    mutationFn: () => supprimerClient(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cabinet', 'clients'] });
      toast.success('Client archivé avec succès');
      navigate('/cabinet/clients');
    },
    onError: () => toast.error("Erreur lors de l'archivage"),
  });

  // ── Squelette chargement ───────────────────────────────────────────────────
  if (chargementClient) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  // ObtenirClient retourne Client directement, pas { data: Client }
  if (!client) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <Users className="h-12 w-12 text-muted-foreground/30" />
        <p className="font-medium">Client introuvable</p>
        <Button variant="outline" onClick={() => navigate('/cabinet/clients')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour à la liste
        </Button>
      </div>
    );
  }

  // c = client directement
  const c = client;
  const estMorale = c.type === 'morale';

  return (
    <div className="space-y-6">
      {/* ── En-tête ──────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/cabinet/clients')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
            {estMorale ? (
              <Building2 className="h-5 w-5 text-primary" />
            ) : (
              <Users className="h-5 w-5 text-primary" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold tracking-tight">{nomAffiche(c)}</h2>
              <Badge variant={estMorale ? 'secondary' : 'outline'}>
                {estMorale ? 'Personne morale' : 'Personne physique'}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Client depuis le {format(new Date(c.createdAt), 'dd MMMM yyyy', { locale: fr })}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setDialogModifier(true)}>
            <Pencil className="mr-2 h-4 w-4" />
            Modifier
          </Button>
          <Button
            variant="outline"
            className="text-destructive hover:text-destructive"
            onClick={() => setConfirmerArchivage(true)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Archiver
          </Button>
        </div>
      </div>

      {/* ── KPIs ─────────────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10">
              <FolderOpen className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{dossiers.length}</p>
              <p className="text-xs text-muted-foreground">
                Dossier{dossiers.length > 1 ? 's' : ''}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/10">
              <CreditCard className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{paiements.length}</p>
              <p className="text-xs text-muted-foreground">
                Paiement{paiements.length > 1 ? 's' : ''}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-500/10">
              <BadgeCheck className="h-5 w-5 text-yellow-500" />
            </div>
            <div>
              <p className="text-2xl font-bold tabular-nums">
                {totalPaye.toLocaleString('fr-DZ')} DA
              </p>
              <p className="text-xs text-muted-foreground">Total encaissé</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Infos + Onglets ───────────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Fiche client */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Informations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!estMorale && c.cin && (
              <div className="flex items-start gap-3">
                <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">CIN</p>
                  <p className="text-sm font-medium">{c.cin}</p>
                </div>
              </div>
            )}

            {estMorale && (
              <>
                {c.representantLegal && (
                  <div className="flex items-start gap-3">
                    <Users className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Représentant légal</p>
                      <p className="text-sm font-medium">{c.representantLegal}</p>
                    </div>
                  </div>
                )}
                {c.nifRc && (
                  <div className="flex items-start gap-3">
                    <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">NIF / RC</p>
                      <p className="text-sm font-medium">{c.nifRc}</p>
                    </div>
                  </div>
                )}
              </>
            )}

            <Separator />

            <div className="flex items-start gap-3">
              <Phone className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Téléphone principal</p>
                <p className="text-sm font-medium">{c.telephone}</p>
              </div>
            </div>

            {c.telephoneSecondaire && (
              <div className="flex items-start gap-3">
                <Phone className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Téléphone secondaire</p>
                  <p className="text-sm font-medium">{c.telephoneSecondaire}</p>
                </div>
              </div>
            )}

            {c.email && (
              <div className="flex items-start gap-3">
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="text-sm font-medium">{c.email}</p>
                </div>
              </div>
            )}

            {c.adresse && (
              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Adresse</p>
                  <p className="text-sm font-medium">{c.adresse}</p>
                </div>
              </div>
            )}

            {c.notes && (
              <>
                <Separator />
                <div className="flex items-start gap-3">
                  <StickyNote className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Notes</p>
                    <p className="text-sm text-muted-foreground leading-relaxed">{c.notes}</p>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Onglets dossiers / paiements */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="dossiers">
            <TabsList>
              <TabsTrigger value="dossiers">
                Dossiers
                {dossiers.length > 0 && (
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {dossiers.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="paiements">
                Paiements
                {paiements.length > 0 && (
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {paiements.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            {/* ── Dossiers ─────────────────────────────────────── */}
            <TabsContent value="dossiers" className="mt-4">
              <Card>
                <CardContent className="p-0">
                  {chargementDossiers ? (
                    <div className="divide-y">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-4 p-4">
                          <Skeleton className="h-4 w-24" />
                          <Skeleton className="h-4 flex-1" />
                          <Skeleton className="h-5 w-16 rounded-full" />
                        </div>
                      ))}
                    </div>
                  ) : dossiers.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 py-12 text-center">
                      <FolderOpen className="h-10 w-10 text-muted-foreground/30" />
                      <p className="text-sm font-medium">Aucun dossier</p>
                      <p className="text-xs text-muted-foreground">
                        Aucun dossier n'est associé à ce client
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y">
                      {dossiers.map((dossier: DossierResume) => {
                        const statut = STATUT_DOSSIER[dossier.statut] ?? {
                          label: dossier.statut,
                          variant: 'outline' as const,
                        };
                        return (
                          <div
                            key={dossier._id}
                            className="flex cursor-pointer items-center gap-4 p-4 transition-colors hover:bg-muted/40"
                            onClick={() => navigate(`/cabinet/dossiers/${dossier._id}`)}
                          >
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium">{dossier.titre}</p>
                              <p className="text-xs text-muted-foreground">
                                Réf. {dossier.reference} · Ouvert le{' '}
                                {format(new Date(dossier.dateOuverture), 'dd/MM/yyyy')}
                              </p>
                            </div>
                            <Badge variant={statut.variant}>{statut.label}</Badge>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── Paiements ────────────────────────────────────── */}
            <TabsContent value="paiements" className="mt-4">
              <Card>
                <CardContent className="p-0">
                  {chargementPaiements ? (
                    <div className="divide-y">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-4 p-4">
                          <Skeleton className="h-4 w-24" />
                          <Skeleton className="h-4 flex-1" />
                          <Skeleton className="h-4 w-20" />
                        </div>
                      ))}
                    </div>
                  ) : paiements.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 py-12 text-center">
                      <CreditCard className="h-10 w-10 text-muted-foreground/30" />
                      <p className="text-sm font-medium">Aucun paiement</p>
                      <p className="text-xs text-muted-foreground">
                        Aucun paiement enregistré pour ce client
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y">
                      {paiements.map((paiement: PaiementResume) => (
                        <div key={paiement._id} className="flex items-center gap-4 p-4">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">
                              {paiement.dossier?.titre ?? 'Dossier inconnu'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(paiement.date), 'dd MMMM yyyy', { locale: fr })}
                              {paiement.modePaiement && ` · ${paiement.modePaiement}`}
                            </p>
                          </div>
                          <p className="shrink-0 text-sm font-semibold tabular-nums text-green-600">
                            +{paiement.montant.toLocaleString('fr-DZ')} DA
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* ── Dialogs ───────────────────────────────────────────────── */}
      {dialogModifier && (
        <DialogModifierClient
          client={c}
          onFermer={() => setDialogModifier(false)} // ← plus besoin d'invalider ici
        />
      )}

      <AlertDialog open={confirmerArchivage} onOpenChange={setConfirmerArchivage}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archiver ce client ?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{nomAffiche(c)}</strong> sera archivé. Ses dossiers restent accessibles mais
              il n'apparaîtra plus dans la liste des clients actifs.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => archiver()}
              disabled={archivageEnCours}
            >
              Archiver
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
