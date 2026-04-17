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

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { formaterDate } from '@/lib/utils';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formaterTaille(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

// Tokens CSS uniquement — plus de text-green-600 / bg-blue-50 hardcodés
function obtenirIconeFichier(nom: string) {
  const ext = nom.split('.').pop()?.toLowerCase() ?? '';

  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext))
    return {
      Icone: ImageIcon,
      cls: 'text-[var(--color-success)]',
      bg: 'bg-[var(--color-success)]/10',
    };
  if (['xls', 'xlsx', 'csv'].includes(ext))
    return {
      Icone: FileSpreadsheet,
      cls: 'text-[var(--color-success)]',
      bg: 'bg-[var(--color-success)]/10',
    };
  if (ext === 'pdf')
    return {
      Icone: FileText,
      cls: 'text-[var(--color-notification)]',
      bg: 'bg-[var(--color-notification)]/10',
    };
  if (['doc', 'docx', 'txt'].includes(ext))
    return {
      Icone: FileText,
      cls: 'text-[var(--color-primary)]',
      bg: 'bg-[var(--color-primary)]/10',
    };
  return {
    Icone: File,
    cls: 'text-muted-foreground',
    bg: 'bg-muted',
  };
}

interface ErreurAxios {
  response?: {
    status?: number;
    data?: { message?: string; code?: string };
  };
}

function extraireMessageErreur(err: unknown, fallback: string): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const axiosErr = err as ErreurAxios;
    const { status, data } = axiosErr.response ?? {};
    if (status === 403 && data?.code === 'QUOTA_DOCUMENTS_DEPASSE')
      return '⚠️ Quota de stockage atteint. Passez à un plan supérieur pour uploader davantage.';
    if (status === 403) return data?.message ?? 'Limite de stockage atteinte pour votre plan.';
    if (data?.message) return data.message;
  }
  return fallback;
}

// ─── Config badges type — tokens CSS ─────────────────────────────────────────
const configType: Record<TypeDocument, { label: string; className: string }> = {
  contrat: {
    label: 'Contrat',
    // token primary (teal)
    className:
      'border-[var(--color-primary)]/40 text-[var(--color-primary)] bg-[var(--color-primary)]/8',
  },
  jugement: {
    label: 'Jugement',
    // token purple
    className:
      'border-[var(--color-purple)]/40 text-[var(--color-purple)] bg-[var(--color-purple)]/8',
  },
  piece: {
    label: 'Pièce justificative',
    // token warning (terra brown)
    className:
      'border-[var(--color-warning)]/40 text-[var(--color-warning)] bg-[var(--color-warning)]/8',
  },
  autre: {
    label: 'Autre',
    className: '',
  },
};

// ─── Schéma ───────────────────────────────────────────────────────────────────
const schemaUpload = z.object({
  nom: z.string().min(2, 'Minimum 2 caractères'),
  type: z.enum(['contrat', 'jugement', 'piece', 'autre'] as const),
  description: z.string().optional(),
});
type FormValues = z.infer<typeof schemaUpload>;

// ─── Props ────────────────────────────────────────────────────────────────────
interface Props {
  dossierId: string;
}

// ─── Composant principal ──────────────────────────────────────────────────────
export default function TabDocuments({ dossierId }: Props) {
  const queryClient = useQueryClient();
  const utilisateur = useAuthStore((s) => s.utilisateur);
  const estAdmin = utilisateur?.role === 'admin';

  const [dialogUpload, setDialogUpload] = useState(false);
  const [documentASupprimer, setDocumentASupprimer] = useState<DocumentFichier | null>(null);

  // ── Query ──────────────────────────────────────────────────────────────────
  const {
    data: documents = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['cabinet', 'documents', dossierId],
    queryFn: () => listerDocumentsDossier(dossierId),
    throwOnError: false,
  });

  // ── Mutation suppression ───────────────────────────────────────────────────
  const { mutate: effacer, isPending: suppressionEnCours } = useMutation({
    mutationFn: () => supprimerDocument(documentASupprimer!._id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cabinet', 'documents', dossierId] });
      toast.success('Document supprimé');
      setDocumentASupprimer(null);
    },
    onError: (err: unknown) =>
      toast.error(extraireMessageErreur(err, 'Erreur lors de la suppression')),
  });

  // ── État : chargement ──────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-8 w-44 rounded-md" />
          </div>
        </CardHeader>
        <CardContent className="divide-y p-0">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-6 py-4">
              <Skeleton className="h-9 w-9 rounded-lg" />
              <div className="flex-1 space-y-1.5">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-5 w-24 rounded-full" />
                </div>
                <Skeleton className="h-3 w-52" />
              </div>
              <div className="flex gap-1">
                <Skeleton className="h-8 w-8 rounded-md" />
                <Skeleton className="h-8 w-8 rounded-md" />
                <Skeleton className="h-8 w-8 rounded-md" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  // ── État : erreur réseau ───────────────────────────────────────────────────
  if (isError) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
            <WifiOff className="h-7 w-7 text-destructive" aria-hidden="true" />
          </div>
          <div>
            <p className="font-medium">Impossible de charger les documents</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Vérifiez votre connexion ou rechargez la page.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() =>
              queryClient.invalidateQueries({ queryKey: ['cabinet', 'documents', dossierId] })
            }
          >
            Réessayer
          </Button>
        </CardContent>
      </Card>
    );
  }

  // ── Rendu principal ────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              Documents{documents.length > 0 && ` (${documents.length})`}
            </CardTitle>
            <Button size="sm" onClick={() => setDialogUpload(true)}>
              <Upload className="mr-2 h-4 w-4" aria-hidden="true" />
              Ajouter un document
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {documents.length === 0 ? (
            /* État vide */
            <div className="flex flex-col items-center gap-3 py-14 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <FileText className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
              </div>
              <div>
                <p className="font-medium">Aucun document</p>
                <p className="mt-1 max-w-xs text-sm text-muted-foreground">
                  Ajoutez des contrats, jugements ou pièces justificatives à ce dossier.
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setDialogUpload(true)}>
                <Upload className="mr-2 h-4 w-4" aria-hidden="true" />
                Ajouter le premier document
              </Button>
            </div>
          ) : (
            <div className="divide-y">
              {documents.map((doc) => {
                const { Icone, cls, bg } = obtenirIconeFichier(doc.nom);
                const cfg = configType[doc.type];
                const ext = (doc.nom.split('.').pop() ?? '').toUpperCase();
                const urlFichier = construireUrlDocument(doc.url);

                return (
                  <div
                    key={doc._id}
                    className="flex items-center gap-4 px-6 py-4 transition-colors hover:bg-muted/30"
                  >
                    {/* Icône fichier */}
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${bg}`}
                    >
                      <Icone className={`h-4 w-4 ${cls}`} aria-hidden="true" />
                    </div>

                    {/* Infos */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium">{doc.nom}</span>
                        <Badge variant="outline" className={`shrink-0 text-xs ${cfg.className}`}>
                          {cfg.label}
                        </Badge>
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="font-mono uppercase">{ext}</span>
                        <span aria-hidden="true">·</span>
                        <span>{formaterTaille(doc.taille)}</span>
                        <span aria-hidden="true">·</span>
                        <span>{formaterDate(doc.createdAt)}</span>
                        {doc.description && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="max-w-40 truncate">{doc.description}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      {/* Visualiser */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => window.open(urlFichier, '_blank')}
                        aria-label={`Visualiser ${doc.nom}`}
                      >
                        <Eye className="h-4 w-4" aria-hidden="true" />
                      </Button>

                      {/* Télécharger */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        aria-label={`Télécharger ${doc.nom}`}
                        asChild
                      >
                        <a
                          href={urlFichier}
                          download={doc.nom}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Download className="h-4 w-4" aria-hidden="true" />
                        </a>
                      </Button>

                      {/* Supprimer — admin uniquement */}
                      {estAdmin && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:bg-destructive/5 hover:text-destructive"
                          onClick={() => setDocumentASupprimer(doc)}
                          aria-label={`Supprimer ${doc.nom}`}
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
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
            <AlertDialogTitle>Supprimer ce document ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le fichier <strong>{documentASupprimer?.nom}</strong> sera définitivement supprimé du
              serveur. Action irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => effacer()}
              disabled={suppressionEnCours}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Dialog : uploader un document ───────────────────────────────────────────
interface DialogUploadDocumentProps {
  dossierId: string;
  onFermer: () => void;
  onSuccess: () => void;
}

const EXTENSIONS_ACCEPTEES = '.pdf,.doc,.docx,.jpg,.jpeg,.png,.xls,.xlsx,.txt';
const TAILLE_MAX_MO = 10;

function DialogUploadDocument({ dossierId, onFermer, onSuccess }: DialogUploadDocumentProps) {
  const uid = useId();

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
      toast.success('Document ajouté avec succès');
      onSuccess();
    },
    onError: (err: unknown) => toast.error(extraireMessageErreur(err, "Erreur lors de l'upload")),
  });

  function validerEtSelectionner(f: File) {
    setErreurFichier(null);
    const ext = '.' + (f.name.split('.').pop()?.toLowerCase() ?? '');
    if (!EXTENSIONS_ACCEPTEES.split(',').includes(ext)) {
      setErreurFichier(
        'Extension non autorisée. Acceptées : PDF, DOC, DOCX, JPG, PNG, XLS, XLSX, TXT'
      );
      return;
    }
    if (f.size > TAILLE_MAX_MO * 1024 * 1024) {
      setErreurFichier(`Le fichier dépasse ${TAILLE_MAX_MO} Mo.`);
      return;
    }
    setFichier(f);
    form.setValue('nom', f.name.replace(/\.[^/.]+$/, ''), { shouldValidate: true });
  }

  return (
    <Dialog open onOpenChange={(o) => !o && !isPending && onFermer()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Ajouter un document</DialogTitle>
          <DialogDescription>
            Formats acceptés : PDF, DOC, DOCX, JPG, PNG, XLS, XLSX, TXT — max {TAILLE_MAX_MO} Mo.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            id={`${uid}-form`}
            onSubmit={form.handleSubmit((v) => uploader(v))}
            className="space-y-4"
            noValidate
          >
            {/* ── Zone de dépôt ──────────────────────────────────── */}
            <div
              role="button"
              tabIndex={0}
              aria-label="Zone de dépôt de fichier. Cliquez ou glissez un fichier ici."
              className={`relative flex cursor-pointer flex-col items-center justify-center gap-2
                rounded-lg border-2 border-dashed px-6 py-8 text-center
                transition-colors focus-visible:outline-none focus-visible:ring-2
                focus-visible:ring-ring focus-visible:ring-offset-2 ${
                  dragOver
                    ? 'border-primary bg-primary/5'
                    : fichier
                      ? // token success au lieu de border-green-500 bg-green-50
                        'border-(--color-success)/60 bg-(--color-success)/5'
                      : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30'
                }`}
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
                  {/* Icône succès — token success */}
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-(--color-success)/10">
                    <FileText className="h-5 w-5 text-(--color-success)" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-(--color-success)">{fichier.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formaterTaille(fichier.size)} — Cliquer pour changer
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                    <Upload className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      Glissez un fichier ici ou cliquez pour parcourir
                    </p>
                    <p className="text-xs text-muted-foreground">
                      PDF, DOC, JPG, XLS — max {TAILLE_MAX_MO} Mo
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

            {/* ── Nom ───────────────────────────────────────────── */}
            <FormField
              control={form.control}
              name="nom"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom du document</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ex : Contrat de mission 2026"
                      disabled={isPending}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* ── Type ──────────────────────────────────────────── */}
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={isPending}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="contrat">Contrat</SelectItem>
                      <SelectItem value="jugement">Jugement</SelectItem>
                      <SelectItem value="piece">Pièce justificative</SelectItem>
                      <SelectItem value="autre">Autre</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* ── Description ───────────────────────────────────── */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Description{' '}
                    <span className="text-xs font-normal text-muted-foreground">(optionnelle)</span>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Notes ou détails sur ce document…"
                      className="resize-none"
                      rows={2}
                      disabled={isPending}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={onFermer} disabled={isPending}>
                Annuler
              </Button>
              <Button type="submit" form={`${uid}-form`} disabled={isPending || !fichier}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
                {isPending ? 'Upload en cours…' : 'Ajouter le document'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
