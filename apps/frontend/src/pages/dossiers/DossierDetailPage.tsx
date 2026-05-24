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
  ChevronDown,
  CheckCircle,
  PauseCircle,
  Play,
  CalendarClock,
} from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
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
import { styleStatutDossier, libelleStatutDossier, formaterDate, cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';

import DialogModifierDossier from '@/components/dossier/DialogModifierDossier';
import TabReports from '@/components/dossier/TabReports';
import TabDocuments from '@/components/dossier/TabDocuments';
import TabAgenda from '@/components/dossier/TabAgenda';
import TabEtapes from '@/components/dossier/TabEtapes';
import TabFinances from '@/components/dossier/TabFinances';

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function DossierDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const utilisateur = useAuthStore((s) => s.utilisateur);
  const estAdmin = utilisateur?.role === 'admin';

  const { t, i18n } = useTranslation('dossiers');
  const { t: tc } = useTranslation('common');
  const estRTL = i18n.language === 'ar';

  // Config tabs traduite — dans le composant pour réactivité i18n
  const TABS = [
    { value: 'reports', label: estRTL ? 'التقارير' : 'Reports', icon: CalendarClock },
    { value: 'finances', label: estRTL ? 'المالية' : 'Finances', icon: DollarSign },
    { value: 'documents', label: estRTL ? 'المستندات' : 'Documents', icon: FileText },
    { value: 'agenda', label: estRTL ? 'الأجندة' : 'Agenda', icon: Calendar },
    { value: 'etapes', label: estRTL ? 'المراحل' : 'Étapes', icon: ListChecks },
  ] as const;

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
      toast.success(
        estRTL
          ? `${libelleStatutDossier(dossierMaj.statut)} — تم تحديث الحالة`
          : `${libelleStatutDossier(dossierMaj.statut)} — statut mis à jour`
      );
    },
    onError: () => toast.error(tc('error')),
  });

  const { mutate: supprimer, isPending: suppression } = useMutation({
    mutationFn: () => supprimerDossier(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cabinet', 'dossiers'] });
      queryClient.invalidateQueries({ queryKey: ['cabinet', 'dashboard'] });
      toast.success(t('archived'));
      navigate('/cabinet/dossiers', { replace: true });
    },
    onError: () => toast.error(tc('error')),
  });

  // ── Dérivations ────────────────────────────────────────────────────────────
  const clientPopule =
    typeof dossier?.clientId === 'object' ? (dossier.clientId as ClientPopule) : null;

  const clientId =
    typeof dossier?.clientId === 'string'
      ? dossier.clientId
      : ((dossier?.clientId as ClientPopule)?._id ?? '');

  // ── États ──────────────────────────────────────────────────────────────────
  if (isLoading) return <DossierDetailSkeleton />;

  if (!dossier) {
    return (
      <div className="flex flex-col items-center gap-3 py-24 text-center">
        <FolderOpen className="h-10 w-10 text-muted-foreground/25" aria-hidden="true" />
        <p className="text-sm font-medium">{estRTL ? 'الملف غير موجود' : 'Dossier introuvable'}</p>
        <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className={`h-3.5 w-3.5 ${estRTL ? 'rotate-180' : ''}`} />
          {tc('back')}
        </Button>
      </div>
    );
  }

  const intituleDossier = clientPopule
    ? `${nomAffiche(clientPopule)} c/ ${dossier.adversaire}`
    : `c/ ${dossier.adversaire}`;

  const s = styleStatutDossier(dossier.statut);

  return (
    <div className="space-y-6 px-1">
      {/* ── Fil d'Ariane ── */}
      <nav
        aria-label={estRTL ? 'مسار التنقل' : "Fil d'Ariane"}
        className="flex items-center gap-1.5 text-xs text-muted-foreground"
      >
        <Link to="/cabinet/dossiers" className="transition-colors hover:text-foreground">
          {t('title')}
        </Link>
        <span aria-hidden="true" className="text-muted-foreground/40">
          /
        </span>
        <span className="truncate font-medium text-foreground">{intituleDossier}</span>
      </nav>

      {/* ── En-tête ── */}
      <div
        className="animate-fade-up opacity-0 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"
        style={{ animationDelay: '0ms', animationFillMode: 'forwards' }}
      >
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/8 ring-1 ring-primary/12">
            <Scale className="h-4.5 w-4.5 text-primary" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold tracking-tight">{dossier.reference}</h2>
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium',
                  s.text,
                  s.bg,
                  s.border
                )}
              >
                <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', s.dot)} />
                {s.label}
              </span>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <span className="text-sm text-muted-foreground">{intituleDossier}</span>
              {dossier.dossierNumero && <MetaSep value={`N° ${dossier.dossierNumero}`} />}
              {dossier.typeAffaire && <MetaSep value={LABELS_TYPE_AFFAIRE[dossier.typeAffaire]} />}
              {dossier.specialite && <MetaSep value={LABELS_SPECIALITE[dossier.specialite]} />}
              {dossier.institution && <MetaSep value={LABELS_INSTITUTION[dossier.institution]} />}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-2">
          {estAdmin && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" disabled={changementStatut}>
                  <span className={cn('h-1.5 w-1.5 rounded-full', s.dot)} />
                  {tc('status')}
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align={estRTL ? 'start' : 'end'} className="w-48">
                {dossier.statut !== 'encours' && (
                  <DropdownMenuItem onClick={() => changerStatut('encours')}>
                    <Play className="h-3.5 w-3.5 text-status-encours" />
                    {estRTL ? 'إعادة تفعيل' : 'Remettre en cours'}
                  </DropdownMenuItem>
                )}
                {dossier.statut !== 'suspendu' && (
                  <DropdownMenuItem onClick={() => changerStatut('suspendu')}>
                    <PauseCircle className="h-3.5 w-3.5 text-status-suspendu" />
                    {t('suspend')}
                  </DropdownMenuItem>
                )}
                {dossier.statut !== 'cloture' && (
                  <DropdownMenuItem onClick={() => changerStatut('cloture')}>
                    <CheckCircle className="h-3.5 w-3.5 text-muted-foreground" />
                    {t('close')}
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <Button variant="outline" size="sm" onClick={() => setDialogModifier(true)}>
            <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
            {tc('edit')}
          </Button>

          {estAdmin && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:bg-destructive/8 hover:text-destructive"
              onClick={() => setConfirmerSupprimer(true)}
              aria-label={estRTL ? 'أرشفة هذا الملف' : 'Archiver ce dossier'}
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            </Button>
          )}
        </div>
      </div>

      {/* ── Infos permanentes ── */}
      <div
        className="animate-fade-up opacity-0 grid gap-4 sm:grid-cols-2"
        style={{ animationDelay: '60ms', animationFillMode: 'forwards' }}
      >
        {/* Parties */}
        <Card>
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {estRTL ? 'الأطراف' : 'Parties'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pb-4">
            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                {estRTL ? 'بالنيابة عن' : 'Pour le compte de'}
              </p>
              {clientPopule ? (
                <div className="space-y-1">
                  <p className="text-sm font-semibold">{nomAffiche(clientPopule)}</p>
                  <p className="text-xs text-muted-foreground">
                    {LABELS_QUALITE[dossier.qualiteClient]}
                  </p>
                  {clientPopule.telephone && (
                    <p className="text-xs text-muted-foreground">{clientPopule.telephone}</p>
                  )}
                  {clientPopule.email && (
                    <p className="text-xs text-muted-foreground">{clientPopule.email}</p>
                  )}
                  <Button variant="outline" size="sm" className="mt-2 h-7 text-xs" asChild>
                    <Link to={`/cabinet/clients/${clientPopule._id}`}>
                      {estRTL ? 'عرض بطاقة العميل' : 'Voir la fiche client'}
                    </Link>
                  </Button>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  {estRTL ? 'العميل غير متوفر' : 'Client non disponible'}
                </p>
              )}
            </div>
            <Separator />
            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                {estRTL ? 'ضد' : 'Contre'}
              </p>
              <p className="text-sm font-semibold">{dossier.adversaire}</p>
              <p className="text-xs text-muted-foreground">
                {LABELS_QUALITE[dossier.qualiteAdversaire]}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Informations */}
        <Card>
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {estRTL ? 'معلومات الملف' : 'Informations'}
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <dl className="divide-y divide-border/60">
              <InfoLigne label={t('reference')} valeur={dossier.reference} mono />
              {dossier.dossierNumero && (
                <InfoLigne
                  label={estRTL ? 'رقم الملف' : 'N° dossier'}
                  valeur={dossier.dossierNumero}
                  mono
                />
              )}
              {dossier.institution && (
                <InfoLigne
                  label={estRTL ? 'الجهة' : 'Institution'}
                  valeur={LABELS_INSTITUTION[dossier.institution]}
                />
              )}
              {dossier.typeAffaire && (
                <InfoLigne label={t('type')} valeur={LABELS_TYPE_AFFAIRE[dossier.typeAffaire]} />
              )}
              {dossier.specialite && (
                <InfoLigne
                  label={estRTL ? 'التخصص' : 'Spécialité'}
                  valeur={LABELS_SPECIALITE[dossier.specialite]}
                />
              )}
              <InfoLigne label={t('opening_date')} valeur={formaterDate(dossier.dateOuverture)} />
              {dossier.dateCloture && (
                <InfoLigne
                  label={estRTL ? 'تاريخ الإغلاق' : 'Clôturé le'}
                  valeur={formaterDate(dossier.dateCloture)}
                />
              )}
              <InfoLigne
                label={estRTL ? 'تاريخ الإنشاء' : 'Créé le'}
                valeur={formaterDate(dossier.createdAt)}
              />
            </dl>
          </CardContent>
        </Card>
      </div>

      {/* ── Description ── */}
      {dossier.description && (
        <div
          className="animate-fade-up opacity-0"
          style={{ animationDelay: '100ms', animationFillMode: 'forwards' }}
        >
          <Card>
            <CardHeader className="pb-2 pt-4">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {estRTL ? 'الوصف' : 'Description'}
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/80">
                {dossier.description}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Tabs ── */}
      <div
        className="animate-fade-up opacity-0"
        style={{ animationDelay: '140ms', animationFillMode: 'forwards' }}
      >
        <Tabs defaultValue="reports" className="w-full flex-col">
          <div className="mb-6">
            <TabsList
              className={cn(
                'flex h-auto w-full items-center justify-start gap-1',
                'overflow-x-auto rounded-xl bg-muted/60 p-1',
                '[&::-webkit-scrollbar]:hidden'
              )}
            >
              {TABS.map(({ value, label, icon: Icon }) => (
                <TabsTrigger
                  key={value}
                  value={value}
                  className={cn(
                    'group relative flex shrink-0 items-center gap-2',
                    'rounded-lg px-3.5 py-2 text-xs font-medium',
                    'text-muted-foreground outline-none',
                    'transition-all duration-200 ease-out',
                    'hover:bg-background/60 hover:text-foreground',
                    'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
                    'data-[state=active]:bg-background',
                    'data-[state=active]:text-foreground',
                    'data-[state=active]:shadow-sm',
                    'data-[state=active]:shadow-black/8'
                  )}
                >
                  <Icon
                    className={cn(
                      'h-3.5 w-3.5 shrink-0 transition-colors duration-200',
                      'text-muted-foreground/70',
                      'group-data-[state=active]:text-primary'
                    )}
                    aria-hidden="true"
                  />
                  <span className="whitespace-nowrap">{label}</span>
                  {value === 'reports' && (dossier.reports?.length ?? 0) > 0 && (
                    <span
                      className={cn(
                        'ml-0.5 rounded-full px-1.5 py-px text-[10px] font-semibold',
                        'bg-background/80 text-muted-foreground',
                        'transition-colors duration-200',
                        'group-data-[state=active]:bg-primary/12 group-data-[state=active]:text-primary'
                      )}
                    >
                      {dossier.reports.length}
                    </span>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {/* Contenus tabs */}
          <TabsContent value="reports" className="focus-visible:outline-none">
            <TabReports
              dossierId={dossier._id}
              reports={dossier.reports ?? []}
              estAdmin={estAdmin}
              onMutationSuccess={() =>
                queryClient.invalidateQueries({ queryKey: ['cabinet', 'dossier', id] })
              }
            />
          </TabsContent>
          <TabsContent value="finances" className="focus-visible:outline-none">
            <TabFinances dossierId={id!} clientId={clientId} />
          </TabsContent>
          <TabsContent value="documents" className="focus-visible:outline-none">
            <TabDocuments dossierId={id!} />
          </TabsContent>
          <TabsContent value="agenda" className="focus-visible:outline-none">
            <TabAgenda dossierId={dossier._id} />
          </TabsContent>
          <TabsContent value="etapes" className="focus-visible:outline-none">
            <TabEtapes dossierId={dossier._id} />
          </TabsContent>
        </Tabs>
      </div>

      {/* ── Dialogs ── */}
      {dialogModifier && (
        <DialogModifierDossier dossier={dossier} onFermer={() => setDialogModifier(false)} />
      )}

      <AlertDialog open={confirmerSupprimer} onOpenChange={setConfirmerSupprimer}>
        <AlertDialogContent dir={estRTL ? 'rtl' : 'ltr'}>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('archive_title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {estRTL ? 'الملف ' : 'Le dossier '}
              <strong>{intituleDossier}</strong>{' '}
              <span className="font-mono text-xs">({dossier.reference})</span>{' '}
              {t('archive_warning')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={suppression}>{tc('cancel')}</AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button variant="destructive" disabled={suppression} onClick={() => supprimer()}>
                {suppression
                  ? estRTL
                    ? 'جاري الأرشفة…'
                    : 'Archivage…'
                  : estRTL
                    ? 'أرشفة'
                    : 'Archiver'}
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Sous-composants ──────────────────────────────────────────────────────────

function MetaSep({ value }: { value: string }) {
  return (
    <>
      <span className="text-muted-foreground/30" aria-hidden="true">
        ·
      </span>
      <span className="text-sm text-muted-foreground">{value}</span>
    </>
  );
}

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
    <div className="flex items-center justify-between gap-4 py-2 text-xs">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={cn('text-right', mono ? 'font-mono font-semibold' : 'font-medium')}>
        {valeur}
      </dd>
    </div>
  );
}

function DossierDetailSkeleton() {
  return (
    <div className="space-y-6 px-1">
      <Skeleton className="h-3.5 w-44" />
      <div className="flex items-start gap-3">
        <Skeleton className="h-10 w-10 rounded-lg" />
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <Skeleton className="h-3.5 w-64" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Skeleton className="h-52 rounded-lg" />
        <Skeleton className="h-52 rounded-lg" />
      </div>
      <Skeleton className="h-11 w-full rounded-xl" />
      <Skeleton className="h-56 rounded-lg" />
    </div>
  );
}
