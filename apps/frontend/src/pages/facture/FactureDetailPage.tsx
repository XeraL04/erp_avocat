import { useState, useId } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ArrowLeft,
  Download,
  Pencil,
  Trash2,
  ChevronRight,
  FileText,
  Send,
  CheckCircle,
  Loader2,
  User,
  FolderOpen,
  MoreHorizontal,
  Eye,
} from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

import {
  obtenirFacture,
  modifierFacture,
  supprimerFacture,
  telechargerFacturePDF,
} from '@/api/facture.api';
import { useAuthStore } from '@/stores/auth.store';
import { nomAffiche } from '@/types';
import type { StatutFacture, ClientPopule, DossierPopuleFacture } from '@/types';
import {
  formaterDate,
  formaterMontantDA,
  couleurStatutFacture,
  libelleStatutFacture,
} from '@/lib/utils';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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

// ─── Schéma ───────────────────────────────────────────────────────────────────
const schemaModifier = z.object({
  montant: z.number({ invalid_type_error: 'invalid' }).positive('positive'),
});
type FormModifier = z.infer<typeof schemaModifier>;

// ─── WorkflowStatut ───────────────────────────────────────────────────────────
const ordreStatut: Record<StatutFacture, number> = {
  brouillon: 0,
  emise: 1,
  payee: 2,
};

function WorkflowStatut({ statut, t }: { statut: StatutFacture; t: (k: string) => string }) {
  const indexActuel = ordreStatut[statut];

  const etapes: { statut: StatutFacture; labelKey: string; Icon: React.ElementType }[] = [
    { statut: 'brouillon', labelKey: 'status_draft', Icon: FileText },
    { statut: 'emise', labelKey: 'status_issued', Icon: Send },
    { statut: 'payee', labelKey: 'status_paid', Icon: CheckCircle },
  ];

  return (
    <div className="flex items-center gap-0" role="list" aria-label={t('workflow_label')}>
      {etapes.map((etape, index) => {
        const estActif = index === indexActuel;
        const estPasse = index < indexActuel;
        const { Icon } = etape;

        return (
          <div
            key={etape.statut}
            className="flex items-center"
            role="listitem"
            aria-current={estActif ? 'step' : undefined}
          >
            {index > 0 && (
              <div
                className={`h-px w-12 transition-colors ${estPasse ? 'bg-(--color-primary)' : 'bg-border'}`}
                aria-hidden="true"
              />
            )}
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-full border-2 transition-all ${
                  estActif
                    ? 'border-(--color-primary) bg-(--color-primary) text-white ring-2 ring-(--color-primary) ring-offset-2'
                    : estPasse
                      ? 'border-(--color-primary) bg-(--color-primary)/10 text-(--color-primary)'
                      : 'border-border bg-muted text-muted-foreground'
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
              </div>
              <span
                className={`text-xs font-medium ${
                  estActif
                    ? 'text-(--color-primary)'
                    : estPasse
                      ? 'text-primary/70'
                      : 'text-muted-foreground'
                }`}
              >
                {t(etape.labelKey)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────
export default function FactureDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const uid = useId();
  const utilisateur = useAuthStore((s) => s.utilisateur);
  const estAdmin = utilisateur?.role === 'admin';

  const { t, i18n } = useTranslation('factures');
  const { t: tc } = useTranslation('common');
  const estRTL = i18n.language === 'ar';

  const [dialogModifier, setDialogModifier] = useState(false);
  const [confirmerSupprimer, setConfirmerSupprimer] = useState(false);
  const [confirmerStatut, setConfirmerStatut] = useState<StatutFacture | null>(null);
  const [telechargementEnCours, setTelechargementEnCours] = useState(false);
  const [visualisationUrl, setVisualisationUrl] = useState<string | null>(null);
  const [visualisationEnCours, setVisualisationEnCours] = useState(false);

  // ── Query ──────────────────────────────────────────────────────────────────
  const {
    data: facture,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['cabinet', 'facture', id],
    queryFn: () => obtenirFacture(id!),
    enabled: !!id,
  });

  // ── Formulaire ─────────────────────────────────────────────────────────────
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormModifier>({
    resolver: zodResolver(schemaModifier),
  });

  // ── Mutations ──────────────────────────────────────────────────────────────
  const { mutate: sauvegarderModif, isPending: enregistrementEnCours } = useMutation({
    mutationFn: (data: FormModifier) => modifierFacture(id!, { montant: data.montant }),
    onSuccess: (factureMAJ) => {
      queryClient.setQueryData(['cabinet', 'facture', id], factureMAJ);
      queryClient.invalidateQueries({ queryKey: ['cabinet', 'factures'] });
      toast.success(t('amount_updated'));
      setDialogModifier(false);
    },
    onError: () => toast.error(tc('error')),
  });

  const { mutate: changerStatut, isPending: changementEnCours } = useMutation({
    mutationFn: (statut: StatutFacture) => modifierFacture(id!, { statut }),
    onSuccess: (factureMAJ) => {
      queryClient.setQueryData(['cabinet', 'facture', id], factureMAJ);
      queryClient.invalidateQueries({ queryKey: ['cabinet', 'factures'] });
      toast.success(`${t('status_changed')} « ${libelleStatutFacture(factureMAJ.statut)} »`);
      setConfirmerStatut(null);
    },
    onError: () => toast.error(tc('error')),
  });

  const { mutate: effacer, isPending: suppressionEnCours } = useMutation({
    mutationFn: () => supprimerFacture(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cabinet', 'factures'] });
      toast.success(t('invoice_deleted'));
      navigate('/cabinet/factures');
    },
    onError: () => toast.error(tc('error')),
  });

  // ── PDF ────────────────────────────────────────────────────────────────────
  async function handleTelechargerPDF() {
    if (!facture) return;
    setTelechargementEnCours(true);
    try {
      await telechargerFacturePDF(facture.id, facture.numero);
      toast.success(t('pdf_downloaded'));
    } catch {
      toast.error(t('pdf_download_error'));
    } finally {
      setTelechargementEnCours(false);
    }
  }

  async function handleVisualiserPDF() {
    if (!facture) return;
    setVisualisationEnCours(true);
    try {
      const token = useAuthStore.getState().accessToken;
      const apiUrl = (import.meta.env.VITE_API_URL as string) ?? 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/cabinet/factures/${facture.id}/pdf`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error();
      const blob = await response.blob();
      setVisualisationUrl(URL.createObjectURL(blob));
    } catch {
      toast.error(t('pdf_preview_error'));
    } finally {
      setVisualisationEnCours(false);
    }
  }

  function fermerVisualisation() {
    if (visualisationUrl) URL.revokeObjectURL(visualisationUrl);
    setVisualisationUrl(null);
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  function ouvrirDialogModifier() {
    if (!facture) return;
    reset({ montant: facture.montant });
    setDialogModifier(true);
  }

  function nomClient(): string {
    if (!facture) return '';
    if (typeof facture.client === 'object' && facture.client !== null)
      return nomAffiche(facture.client as ClientPopule);
    return '';
  }

  function telephoneClient(): string {
    if (!facture || typeof facture.client !== 'object') return '';
    return (facture.client as ClientPopule).telephone ?? '';
  }

  function adresseClient(): string {
    if (!facture || typeof facture.client !== 'object') return '';
    return (facture.client as ClientPopule).adresse ?? '';
  }

  function clientId(): string {
    if (!facture) return '';
    if (typeof facture.client === 'object') return (facture.client as ClientPopule)._id;
    return facture.client as string;
  }

  function dossierPopule(): DossierPopuleFacture | null {
    if (!facture || typeof facture.dossier !== 'object') return null;
    return facture.dossier as DossierPopuleFacture;
  }

  function dossierId(): string {
    if (!facture) return '';
    if (typeof facture.dossier === 'object') return (facture.dossier as DossierPopuleFacture).id;
    return facture.dossier;
  }

  // ── Chargement ─────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-4 w-48" />
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-5 w-24 rounded-full" />
          </div>
          <Skeleton className="h-12 w-40" />
        </div>
        <Skeleton className="h-20 w-full rounded-lg" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-40 rounded-lg" />
          <Skeleton className="h-40 rounded-lg" />
        </div>
      </div>
    );
  }

  // ── Erreur ─────────────────────────────────────────────────────────────────
  if (isError || !facture) {
    return (
      <div className="flex flex-col items-center gap-4 py-24 text-center">
        <FileText className="h-12 w-12 text-muted-foreground/30" aria-hidden="true" />
        <p className="font-medium">{t('not_found')}</p>
        <p className="text-sm text-muted-foreground">{t('not_found_desc')}</p>
        <Button variant="outline" onClick={() => navigate('/cabinet/factures')}>
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {t('back_to_invoices')}
        </Button>
      </div>
    );
  }

  const dossier = dossierPopule();
  const estBrouillon = facture.statut === 'brouillon';

  // ── Rendu ──────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav
        aria-label={t('breadcrumb_label')}
        className="flex items-center gap-1 text-sm text-muted-foreground"
      >
        <Link to="/cabinet/factures" className="transition-colors hover:text-foreground">
          {t('title')}
        </Link>
        <ChevronRight className="h-4 w-4" aria-hidden="true" />
        <span className="font-mono font-medium text-foreground" aria-current="page">
          {facture.numero}
        </span>
      </nav>

      {/* En-tête */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="font-mono text-2xl font-bold tracking-tight">{facture.numero}</h1>
            <Badge variant={couleurStatutFacture(facture.statut)}>
              {libelleStatutFacture(facture.statut)}
            </Badge>
          </div>
          <p className="tabular-nums text-3xl font-bold text-foreground">
            {formaterMontantDA(facture.montant)}
          </p>
          <p className="text-sm text-muted-foreground">
            {t('issued_on')} {formaterDate(facture.dateEmission)}
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={handleVisualiserPDF} disabled={visualisationEnCours}>
            {visualisationEnCours ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Eye className="h-4 w-4" aria-hidden="true" />
            )}
            {t('action_preview')}
          </Button>

          <Button variant="outline" onClick={handleTelechargerPDF} disabled={telechargementEnCours}>
            {telechargementEnCours ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Download className="h-4 w-4" aria-hidden="true" />
            )}
            {t('action_download_pdf')}
          </Button>

          {estBrouillon && (
            <Button variant="outline" onClick={ouvrirDialogModifier}>
              <Pencil className="h-4 w-4" aria-hidden="true" />
              {tc('edit')}
            </Button>
          )}

          {estAdmin && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" aria-label={tc('actions')}>
                  <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align={estRTL ? 'start' : 'end'} className="w-52">
                {facture.statut !== 'emise' && facture.statut !== 'payee' && (
                  <DropdownMenuItem onClick={() => setConfirmerStatut('emise')}>
                    <Send className="h-4 w-4" aria-hidden="true" />
                    {t('action_mark_issued')}
                  </DropdownMenuItem>
                )}
                {facture.statut === 'emise' && (
                  <>
                    <DropdownMenuItem onClick={() => setConfirmerStatut('brouillon')}>
                      <FileText className="h-4 w-4" aria-hidden="true" />
                      {t('action_revert_draft')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setConfirmerStatut('payee')}>
                      <CheckCircle className="h-4 w-4" aria-hidden="true" />
                      {t('action_mark_paid')}
                    </DropdownMenuItem>
                  </>
                )}
                {facture.statut === 'payee' && (
                  <DropdownMenuItem onClick={() => setConfirmerStatut('emise')}>
                    <Send className="h-4 w-4" aria-hidden="true" />
                    {t('action_revert_issued')}
                  </DropdownMenuItem>
                )}
                {estBrouillon && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => setConfirmerSupprimer(true)}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                      {tc('delete')}
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Workflow visuel */}
      <Card>
        <CardContent className="flex items-center justify-center py-6">
          <WorkflowStatut statut={facture.statut} t={t} />
        </CardContent>
      </Card>

      {/* Grille Client + Dossier */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Card Client */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                  <User className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                </div>
                <CardTitle className="text-base">{t('card_client')}</CardTitle>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link to={`/cabinet/clients/${clientId()}`}>
                  {t('view_client')}
                  <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {nomClient() ? (
              <>
                <p className="font-semibold">{nomClient()}</p>
                {telephoneClient() && (
                  <p className="text-sm text-muted-foreground">
                    {estRTL ? 'هاتف' : 'Tél.'} {telephoneClient()}
                  </p>
                )}
                {adresseClient() && (
                  <p className="text-sm text-muted-foreground">{adresseClient()}</p>
                )}
              </>
            ) : (
              <p className="text-sm italic text-muted-foreground">{t('client_unavailable')}</p>
            )}
          </CardContent>
        </Card>

        {/* Card Dossier */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                  <FolderOpen className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                </div>
                <CardTitle className="text-base">{t('card_dossier')}</CardTitle>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link to={`/cabinet/dossiers/${dossierId()}`}>
                  {t('view_dossier')}
                  <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {dossier ? (
              <>
                <p className="font-mono text-sm font-semibold text-(--color-primary)">
                  {dossier.reference}
                </p>
                <p className="font-medium">{dossier.titre}</p>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs capitalize">
                    {dossier.type}
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    {dossier.statut === 'encours'
                      ? t('dossier_encours')
                      : dossier.statut === 'suspendu'
                        ? t('dossier_suspendu')
                        : t('dossier_cloture')}
                  </Badge>
                </div>
              </>
            ) : (
              <p className="text-sm italic text-muted-foreground">{t('dossier_unavailable')}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialog : prévisualisation PDF */}
      <Dialog open={!!visualisationUrl} onOpenChange={(open) => !open && fermerVisualisation()}>
        <DialogContent className="flex h-[90vh] max-w-4xl flex-col gap-0 p-0">
          <DialogHeader className="flex shrink-0 flex-row items-center justify-between border-b px-6 py-4">
            <DialogTitle className="font-mono">{facture.numero}</DialogTitle>
            <Button
              size="sm"
              variant="outline"
              onClick={handleTelechargerPDF}
              disabled={telechargementEnCours}
            >
              {telechargementEnCours ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Download className="h-4 w-4" aria-hidden="true" />
              )}
              {t('action_download_pdf')}
            </Button>
          </DialogHeader>
          <div className="min-h-0 flex-1">
            {visualisationUrl && (
              <iframe
                src={visualisationUrl}
                className="h-full w-full"
                title={`${t('action_preview')} ${facture.numero}`}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog : modifier le montant */}
      <Dialog
        open={dialogModifier}
        onOpenChange={(open) => !open && !enregistrementEnCours && setDialogModifier(false)}
      >
        <DialogContent className="sm:max-w-sm" dir={estRTL ? 'rtl' : 'ltr'}>
          <DialogHeader>
            <DialogTitle>{t('edit_invoice_title')}</DialogTitle>
          </DialogHeader>
          <form
            id={`${uid}-form-modifier`}
            onSubmit={handleSubmit((data) => sauvegarderModif(data))}
            className="space-y-4 py-2"
            noValidate
          >
            <div className="space-y-2">
              <Label htmlFor={`${uid}-montant`}>{t('form_amount')}</Label>
              <Input
                id={`${uid}-montant`}
                type="number"
                step="0.01"
                min="1"
                placeholder={t('form_amount_placeholder')}
                disabled={enregistrementEnCours}
                {...register('montant', { valueAsNumber: true })}
              />
              {errors.montant && (
                <p className="text-sm text-destructive" role="alert">
                  {t('form_amount_error')}
                </p>
              )}
            </div>
          </form>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogModifier(false)}
              disabled={enregistrementEnCours}
            >
              {tc('cancel')}
            </Button>
            <Button type="submit" form={`${uid}-form-modifier`} disabled={enregistrementEnCours}>
              {enregistrementEnCours && (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              )}
              {tc('save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AlertDialog : changer le statut */}
      <AlertDialog
        open={!!confirmerStatut}
        onOpenChange={(open) => !open && setConfirmerStatut(null)}
      >
        <AlertDialogContent dir={estRTL ? 'rtl' : 'ltr'}>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('confirm_status_title')}</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                <span>
                  {t('confirm_status_desc')}{' '}
                  <span className="font-mono font-semibold">{facture.numero}</span>{' '}
                  {estRTL ? 'إلى' : 'en'}{' '}
                  <span className="font-semibold">
                    « {confirmerStatut ? libelleStatutFacture(confirmerStatut) : ''} »
                  </span>{' '}
                  ?
                </span>
                {confirmerStatut === 'emise' && (
                  <span className="mt-2 block text-sm text-(--color-warning)">
                    {t('confirm_status_warning_emise')}
                  </span>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={changementEnCours}>{tc('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmerStatut && changerStatut(confirmerStatut)}
              disabled={changementEnCours}
            >
              {changementEnCours && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              {tc('confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* AlertDialog : supprimer */}
      <AlertDialog open={confirmerSupprimer} onOpenChange={setConfirmerSupprimer}>
        <AlertDialogContent dir={estRTL ? 'rtl' : 'ltr'}>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('delete_title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('delete_detail_desc')}{' '}
              <span className="font-mono font-semibold">{facture.numero}</span>{' '}
              {t('delete_irreversible')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={suppressionEnCours}>{tc('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => effacer()}
              disabled={suppressionEnCours}
            >
              {suppressionEnCours && (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              )}
              {tc('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
