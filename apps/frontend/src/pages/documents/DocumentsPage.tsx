import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useDebounce } from 'use-debounce';
import { format, parseISO } from 'date-fns';
import { fr, ar } from 'date-fns/locale';
import {
  Files,
  Upload,
  Download,
  Eye,
  Trash2,
  File,
  FileText,
  Image as ImageIcon,
  FileSpreadsheet,
  FolderOpen,
  Loader2,
  WifiOff,
  Search,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { EmptyState } from '@/components/ui/empty-state';
import { SkeletonTable } from '@/components/ui/skeleton-table';

import {
  listerTousDocuments,
  uploadDocument,
  supprimerDocument,
  construireUrlDocument,
  type DocumentFichier,
  type TypeDocument,
} from '@/api/document.api';
import { listerDossiers } from '@/api/dossier.api';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formaterTaille(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

function obtenirIconeFichier(nom: string): { Icone: React.ElementType; text: string; bg: string } {
  const ext = nom.split('.').pop()?.toLowerCase() ?? '';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext))
    return { Icone: ImageIcon, text: 'text-status-actif', bg: 'bg-status-actif-bg' };
  if (['xls', 'xlsx', 'csv'].includes(ext))
    return { Icone: FileSpreadsheet, text: 'text-status-encours', bg: 'bg-status-encours-bg' };
  if (ext === 'pdf') return { Icone: FileText, text: 'text-destructive', bg: 'bg-destructive/10' };
  if (['doc', 'docx', 'txt'].includes(ext))
    return { Icone: FileText, text: 'text-mode-virement', bg: 'bg-mode-virement-bg' };
  return { Icone: File, text: 'text-muted-foreground', bg: 'bg-muted' };
}

interface ErreurAxios {
  response?: { status?: number; data?: { message?: string; code?: string } };
}
function extraireMessageErreur(err: unknown, fallback: string): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const e = err as ErreurAxios;
    if (e.response?.status === 403 && e.response?.data?.code === 'LIMITESTOCKAGEATTEINTE')
      return '⚠️ Quota de stockage atteint. Passez à un plan supérieur.';
    if (e.response?.data?.message) return e.response.data.message;
  }
  return fallback;
}

type FiltreType = TypeDocument | 'tous';

const schemaUpload = z.object({
  nom: z.string().trim().min(2),
  type: z.enum(['contrat', 'jugement', 'piece', 'autre'] as const),
  dossierId: z.string().min(1),
  description: z.string().optional(),
});
type FormUpload = z.infer<typeof schemaUpload>;

const EXTENSIONS_ACCEPTEES = '.pdf,.doc,.docx,.jpg,.jpeg,.png,.xls,.xlsx,.txt';
const TAILLE_MAX_MO = 10;

// ─── Page principale ──────────────────────────────────────────────────────────
export default function DocumentsPage() {
  const queryClient = useQueryClient();
  const utilisateur = useAuthStore((s) => s.utilisateur);
  const estAdmin = utilisateur?.role === 'admin';

  const { t, i18n } = useTranslation('documents');
  const { t: tc } = useTranslation('common');
  const estRTL = i18n.language === 'ar';
  const locale = estRTL ? ar : fr;

  const [recherche, setRecherche] = useState('');
  const [filtreType, setFiltreType] = useState<FiltreType>('tous');
  const [page, setPage] = useState(1);
  const [dialogUpload, setDialogUpload] = useState(false);
  const [docASupprimer, setDocASupprimer] = useState<DocumentFichier | null>(null);
  const [rechercheDebounced] = useDebounce(recherche, 300);

  const LIMIT = 20;

  const { data, isLoading, isError } = useQuery({
    queryKey: ['cabinet', 'documents', 'global', filtreType, page],
    queryFn: () =>
      listerTousDocuments({
        type: filtreType !== 'tous' ? filtreType : undefined,
        page,
        limit: LIMIT,
      }),
    placeholderData: (prev) => prev,
  });

  const documents = data?.documents ?? [];
  const meta = data?.meta;
  const documentsFiltres = rechercheDebounced
    ? documents.filter((d) => d.nom.toLowerCase().includes(rechercheDebounced.toLowerCase()))
    : documents;
  const filtresActifs = !!(recherche || filtreType !== 'tous');

  // Labels types — réactifs à la langue
  const CONFIG_TYPE_LABELS: Record<TypeDocument, string> = {
    contrat: t('type_contrat'),
    jugement: t('type_jugement'),
    piece: t('type_piece'),
    autre: t('type_autre'),
  };
  const CONFIG_TYPE_STYLE: Record<TypeDocument, { text: string; bg: string }> = {
    contrat: { text: 'text-mode-virement', bg: 'bg-mode-virement-bg' },
    jugement: { text: 'text-status-suspendu', bg: 'bg-status-suspendu-bg' },
    piece: { text: 'text-status-suspendu', bg: 'bg-mode-cheque-bg' },
    autre: { text: 'text-muted-foreground', bg: 'bg-muted/60' },
  };

  const { mutate: effacer, isPending: suppressionEnCours } = useMutation({
    mutationFn: () => supprimerDocument(docASupprimer!._id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cabinet', 'documents'] });
      toast.success(t('doc_deleted'));
      setDocASupprimer(null);
    },
    onError: (err) => toast.error(extraireMessageErreur(err, tc('error'))),
  });

  const reinitialiserFiltres = () => {
    setRecherche('');
    setFiltreType('tous');
    setPage(1);
  };

  return (
    <div className="space-y-5">
      {/* ── En-tête ── */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">{t('title')}</h2>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Files className="h-3.5 w-3.5" aria-hidden="true" />
            {meta
              ? `${meta.total} ${meta.total > 1 ? t('documents_plural') : t('document_singular')}`
              : tc('loading')}
          </p>
        </div>
        <Button size="sm" onClick={() => setDialogUpload(true)}>
          <Upload className="h-3.5 w-3.5" aria-hidden="true" />
          {t('add_document')}
        </Button>
      </div>

      {/* ── Filtres ── */}
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search
            className={`absolute top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground ${estRTL ? 'right-3' : 'left-3'}`}
            aria-hidden="true"
          />
          <Input
            placeholder={t('search_placeholder')}
            className={`h-9 text-sm ${estRTL ? 'pr-9' : 'pl-9'}`}
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
            setFiltreType(v as FiltreType);
            setPage(1);
          }}
        >
          <SelectTrigger className="h-9 w-full text-sm sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="tous">{t('all_types')}</SelectItem>
            <SelectItem value="contrat">{t('type_contrats')}</SelectItem>
            <SelectItem value="jugement">{t('type_jugements')}</SelectItem>
            <SelectItem value="piece">{t('type_pieces')}</SelectItem>
            <SelectItem value="autre">{t('type_autres')}</SelectItem>
          </SelectContent>
        </Select>
        {filtresActifs && (
          <Button variant="ghost" size="sm" onClick={reinitialiserFiltres} className="shrink-0">
            <X className="h-3.5 w-3.5" aria-hidden="true" />
            {estRTL ? 'إعادة ضبط' : 'Réinitialiser'}
          </Button>
        )}
      </div>

      {/* ── Erreur réseau ── */}
      {isError && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <WifiOff className="h-6 w-6 text-destructive" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-medium">{t('load_error')}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{t('load_error_desc')}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                queryClient.invalidateQueries({ queryKey: ['cabinet', 'documents', 'global'] })
              }
            >
              {estRTL ? 'إعادة المحاولة' : 'Réessayer'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── Skeleton ── */}
      {isLoading && (
        <Card>
          <CardContent className="p-0">
            <SkeletonTable lignes={5} avecAvatar={true} avecBadge={true} />
          </CardContent>
        </Card>
      )}

      {/* ── Contenu ── */}
      {!isLoading && !isError && (
        <>
          {documentsFiltres.length === 0 && (
            <Card>
              <CardContent className="p-0">
                <EmptyState
                  icone={Files}
                  titre={filtresActifs ? t('no_docs_filtered') : t('no_docs')}
                  description={filtresActifs ? t('no_docs_filtered_desc') : t('no_docs_desc')}
                  action={
                    !filtresActifs
                      ? {
                          label: t('add_document'),
                          onClick: () => setDialogUpload(true),
                          icone: Upload,
                        }
                      : undefined
                  }
                />
              </CardContent>
            </Card>
          )}

          {documentsFiltres.length > 0 && (
            <Card>
              <CardContent className="p-0">
                <div className="divide-y">
                  {documentsFiltres.map((doc) => {
                    const { Icone, text, bg } = obtenirIconeFichier(doc.nom);
                    const cfgStyle = CONFIG_TYPE_STYLE[doc.type];
                    const cfgLabel = CONFIG_TYPE_LABELS[doc.type];
                    const ext = (doc.nom.split('.').pop() ?? '').toUpperCase();
                    const urlFichier = construireUrlDocument(doc.url);

                    return (
                      <div
                        key={doc._id}
                        className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/30 sm:gap-4 sm:px-5"
                      >
                        <div
                          className={cn(
                            'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                            bg
                          )}
                        >
                          <Icone className={cn('h-4 w-4', text)} aria-hidden="true" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="truncate text-sm font-medium">{doc.nom}</span>
                            <span
                              className={cn(
                                'shrink-0 inline-flex items-center rounded-full px-1.5 py-px text-xs font-medium',
                                cfgStyle.text,
                                cfgStyle.bg
                              )}
                            >
                              {cfgLabel}
                            </span>
                          </div>
                          <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                            <span className="font-mono uppercase">{ext}</span>
                            <span aria-hidden="true">·</span>
                            <span>{formaterTaille(doc.taille)}</span>
                            <span aria-hidden="true">·</span>
                            <span>{format(parseISO(doc.createdAt), 'd MMM yyyy', { locale })}</span>
                            {doc.dossier && (
                              <>
                                <span aria-hidden="true">·</span>
                                <Link
                                  to={`/cabinet/dossiers/${doc.dossier._id}`}
                                  className="flex items-center gap-1 transition-colors hover:text-foreground"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <FolderOpen className="h-3 w-3" aria-hidden="true" />
                                  <span className="font-mono">{doc.dossier.reference}</span>
                                </Link>
                              </>
                            )}
                            {doc.description && (
                              <>
                                <span className="hidden sm:inline" aria-hidden="true">
                                  ·
                                </span>
                                <span className="hidden max-w-48 truncate sm:inline">
                                  {doc.description}
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-0.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            aria-label={t('action_preview')}
                            title={t('action_preview')}
                            onClick={() => window.open(urlFichier, '_blank')}
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          <a
                            href={urlFichier}
                            download={doc.nom}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              aria-label={t('action_download')}
                              title={t('action_download')}
                            >
                              <Download className="h-3.5 w-3.5" />
                            </Button>
                          </a>
                          {estAdmin && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              aria-label={tc('delete')}
                              title={tc('delete')}
                              onClick={() => setDocASupprimer(doc)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Pagination */}
                {meta && meta.totalPages > 1 && (
                  <div className="flex items-center justify-between border-t px-5 py-3">
                    <p className="text-xs text-muted-foreground">
                      {tc('page')} {meta.page} / {meta.totalPages} — {meta.total}{' '}
                      {meta.total > 1 ? t('documents_plural') : t('document_singular')}
                    </p>
                    <div className="flex gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page <= 1}
                        onClick={() => setPage((p) => p - 1)}
                      >
                        {tc('previous')}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page >= meta.totalPages}
                        onClick={() => setPage((p) => p + 1)}
                      >
                        {tc('next')}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* ── Dialog upload ── */}
      {dialogUpload && (
        <DialogUploadGlobal
          onFermer={() => setDialogUpload(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['cabinet', 'documents'] });
            setDialogUpload(false);
          }}
        />
      )}

      {/* ── Confirmation suppression ── */}
      <AlertDialog open={!!docASupprimer} onOpenChange={(o) => !o && setDocASupprimer(null)}>
        <AlertDialogContent dir={estRTL ? 'rtl' : 'ltr'}>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('delete_title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('delete_desc_prefix')} <strong>{docASupprimer?.nom}</strong>{' '}
              {t('delete_desc_suffix')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tc('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => effacer()}
              disabled={suppressionEnCours}
            >
              {suppressionEnCours && (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              )}
              {tc('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Dialog upload global ─────────────────────────────────────────────────────
interface DialogUploadGlobalProps {
  onFermer: () => void;
  onSuccess: () => void;
}

function DialogUploadGlobal({ onFermer, onSuccess }: DialogUploadGlobalProps) {
  const { t, i18n } = useTranslation('documents');
  const { t: tc } = useTranslation('common');
  const estRTL = i18n.language === 'ar';

  const [fichier, setFichier] = useState<File | null>(null);
  const [erreurFichier, setErreurFichier] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const [rechercheDossier, setRechercheDossier] = useState('');
  const [rechercheDossierDebounced] = useDebounce(rechercheDossier, 300);
  const [dossierSelectionne, setDossierSelectionne] = useState<{
    id: string;
    reference: string;
    adversaire: string;
  } | null>(null);
  const [selectorOuvert, setSelectorOuvert] = useState(false);
  const selectorRef = useRef<HTMLDivElement>(null);

  const { data: dossiersData, isLoading: chargementDossiers } = useQuery({
    queryKey: ['cabinet', 'dossiers', 'selector', rechercheDossierDebounced],
    queryFn: () => listerDossiers({ q: rechercheDossierDebounced || undefined, limit: 8 }),
    enabled: selectorOuvert,
  });
  const dossiers = dossiersData?.data ?? [];

  const form = useForm<FormUpload>({
    resolver: zodResolver(schemaUpload),
    defaultValues: { nom: '', type: 'contrat', dossierId: '', description: '' },
  });

  const { mutate: uploader, isPending } = useMutation({
    mutationFn: (values: FormUpload) =>
      uploadDocument({
        fichier: fichier!,
        nom: values.nom,
        type: values.type,
        dossierId: values.dossierId,
        description: values.description || undefined,
      }),
    onSuccess: () => {
      toast.success(t('doc_added'));
      onSuccess();
    },
    onError: (err: unknown) => toast.error(extraireMessageErreur(err, t('upload_error'))),
  });

  function validerEtSelectionner(f: File) {
    setErreurFichier(null);
    const ext = '.' + (f.name.split('.').pop()?.toLowerCase() ?? '');
    if (!EXTENSIONS_ACCEPTEES.split(',').includes(ext)) {
      setErreurFichier(t('file_ext_error'));
      return;
    }
    if (f.size > TAILLE_MAX_MO * 1024 * 1024) {
      setErreurFichier(`${t('file_size_error')} ${TAILLE_MAX_MO} Mo.`);
      return;
    }
    setFichier(f);
    form.setValue('nom', f.name.replace(/\.[^/.]+$/, ''), { shouldValidate: true });
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onFermer()}>
      <DialogContent
        className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg"
        dir={estRTL ? 'rtl' : 'ltr'}
      >
        <DialogHeader className="shrink-0 border-b px-6 py-4">
          <DialogTitle className="text-base">{t('upload_title')}</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {t('upload_formats')} {TAILLE_MAX_MO} Mo.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          <Form {...form}>
            <form onSubmit={form.handleSubmit((v) => uploader(v))} className="space-y-4">
              {/* Zone drag & drop */}
              <div
                role="button"
                tabIndex={0}
                aria-label={t('dropzone_label')}
                className={cn(
                  'relative flex cursor-pointer flex-col items-center justify-center gap-2',
                  'rounded-lg border-2 border-dashed px-6 py-8 text-center transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  dragOver && 'border-primary bg-primary/5',
                  fichier && !dragOver && 'border-status-actif bg-status-actif-bg',
                  !fichier && !dragOver && 'border-border hover:border-primary/50 hover:bg-muted/30'
                )}
                onClick={() => inputRef.current?.click()}
                onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  const f = e.dataTransfer.files?.[0];
                  if (f) validerEtSelectionner(f);
                }}
              >
                <input
                  ref={inputRef}
                  type="file"
                  accept={EXTENSIONS_ACCEPTEES}
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) validerEtSelectionner(f);
                  }}
                />
                {fichier ? (
                  <>
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-status-actif-bg">
                      <FileText className="h-4.5 w-4.5 text-status-actif" aria-hidden="true" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-status-actif">{fichier.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formaterTaille(fichier.size)} — {t('click_to_change')}
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
                      <Upload className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    </div>
                    <p className="text-sm font-medium">{t('dropzone_hint')}</p>
                    <p className="text-xs text-muted-foreground">
                      PDF, DOC, JPG, XLS — max {TAILLE_MAX_MO} Mo
                    </p>
                  </>
                )}
              </div>
              {erreurFichier && (
                <p className="text-xs text-destructive" role="alert">
                  {erreurFichier}
                </p>
              )}

              {/* Dossier + Type */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {/* Sélecteur dossier */}
                <FormField
                  control={form.control}
                  name="dossierId"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel className="text-xs font-medium">
                        {t('form_dossier')} <span className="text-destructive">*</span>
                      </FormLabel>
                      <div ref={selectorRef} className="relative">
                        {dossierSelectionne ? (
                          <div className="flex items-center justify-between rounded-md border border-input bg-background px-3 py-2">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">
                                {dossierSelectionne.adversaire}
                              </p>
                              <p className="font-mono text-xs text-muted-foreground">
                                {dossierSelectionne.reference}
                              </p>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 shrink-0"
                              aria-label={t('deselect_dossier')}
                              onClick={() => {
                                setDossierSelectionne(null);
                                field.onChange('');
                              }}
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ) : (
                          <div className="relative">
                            <Search
                              className={`absolute top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground ${estRTL ? 'right-3' : 'left-3'}`}
                              aria-hidden="true"
                            />
                            <Input
                              placeholder={t('search_dossier_placeholder')}
                              className={`h-9 text-sm ${estRTL ? 'pr-9' : 'pl-9'}`}
                              value={rechercheDossier}
                              onChange={(e) => {
                                setRechercheDossier(e.target.value);
                                setSelectorOuvert(true);
                              }}
                              onFocus={() => setSelectorOuvert(true)}
                            />
                          </div>
                        )}
                        {selectorOuvert && !dossierSelectionne && (
                          <div
                            className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md"
                            role="listbox"
                          >
                            {chargementDossiers ? (
                              <div className="space-y-1.5 p-2">
                                {[...Array(3)].map((_, i) => (
                                  <Skeleton key={i} className="h-10 w-full" />
                                ))}
                              </div>
                            ) : dossiers.length === 0 ? (
                              <p className="p-4 text-center text-sm text-muted-foreground">
                                {rechercheDossier ? t('no_dossier_found') : t('type_to_search')}
                              </p>
                            ) : (
                              <ul className="max-h-52 overflow-y-auto py-1">
                                {dossiers.map((d) => (
                                  <li
                                    key={d._id}
                                    role="option"
                                    aria-selected={false}
                                    className="cursor-pointer px-3 py-2 transition-colors hover:bg-accent"
                                    onMouseDown={(e) => {
                                      e.preventDefault();
                                      setDossierSelectionne({
                                        id: d._id,
                                        reference: d.reference,
                                        adversaire: d.adversaire ?? '—',
                                      });
                                      field.onChange(d._id);
                                      setSelectorOuvert(false);
                                      setRechercheDossier('');
                                    }}
                                  >
                                    <p className="text-sm font-medium">{d.adversaire ?? '—'}</p>
                                    <p className="font-mono text-xs text-muted-foreground">
                                      {d.reference}
                                    </p>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        )}
                      </div>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

                {/* Nom */}
                <FormField
                  control={form.control}
                  name="nom"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-medium">
                        {t('form_name')} <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          className="h-9 text-sm"
                          placeholder={t('form_name_placeholder')}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

                {/* Type */}
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-medium">
                        {t('form_type')} <span className="text-destructive">*</span>
                      </FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-9 w-full text-sm">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="contrat">{t('type_contrat')}</SelectItem>
                          <SelectItem value="jugement">{t('type_jugement')}</SelectItem>
                          <SelectItem value="piece">{t('type_piece')}</SelectItem>
                          <SelectItem value="autre">{t('type_autre')}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              </div>

              {/* Description */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium">
                      {t('form_description')}{' '}
                      <span className="font-normal text-muted-foreground/70">
                        ({tc('optional')})
                      </span>
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={t('form_description_placeholder')}
                        className="resize-none text-sm"
                        rows={2}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </div>

        <div className="shrink-0 border-t px-6 py-4">
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onFermer}
              disabled={isPending}
            >
              {tc('cancel')}
            </Button>
            <Button
              size="sm"
              onClick={form.handleSubmit((v) => uploader(v))}
              disabled={isPending || !fichier}
            >
              {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
              {isPending ? t('uploading') : t('add_button')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
