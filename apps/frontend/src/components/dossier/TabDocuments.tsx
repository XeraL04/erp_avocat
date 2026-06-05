import { useState, useRef, useId } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Upload,
  Trash2,
  FileText,
  WifiOff,
  Loader2,
  Download,
  Eye,
  File,
  Image as ImageIcon,
  FileSpreadsheet,
} from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import {
  listerDocumentsDossier,
  uploadDocument,
  supprimerDocument,
  construireUrlDocument,
} from '@/api/document.api';
import type { DocumentFichier, TypeDocument } from '@/api/document.api';
import { useAuthStore } from '@/stores/auth.store';
import { formaterDate, cn } from '@/lib/utils';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formaterTaille(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

function obtenirIconeFichier(nom: string) {
  const ext = nom.split('.').pop()?.toLowerCase() ?? '';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext))
    return { Icone: ImageIcon, cls: 'text-status-encours', bg: 'bg-status-encours-bg' };
  if (['xls', 'xlsx', 'csv'].includes(ext))
    return { Icone: FileSpreadsheet, cls: 'text-status-encours', bg: 'bg-status-encours-bg' };
  if (ext === 'pdf')
    return { Icone: FileText, cls: 'text-kpi-audiences', bg: 'bg-kpi-audiences-bg' };
  if (['doc', 'docx', 'txt'].includes(ext))
    return { Icone: FileText, cls: 'text-kpi-dossiers', bg: 'bg-kpi-dossiers-bg' };
  return { Icone: File, cls: 'text-muted-foreground', bg: 'bg-muted' };
}

interface ErreurAxios {
  response?: { status?: number; data?: { message?: string; code?: string } };
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface Props {
  dossierId: string;
}

// ─── Schéma ───────────────────────────────────────────────────────────────────
const schemaUpload = z.object({
  nom: z.string().min(2),
  type: z.enum(['contrat', 'jugement', 'piece', 'autre'] as const),
  description: z.string().optional(),
});
type FormValues = z.infer<typeof schemaUpload>;

const EXTENSIONS_ACCEPTEES = '.pdf,.doc,.docx,.jpg,.jpeg,.png,.xls,.xlsx,.txt';
const TAILLE_MAX_MO = 10;

// ─── Composant principal ──────────────────────────────────────────────────────
export default function TabDocuments({ dossierId }: Props) {
  const queryClient = useQueryClient();
  const utilisateur = useAuthStore((s) => s.utilisateur);
  const estAdmin = utilisateur?.role === 'admin';

  const { t } = useTranslation('documents');
  const { t: tc } = useTranslation('common');

  const [dialogUpload, setDialogUpload] = useState(false);
  const [documentASupprimer, setDocumentASupprimer] = useState<DocumentFichier | null>(null);

  const {
    data: documents = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['cabinet', 'documents', dossierId],
    queryFn: () => listerDocumentsDossier(dossierId),
    throwOnError: false,
  });

  const { mutate: effacer, isPending: suppressionEnCours } = useMutation({
    mutationFn: () => supprimerDocument(documentASupprimer!._id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cabinet', 'documents', dossierId] });
      toast.success(t('document_supprime'));
      setDocumentASupprimer(null);
    },
    onError: (err: unknown) => toast.error(extraireMessageErreur(err, tc('erreur_suppression'), t)),
  });

  // ── Skeleton ──────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3 pt-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-8 w-32 rounded-md" />
          </div>
        </CardHeader>
        <CardContent className="divide-y p-0">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-5 py-3.5">
              <Skeleton className="h-8 w-8 shrink-0 rounded-md" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-44" />
                <Skeleton className="h-3 w-56" />
              </div>
              <div className="flex gap-1">
                <Skeleton className="h-7 w-7 rounded-md" />
                <Skeleton className="h-7 w-7 rounded-md" />
                <Skeleton className="h-7 w-7 rounded-md" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  // ── Erreur réseau ──────────────────────────────────────────────────────────
  if (isError) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-destructive/8">
            <WifiOff className="h-4.5 w-4.5 text-destructive" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-medium">{t('erreur_chargement')}</p>
            <p className="mt-1 max-w-xs text-xs text-muted-foreground">
              {tc('verifier_connexion')}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              queryClient.invalidateQueries({ queryKey: ['cabinet', 'documents', dossierId] })
            }
          >
            {tc('reessayer')}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // ── Rendu principal ────────────────────────────────────────────────────────
  return (
    <div className="space-y-3">
      <Card>
        <CardHeader className="pb-3 pt-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
              {t('titre')}
              {documents.length > 0 && (
                <span className="rounded-full bg-muted px-1.5 py-0.5 text-xs font-medium tabular-nums">
                  {documents.length}
                </span>
              )}
            </CardTitle>
            <Button size="sm" onClick={() => setDialogUpload(true)}>
              <Upload className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
              {tc('ajouter')}
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {documents.length === 0 ? (
            /* ── État vide ─────────────────────────────────── */
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                <FileText className="h-4.5 w-4.5 text-muted-foreground" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-medium">{t('aucun_document')}</p>
                <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                  {t('aucun_document_desc')}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setDialogUpload(true)}>
                <Upload className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                {t('premier_document')}
              </Button>
            </div>
          ) : (
            /* ── Liste ─────────────────────────────────────── */
            <ul className="divide-y">
              {documents.map((doc) => {
                const { Icone, cls, bg } = obtenirIconeFichier(doc.nom);
                const ext = (doc.nom.split('.').pop() ?? '').toUpperCase();
                const urlFichier = construireUrlDocument(doc.url);

                return (
                  <li
                    key={doc._id}
                    className="group flex items-center gap-3 px-5 py-3 transition-colors hover:bg-accent/40"
                  >
                    {/* Icône fichier */}
                    <div
                      className={cn(
                        'flex h-8 w-8 shrink-0 items-center justify-center rounded-md',
                        bg
                      )}
                    >
                      <Icone className={cn('h-4 w-4', cls)} aria-hidden="true" />
                    </div>

                    {/* Infos */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-sm font-medium">{doc.nom}</span>
                        <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                          <span
                            className={cn('h-1.5 w-1.5 rounded-full', getTypeDot(doc.type))}
                            aria-hidden="true"
                          />
                          {t(`type_${doc.type}`)}
                        </span>
                      </div>
                      <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span className="font-mono uppercase">{ext}</span>
                        <span aria-hidden="true">·</span>
                        <span>{formaterTaille(doc.taille)}</span>
                        <span aria-hidden="true">·</span>
                        <span className="tabular-nums">{formaterDate(doc.createdAt)}</span>
                        {doc.description && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="max-w-40 truncate italic">{doc.description}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        onClick={() => window.open(urlFichier, '_blank')}
                        aria-label={t('visualiser_doc', { nom: doc.nom })}
                      >
                        <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        aria-label={t('telecharger_doc', { nom: doc.nom })}
                        asChild
                      >
                        <a
                          href={urlFichier}
                          download={doc.nom}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Download className="h-3.5 w-3.5" aria-hidden="true" />
                        </a>
                      </Button>
                      {estAdmin && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => setDocumentASupprimer(doc)}
                          aria-label={t('supprimer_doc', { nom: doc.nom })}
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        </Button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Dialog upload */}
      {dialogUpload && (
        <DialogUploadDocument
          dossierId={dossierId}
          onFermer={() => setDialogUpload(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['cabinet', 'documents', dossierId] });
            setDialogUpload(false);
          }}
        />
      )}

      {/* Confirmation suppression */}
      <AlertDialog
        open={!!documentASupprimer}
        onOpenChange={(o) => !o && setDocumentASupprimer(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('confirmer_supprimer_titre')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('confirmer_supprimer_desc', { nom: documentASupprimer?.nom ?? '' })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={suppressionEnCours}>{tc('annuler')}</AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button variant="destructive" disabled={suppressionEnCours} onClick={() => effacer()}>
                {suppressionEnCours ? tc('suppression_en_cours') : tc('supprimer')}
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Helper : dot couleur par type ───────────────────────────────────────────
const TYPE_DOTS: Record<TypeDocument, string> = {
  contrat: 'bg-kpi-dossiers',
  jugement: 'bg-kpi-clients',
  piece: 'bg-kpi-audiences',
  autre: 'bg-muted-foreground/40',
};

function getTypeDot(type: TypeDocument): string {
  return TYPE_DOTS[type] ?? 'bg-muted-foreground/40';
}

// ─── Helper : message erreur ──────────────────────────────────────────────────
function extraireMessageErreur(err: unknown, fallback: string, t: (k: string) => string): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const axiosErr = err as ErreurAxios;
    const { status, data } = axiosErr.response ?? {};
    if (status === 403 && data?.code === 'QUOTA_DOCUMENTS_DEPASSE') return t('erreur_quota');
    if (status === 403) return data?.message ?? t('erreur_limite_stockage');
    if (data?.message) return data.message;
  }
  return fallback;
}

// ─── Dialog : uploader un document ───────────────────────────────────────────
interface DialogUploadDocumentProps {
  dossierId: string;
  onFermer: () => void;
  onSuccess: () => void;
}

function DialogUploadDocument({ dossierId, onFermer, onSuccess }: DialogUploadDocumentProps) {
  const uid = useId();
  const { t } = useTranslation('documents');
  const { t: tc } = useTranslation('common');

  const [fichier, setFichier] = useState<File | null>(null);
  const [erreurFichier, setErreurFichier] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schemaUpload),
    defaultValues: { nom: '', type: 'contrat', description: '' },
  });

  const { mutate: uploader, isPending } = useMutation({
    mutationFn: (values: FormValues) =>
      uploadDocument({
        fichier: fichier!,
        nom: values.nom,
        type: values.type,
        dossierId,
        description: values.description || undefined,
      }),
    onSuccess: () => {
      toast.success(t('document_ajoute'));
      onSuccess();
    },
    onError: (err: unknown) => toast.error(extraireMessageErreur(err, t('erreur_upload'), t)),
  });

  function validerEtSelectionner(f: File) {
    setErreurFichier(null);
    const ext = '.' + (f.name.split('.').pop()?.toLowerCase() ?? '');
    if (!EXTENSIONS_ACCEPTEES.split(',').includes(ext)) {
      setErreurFichier(t('erreur_extension'));
      return;
    }
    if (f.size > TAILLE_MAX_MO * 1024 * 1024) {
      setErreurFichier(t('erreur_taille', { max: TAILLE_MAX_MO }));
      return;
    }
    setFichier(f);
    form.setValue('nom', f.name.replace(/\.[^/.]+$/, ''), { shouldValidate: true });
  }

  return (
    <Dialog open onOpenChange={(o) => !o && !isPending && onFermer()}>
      <DialogContent className="gap-0 p-0 sm:max-w-lg">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle className="text-base">{t('dialog_upload_titre')}</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {t('dialog_upload_desc', { max: TAILLE_MAX_MO })}
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 py-5">
          <Form {...form}>
            <form
              id={`${uid}-form`}
              onSubmit={form.handleSubmit((v) => uploader(v))}
              className="space-y-4"
              noValidate
            >
              {/* ── Zone de dépôt ──────────────────────────── */}
              <div
                role="button"
                tabIndex={0}
                aria-label={t('zone_depot_aria')}
                className={cn(
                  'relative flex cursor-pointer flex-col items-center justify-center gap-2',
                  'rounded-lg border-2 border-dashed px-6 py-6 text-center',
                  'transition-colors focus-visible:outline-none focus-visible:ring-2',
                  'focus-visible:ring-ring focus-visible:ring-offset-2',
                  dragOver
                    ? 'border-primary bg-surface-accent'
                    : fichier
                      ? 'border-status-encours/50 bg-status-encours-bg'
                      : 'border-border hover:border-primary/40 hover:bg-accent/30'
                )}
                onClick={() => inputRef.current?.click()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    inputRef.current?.click();
                  }
                }}
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
                  className="sr-only"
                  aria-hidden="true"
                  disabled={isPending}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) validerEtSelectionner(f);
                  }}
                />

                {fichier ? (
                  <>
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-status-encours-bg">
                      <FileText className="h-4 w-4 text-status-encours" aria-hidden="true" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-status-encours">{fichier.name}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {formaterTaille(fichier.size)} · {t('cliquer_changer')}
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                      <Upload className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {t('glisser_ou')}{' '}
                        <span className="text-primary underline-offset-2 hover:underline">
                          {t('parcourir')}
                        </span>
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {t('formats_acceptes', { max: TAILLE_MAX_MO })}
                      </p>
                    </div>
                  </>
                )}
              </div>

              {erreurFichier && (
                <p className="text-xs text-destructive" role="alert">
                  {erreurFichier}
                </p>
              )}

              {/* ── Nom ─────────────────────────────────────── */}
              <FormField
                control={form.control}
                name="nom"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium">{t('champ_nom')}</FormLabel>
                    <FormControl>
                      <Input
                        className="h-9 text-sm"
                        placeholder={t('placeholder_nom')}
                        disabled={isPending}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              {/* ── Type ────────────────────────────────────── */}
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium">{tc('type')}</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      disabled={isPending}
                    >
                      <FormControl>
                        <SelectTrigger className="h-9 w-full text-sm">
                          <SelectValue placeholder={t('selectionner_type')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(Object.keys(TYPE_DOTS) as TypeDocument[]).map((val) => (
                          <SelectItem key={val} value={val}>
                            <span className="flex items-center gap-2">
                              <span
                                className={cn('h-1.5 w-1.5 rounded-full', TYPE_DOTS[val])}
                                aria-hidden="true"
                              />
                              {t(`type_${val}`)}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              {/* ── Description ─────────────────────────────── */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium">
                      {tc('description')}{' '}
                      <span className="font-normal text-muted-foreground/70">({tc('opt')})</span>
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        className="resize-none text-sm"
                        rows={2}
                        placeholder={t('placeholder_description')}
                        disabled={isPending}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onFermer}
                  disabled={isPending}
                >
                  {tc('annuler')}
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  form={`${uid}-form`}
                  disabled={isPending || !fichier}
                >
                  {isPending && (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                  )}
                  {isPending ? t('upload_en_cours') : tc('ajouter')}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
