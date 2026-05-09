import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
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
  Plus,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
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
import {
  nomAffiche,
  formaterMontantDA,
  initialesAvatar,
  styleStatutDossier,
  styleModeReglement,
  libelleModeReglement,
} from '@/lib/utils';
import type { Client, StatutDossier } from '@/types';

import DialogModifierClient from '../../components/admin/DialogModifierClient';
import DialogCreerDossier from '@/components/dossier/DialogCreerDossier';
import type { DossierResume, PaiementResume } from '@/api/client.api';

// ─── Hook count-up ────────────────────────────────────────────────────────────
function useCountUp(cible: number, actif: boolean, duree = 700): number {
  const [val, setVal] = useState(0);
  const raf = useRef<number>(0);
  useEffect(() => {
    if (!actif) return;
    const debut = performance.now();
    const run = (now: number) => {
      const p = Math.min((now - debut) / duree, 1);
      const e = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(e * cible));
      if (p < 1) raf.current = requestAnimationFrame(run);
    };
    raf.current = requestAnimationFrame(run);
    return () => cancelAnimationFrame(raf.current);
  }, [cible, actif, duree]);
  return val;
}

// ─── Composant KPI ────────────────────────────────────────────────────────────
function KpiBloc({
  icone: Icone,
  label,
  valeur,
  varCouleur,
  varBg,
  actif,
  suffixe,
  index,
}: {
  icone: React.ElementType;
  label: string;
  valeur: number;
  varCouleur: string;
  varBg: string;
  actif: boolean;
  suffixe?: string;
  index: number;
}) {
  const v = useCountUp(valeur, actif);
  return (
    <div
      className="animate-fade-up opacity-0 flex items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-xs"
      style={{ animationDelay: `${200 + index * 70}ms`, animationFillMode: 'forwards' }}
    >
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
        style={{ backgroundColor: varBg }}
      >
        <Icone className="h-4.5 w-4.5" style={{ color: varCouleur }} aria-hidden="true" />
      </div>
      <div>
        <p className="text-xl font-bold tabular-nums leading-none">
          {v}
          {suffixe && (
            <span className="ml-1 text-sm font-medium text-muted-foreground">{suffixe}</span>
          )}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

// ─── Ligne info fiche ─────────────────────────────────────────────────────────
function LigneInfo({
  icone: Icone,
  label,
  valeur,
}: {
  icone: React.ElementType;
  label: string;
  valeur: string;
}) {
  return (
    <div className="flex items-start gap-3 py-2.5">
      <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-muted">
        <Icone className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground/70">
          {label}
        </p>
        <p className="mt-0.5 text-sm font-medium wrap-break-word">{valeur}</p>
      </div>
    </div>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────
export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [kpisActifs, setKpisActifs] = useState(false);

  const [dialogModifier, setDialogModifier] = useState(false);
  const [confirmerArchivage, setConfirmerArchivage] = useState(false);
  const [dialogCreerDossier, setDialogCreerDossier] = useState(false);

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

  useEffect(() => {
    if (!chargementClient && client) {
      const t = setTimeout(() => setKpisActifs(true), 150);
      return () => clearTimeout(t);
    }
  }, [chargementClient, client]);

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

  // ── Skeleton ───────────────────────────────────────────────────────────────
  if (chargementClient) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-14 w-14 rounded-2xl" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-52" />
            <Skeleton className="h-3.5 w-36" />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-72 rounded-xl" />
          <Skeleton className="h-72 rounded-xl lg:col-span-2" />
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="flex flex-col items-center gap-4 py-20 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
          <Users className="h-8 w-8 text-muted-foreground/40" aria-hidden="true" />
        </div>
        <div>
          <p className="font-semibold">Client introuvable</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Ce client n'existe pas ou a été supprimé.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => navigate('/cabinet/clients')}>
          <ChevronRight className="mr-1.5 h-3.5 w-3.5 rotate-180" aria-hidden="true" />
          Retour à la liste
        </Button>
      </div>
    );
  }

  const c = client;
  const estMorale = c.type === 'morale';
  const nomClient = nomAffiche(c);

  return (
    <div className="space-y-6 px-1">
      {/* ── En-tête ──────────────────────────────────────────────── */}
      <div
        className="animate-fade-up opacity-0"
        style={{ animationDelay: '0ms', animationFillMode: 'forwards' }}
      >
        {/* Breadcrumb */}
        <div className="mb-4 flex items-center gap-1.5 text-xs text-muted-foreground">
          <button
            onClick={() => navigate('/cabinet/clients')}
            className="transition-colors hover:text-foreground"
          >
            Clients
          </button>
          <ChevronRight className="h-3 w-3" aria-hidden="true" />
          <span className="max-w-48 truncate font-medium text-foreground">{nomClient}</span>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          {/* Identité */}
          <div className="flex items-center gap-4">
            {/* Avatar initiales */}
            <div
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-base font-bold text-primary-foreground shadow-sm"
              style={{ backgroundColor: 'var(--primary)' }}
              aria-hidden="true"
            >
              {estMorale ? <Building2 className="h-6 w-6" /> : initialesAvatar(nomClient)}
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-semibold tracking-tight">{nomClient}</h2>
                <span
                  className="rounded-full px-2 py-0.5 text-[11px] font-medium"
                  style={{
                    color: estMorale ? 'var(--plan-pro)' : 'var(--status-essai)',
                    backgroundColor: estMorale ? 'var(--plan-pro-bg)' : 'var(--status-essai-bg)',
                  }}
                >
                  {estMorale ? 'Personne morale' : 'Personne physique'}
                </span>
              </div>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Client depuis le {format(new Date(c.createdAt), 'dd MMMM yyyy', { locale: fr })}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex shrink-0 flex-wrap gap-2">
            <Button size="sm" onClick={() => setDialogCreerDossier(true)}>
              <Plus className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
              Nouveau dossier
            </Button>
            <Button variant="outline" size="sm" onClick={() => setDialogModifier(true)}>
              <Pencil className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
              Modifier
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-destructive/30 text-destructive hover:border-destructive/50 hover:bg-destructive/5"
              onClick={() => setConfirmerArchivage(true)}
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
              Archiver
            </Button>
          </div>
        </div>
      </div>

      {/* ── KPIs strip ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <KpiBloc
          icone={FolderOpen}
          label={`Dossier${dossiers.length > 1 ? 's' : ''}`}
          valeur={dossiers.length}
          varCouleur="var(--kpi-dossiers)"
          varBg="var(--kpi-dossiers-bg)"
          actif={kpisActifs}
          index={0}
        />
        <KpiBloc
          icone={CreditCard}
          label={`Paiement${paiements.length > 1 ? 's' : ''}`}
          valeur={paiements.length}
          varCouleur="var(--facture-payee)"
          varBg="var(--facture-payee-bg)"
          actif={kpisActifs}
          index={1}
        />
        <KpiBloc
          icone={BadgeCheck}
          label="Total encaissé"
          valeur={totalPaye}
          varCouleur="var(--kpi-revenus)"
          varBg="var(--kpi-revenus-bg)"
          actif={kpisActifs}
          suffixe="DA"
          index={2}
        />
      </div>

      {/* ── Corps — fiche + onglets ───────────────────────────────── */}
      <div className="grid gap-5 lg:grid-cols-3">
        {/* Fiche client */}
        <div
          className="animate-fade-up opacity-0 lg:col-span-1"
          style={{ animationDelay: '420ms', animationFillMode: 'forwards' }}
        >
          <Card>
            <CardHeader className="border-b pb-3 pt-4">
              <CardTitle className="text-sm font-semibold">Fiche client</CardTitle>
            </CardHeader>
            <CardContent className="divide-y divide-border px-4 py-0">
              {!estMorale && c.cin && <LigneInfo icone={FileText} label="NIN" valeur={c.cin} />}

              {estMorale && (
                <>
                  {c.representantLegal && (
                    <LigneInfo
                      icone={Users}
                      label="Représentant légal"
                      valeur={c.representantLegal}
                    />
                  )}
                  {c.nifRc && <LigneInfo icone={BadgeCheck} label="NIF / RC" valeur={c.nifRc} />}
                </>
              )}

              <LigneInfo icone={Phone} label="Téléphone principal" valeur={c.telephone} />

              {c.telephoneSecondaire && (
                <LigneInfo
                  icone={Phone}
                  label="Téléphone secondaire"
                  valeur={c.telephoneSecondaire}
                />
              )}

              {c.email && <LigneInfo icone={Mail} label="Email" valeur={c.email} />}

              {c.adresse && <LigneInfo icone={MapPin} label="Adresse" valeur={c.adresse} />}

              {c.notes && (
                <div className="py-2.5">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-muted">
                      <StickyNote
                        className="h-3.5 w-3.5 text-muted-foreground"
                        aria-hidden="true"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground/70">
                        Notes
                      </p>
                      <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">
                        {c.notes}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Onglets dossiers / paiements */}
        <div
          className="animate-fade-up opacity-0 lg:col-span-2"
          style={{ animationDelay: '460ms', animationFillMode: 'forwards' }}
        >
          <Tabs defaultValue="dossiers" className="flex flex-col">
            <TabsList className="h-9 w-full rounded-xl p-1">
              <TabsTrigger value="dossiers" className="flex-1 gap-2 text-xs">
                Dossiers
                {dossiers.length > 0 && (
                  <span
                    className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none"
                    style={{
                      color: 'var(--kpi-dossiers)',
                      backgroundColor: 'var(--kpi-dossiers-bg)',
                    }}
                  >
                    {dossiers.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="paiements" className="flex-1 gap-2 text-xs">
                Paiements
                {paiements.length > 0 && (
                  <span
                    className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none"
                    style={{
                      color: 'var(--facture-payee)',
                      backgroundColor: 'var(--facture-payee-bg)',
                    }}
                  >
                    {paiements.length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            {/* Tab Dossiers */}
            <TabsContent value="dossiers" className="mt-3">
              <Card>
                <CardContent className="p-0">
                  {chargementDossiers ? (
                    <div className="divide-y divide-border">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-3 px-4 py-3">
                          <Skeleton className="h-8 w-8 rounded-lg" />
                          <div className="flex-1 space-y-1.5">
                            <Skeleton className="h-3.5 w-44" />
                            <Skeleton className="h-3 w-32" />
                          </div>
                          <Skeleton className="h-5 w-16 rounded-full" />
                        </div>
                      ))}
                    </div>
                  ) : dossiers.length === 0 ? (
                    <div className="flex flex-col items-center gap-3 py-14 text-center">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
                        <FolderOpen
                          className="h-6 w-6 text-muted-foreground/40"
                          aria-hidden="true"
                        />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Aucun dossier</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          Aucun dossier n'est associé à ce client
                        </p>
                      </div>
                      <Button size="sm" onClick={() => setDialogCreerDossier(true)}>
                        <Plus className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                        Créer un dossier
                      </Button>
                    </div>
                  ) : (
                    <div className="divide-y divide-border">
                      {dossiers.map((dossier: DossierResume, i) => {
                        // const cfg = styleStatutDossier(dossier.statut as any);
                        const cfg = styleStatutDossier(dossier.statut as StatutDossier);
                        return (
                          <button
                            key={dossier._id}
                            className="animate-fade-up opacity-0 group flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40"
                            style={{
                              animationDelay: `${500 + i * 40}ms`,
                              animationFillMode: 'forwards',
                            }}
                            onClick={() => navigate(`/cabinet/dossiers/${dossier._id}`)}
                          >
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/8 transition-all duration-200 group-hover:scale-105 group-hover:bg-primary/14">
                              <FolderOpen className="h-4 w-4 text-primary" aria-hidden="true" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium">{dossier.titre}</p>
                              <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                                {dossier.reference} ·{' '}
                                {format(new Date(dossier.dateOuverture), 'dd/MM/yyyy')}
                              </p>
                            </div>
                            <span
                              className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium ${cfg.text} ${cfg.bg} ${cfg.border}`}
                            >
                              {cfg.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab Paiements */}
            <TabsContent value="paiements" className="mt-3">
              <Card>
                <CardContent className="p-0">
                  {chargementPaiements ? (
                    <div className="divide-y divide-border">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-3 px-4 py-3">
                          <Skeleton className="h-8 w-8 rounded-lg" />
                          <div className="flex-1 space-y-1.5">
                            <Skeleton className="h-3.5 w-44" />
                            <Skeleton className="h-3 w-32" />
                          </div>
                          <Skeleton className="h-4 w-24" />
                        </div>
                      ))}
                    </div>
                  ) : paiements.length === 0 ? (
                    <div className="flex flex-col items-center gap-3 py-14 text-center">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
                        <CreditCard
                          className="h-6 w-6 text-muted-foreground/40"
                          aria-hidden="true"
                        />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Aucun paiement</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          Aucun paiement enregistré pour ce client
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="divide-y divide-border">
                      {paiements.map((paiement: PaiementResume, i) => {
                        const modeStyle = paiement.modePaiement
                          ? styleModeReglement(paiement.modePaiement)
                          : null;
                        return (
                          <div
                            key={paiement._id}
                            className="animate-fade-up opacity-0 flex items-center gap-3 px-4 py-3"
                            style={{
                              animationDelay: `${500 + i * 40}ms`,
                              animationFillMode: 'forwards',
                            }}
                          >
                            <div
                              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                              style={{ backgroundColor: 'var(--facture-payee-bg)' }}
                            >
                              <CreditCard
                                className="h-4 w-4"
                                style={{ color: 'var(--facture-payee)' }}
                                aria-hidden="true"
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium">
                                {paiement.dossier?.titre ?? 'Dossier inconnu'}
                              </p>
                              <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                                {format(new Date(paiement.date), 'dd MMMM yyyy', {
                                  locale: fr,
                                })}
                                {modeStyle && paiement.modePaiement && (
                                  <>
                                    <span className="text-muted-foreground/40">·</span>
                                    <span
                                      className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${modeStyle.text} ${modeStyle.bg}`}
                                    >
                                      {libelleModeReglement(paiement.modePaiement)}
                                    </span>
                                  </>
                                )}
                              </p>
                            </div>
                            <p
                              className="shrink-0 text-sm font-semibold tabular-nums"
                              style={{ color: 'var(--facture-payee)' }}
                            >
                              +{formaterMontantDA(paiement.montant)}
                            </p>
                          </div>
                        );
                      })}
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
        <DialogModifierClient client={c} onFermer={() => setDialogModifier(false)} />
      )}
      {dialogCreerDossier && (
        <DialogCreerDossier
          ouvert={dialogCreerDossier}
          onFermer={() => setDialogCreerDossier(false)}
          clientPreselectionne={id}
          onSuccess={(dossierId) => navigate(`/cabinet/dossiers/${dossierId}`)}
        />
      )}

      <AlertDialog open={confirmerArchivage} onOpenChange={setConfirmerArchivage}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archiver ce client ?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{nomClient}</strong> sera archivé. Ses dossiers restent accessibles mais il
              n'apparaîtra plus dans la liste des clients actifs.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={archivageEnCours}>Annuler</AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button variant="destructive" disabled={archivageEnCours} onClick={() => archiver()}>
                {archivageEnCours ? 'Archivage\u2026' : 'Archiver'}
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
