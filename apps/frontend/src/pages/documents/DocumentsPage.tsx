// apps/frontend/src/pages/cabinet/DocumentsPage.tsx
import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useDebounce } from 'use-debounce';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
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

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { Separator } from '@/components/ui/separator';

import {
  listerTousDocuments,
  uploadDocument,
  supprimerDocument,
  construireUrlDocument,
  type DocumentFichier,
  type TypeDocument,
} from '@/api/document.api';
import { listerDossiers } from '@/api/dossier.api';
import { useAuthStore } from '@/stores/auth.store';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formaterTaille(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

function obtenirIconeFichier(nom: string) {
  const ext = nom.split('.').pop()?.toLowerCase() ?? '';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext))
    return { Icone: ImageIcon, cls: 'text-green-600', bg: 'bg-green-50 dark:bg-green-950/30' };
  if (['xls', 'xlsx', 'csv'].includes(ext))
    return {
      Icone: FileSpreadsheet,
      cls: 'text-emerald-600',
      bg: 'bg-emerald-50 dark:bg-emerald-950/30',
    };
  if (ext === 'pdf')
    return { Icone: FileText, cls: 'text-red-600', bg: 'bg-red-50 dark:bg-red-950/30' };
  if (['doc', 'docx', 'txt'].includes(ext))
    return { Icone: FileText, cls: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/30' };
  return { Icone: File, cls: 'text-muted-foreground', bg: 'bg-muted' };
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

// ─── Config types ─────────────────────────────────────────────────────────────

const CONFIG_TYPE: Record<TypeDocument, { label: string; classe: string }> = {
  contrat: {
    label: 'Contrat',
    classe: 'bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400',
  },
  jugement: {
    label: 'Jugement',
    classe: 'bg-purple-100 text-purple-700 dark:bg-purple-950/30 dark:text-purple-400',
  },
  piece: {
    label: 'Pièce justificative',
    classe: 'bg-orange-100 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400',
  },
  autre: { label: 'Autre', classe: '' },
};

type FiltreType = TypeDocument | 'tous';

// ─── Schéma upload ────────────────────────────────────────────────────────────

const schemaUpload = z.object({
  nom: z.string().trim().min(2, 'Minimum 2 caractères'),
  type: z.enum(['contrat', 'jugement', 'piece', 'autre'] as const),
  dossierId: z.string().min(1, 'Le dossier est obligatoire'),
  description: z.string().optional(),
});
type FormUpload = z.infer<typeof schemaUpload>;

const EXTENSIONS_ACCEPTEES = '.pdf,.doc,.docx,.jpg,.jpeg,.png,.xls,.xlsx,.txt';
const TAILLE_MAX_MO = 10;

// ─── Composant principal ──────────────────────────────────────────────────────

export default function DocumentsPage() {
  const queryClient = useQueryClient();
  const utilisateur = useAuthStore((s) => s.utilisateur);
  const estAdmin = utilisateur?.role === 'admin';

  const [recherche, setRecherche] = useState('');
  const [rechercheDebounced] = useDebounce(recherche, 300);
  const [filtreType, setFiltreType] = useState<FiltreType>('tous');
  const [page, setPage] = useState(1);
  const [dialogUpload, setDialogUpload] = useState(false);
  const [docASupprimer, setDocASupprimer] = useState<DocumentFichier | null>(null);

  const LIMIT = 20;

  // ── Query ─────────────────────────────────────────────────────────────────
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

  // Filtre local par nom (sur la page courante)
  const documentsFiltres = rechercheDebounced
    ? documents.filter((d) => d.nom.toLowerCase().includes(rechercheDebounced.toLowerCase()))
    : documents;

  // ── Mutation suppression ──────────────────────────────────────────────────
  const { mutate: effacer, isPending: suppressionEnCours } = useMutation({
    mutationFn: () => supprimerDocument(docASupprimer!._id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cabinet', 'documents'] });
      toast.success('Document supprimé');
      setDocASupprimer(null);
    },
    onError: (err) => toast.error(extraireMessageErreur(err, 'Erreur lors de la suppression')),
  });

  const reinitialiserFiltres = () => {
    setRecherche('');
    setFiltreType('tous');
    setPage(1);
  };

  const filtresActifs = recherche || filtreType !== 'tous';

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Documents</h2>
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Files className="h-4 w-4" />
            {meta ? `${meta.total} document${meta.total > 1 ? 's' : ''}` : 'Chargement…'}
          </p>
        </div>
        <Button size="sm" onClick={() => setDialogUpload(true)}>
          <Upload className="mr-1.5 h-4 w-4" />
          Ajouter un document
        </Button>
      </div>

      {/* Filtres */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom…"
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
            setFiltreType(v as FiltreType);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-full sm:w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="tous">Tous les types</SelectItem>
            <SelectItem value="contrat">Contrats</SelectItem>
            <SelectItem value="jugement">Jugements</SelectItem>
            <SelectItem value="piece">Pièces justificatives</SelectItem>
            <SelectItem value="autre">Autres</SelectItem>
          </SelectContent>
        </Select>

        {filtresActifs && (
          <Button variant="ghost" onClick={reinitialiserFiltres} className="shrink-0">
            <X className="mr-1.5 h-4 w-4" />
            Réinitialiser
          </Button>
        )}
      </div>

      {/* Erreur réseau */}
      {isError && (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
              <WifiOff className="h-7 w-7 text-destructive" />
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
                queryClient.invalidateQueries({ queryKey: ['cabinet', 'documents', 'global'] })
              }
            >
              Réessayer
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Skeleton */}
      {isLoading && (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-18 w-full rounded-lg" />
          ))}
        </div>
      )}

      {/* Liste */}
      {!isLoading && !isError && (
        <>
          {documentsFiltres.length === 0 ? (
            /* Empty state */
            <div className="flex flex-col items-center gap-3 py-16 text-center text-muted-foreground">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                <Files className="h-7 w-7 opacity-40" />
              </div>
              <div>
                <p className="font-medium text-foreground">
                  {filtresActifs ? 'Aucun document trouvé' : 'Aucun document'}
                </p>
                <p className="mt-1 text-sm">
                  {filtresActifs
                    ? 'Modifiez vos critères de recherche'
                    : 'Ajoutez votre premier document depuis un dossier ou ici'}
                </p>
              </div>
              {!filtresActifs && (
                <Button variant="outline" size="sm" onClick={() => setDialogUpload(true)}>
                  <Upload className="mr-1.5 h-4 w-4" />
                  Ajouter un document
                </Button>
              )}
            </div>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="divide-y">
                  {documentsFiltres.map((doc) => {
                    const { Icone, cls, bg } = obtenirIconeFichier(doc.nom);
                    const cfg = CONFIG_TYPE[doc.type];
                    const ext = (doc.nom.split('.').pop() ?? '').toUpperCase();
                    const urlFichier = construireUrlDocument(doc.url);

                    return (
                      <div
                        key={doc._id}
                        className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/30 sm:gap-4 sm:px-6 sm:py-4"
                      >
                        {/* Icône fichier */}
                        <div
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${bg}`}
                        >
                          <Icone className={`h-4 w-4 ${cls}`} />
                        </div>

                        {/* Infos principales */}
                        <div className="min-w-0 flex-1">
                          {/* Ligne 1 : nom + badge type */}
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="truncate text-sm font-medium">{doc.nom}</span>
                            <Badge
                              variant="secondary"
                              className={`shrink-0 px-1.5 py-0 text-xs ${cfg.classe}`}
                            >
                              {cfg.label}
                            </Badge>
                          </div>

                          {/* Ligne 2 : métadonnées */}
                          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <span className="font-mono uppercase">{ext}</span>
                            <span>·</span>
                            <span>{formaterTaille(doc.taille)}</span>
                            <span>·</span>
                            <span>
                              {format(parseISO(doc.createdAt), 'd MMM yyyy', { locale: fr })}
                            </span>
                            {doc.dossier && (
                              <>
                                <span>·</span>
                                <Link
                                  to={`/cabinet/dossiers/${doc.dossier._id}`}
                                  className="flex items-center gap-1 transition-colors hover:text-foreground"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <FolderOpen className="h-3 w-3" />
                                  <span className="font-mono">{doc.dossier.reference}</span>
                                </Link>
                              </>
                            )}
                            {doc.description && (
                              <>
                                <span className="hidden sm:inline">·</span>
                                <span className="hidden max-w-50 truncate sm:inline">
                                  {doc.description}
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex shrink-0 items-center gap-0.5">
                          {/* Visualiser */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            title="Visualiser"
                            onClick={() => window.open(urlFichier, '_blank')}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>

                          {/* Télécharger */}
                          <a
                            href={urlFichier}
                            download={doc.nom}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              title="Télécharger"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </a>

                          {/* Supprimer — admin uniquement */}
                          {estAdmin && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              title="Supprimer"
                              onClick={() => setDocASupprimer(doc)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Pagination */}
                {meta && meta.totalPages > 1 && (
                  <>
                    <Separator />
                    <div className="flex items-center justify-between px-6 py-3">
                      <p className="text-xs text-muted-foreground">
                        Page {meta.page} sur {meta.totalPages} — {meta.total} document
                        {meta.total > 1 ? 's' : ''}
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
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Dialog upload global (avec sélecteur dossier) */}
      {dialogUpload && (
        <DialogUploadGlobal
          onFermer={() => setDialogUpload(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['cabinet', 'documents'] });
            setDialogUpload(false);
          }}
        />
      )}

      {/* Confirmation suppression */}
      <AlertDialog open={!!docASupprimer} onOpenChange={(o) => !o && setDocASupprimer(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce document ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le fichier <strong>{docASupprimer?.nom}</strong> sera définitivement supprimé. Action
              irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => effacer()}
              disabled={suppressionEnCours}
            >
              {suppressionEnCours && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Dialog upload global (avec sélecteur de dossier) ────────────────────────

interface DialogUploadGlobalProps {
  onFermer: () => void;
  onSuccess: () => void;
}

function DialogUploadGlobal({ onFermer, onSuccess }: DialogUploadGlobalProps) {
  const [fichier, setFichier] = useState<File | null>(null);
  const [erreurFichier, setErreurFichier] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Recherche dossier
  const [rechercheDossier, setRechercheDossier] = useState('');
  const [rechercheDossierDebounced] = useDebounce(rechercheDossier, 300);
  const [dossierSelectionne, setDossierSelectionne] = useState<{
    id: string;
    reference: string;
    titre: string;
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
    <Dialog open onOpenChange={(o) => !o && onFermer()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Ajouter un document</DialogTitle>
          <DialogDescription>
            Formats acceptés : PDF, DOC, DOCX, JPG, PNG, XLS, XLSX, TXT — max {TAILLE_MAX_MO} Mo.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => uploader(v))} className="space-y-4">
            {/* Zone drag & drop */}
            <div
              className={`relative flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-6 py-8 text-center transition-colors ${
                dragOver
                  ? 'border-primary bg-primary/5'
                  : fichier
                    ? 'border-green-500 bg-green-50/50 dark:bg-green-950/10'
                    : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30'
              }`}
              onClick={() => inputRef.current?.click()}
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
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 dark:bg-green-950/30">
                    <FileText className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-green-700 dark:text-green-400">
                      {fichier.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formaterTaille(fichier.size)} — Cliquer pour changer
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                    <Upload className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium">
                    Glissez un fichier ici ou cliquez pour parcourir
                  </p>
                  <p className="text-xs text-muted-foreground">
                    PDF, DOC, JPG, XLS — max {TAILLE_MAX_MO} Mo
                  </p>
                </>
              )}
            </div>
            {erreurFichier && <p className="text-xs text-destructive">{erreurFichier}</p>}

            {/* Sélecteur de dossier */}
            <FormField
              control={form.control}
              name="dossierId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dossier *</FormLabel>
                  <div ref={selectorRef} className="relative">
                    {dossierSelectionne ? (
                      <div className="flex items-center justify-between rounded-md border border-input bg-background px-3 py-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{dossierSelectionne.titre}</p>
                          <p className="font-mono text-xs text-muted-foreground">
                            {dossierSelectionne.reference}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0"
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
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          placeholder="Rechercher un dossier…"
                          className="pl-9"
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
                      <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md">
                        {chargementDossiers ? (
                          <div className="space-y-1.5 p-2">
                            {[...Array(3)].map((_, i) => (
                              <Skeleton key={i} className="h-10 w-full" />
                            ))}
                          </div>
                        ) : dossiers.length === 0 ? (
                          <p className="p-4 text-center text-sm text-muted-foreground">
                            {rechercheDossier ? 'Aucun dossier trouvé' : 'Tapez pour rechercher'}
                          </p>
                        ) : (
                          <ul className="max-h-52 overflow-y-auto py-1">
                            {dossiers.map((d) => (
                              <li
                                key={d._id}
                                className="cursor-pointer px-3 py-2 transition-colors hover:bg-accent"
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  setDossierSelectionne({
                                    id: d._id,
                                    reference: d.reference,
                                    titre: d.titre,
                                  });
                                  field.onChange(d._id);
                                  setSelectorOuvert(false);
                                  setRechercheDossier('');
                                }}
                              >
                                <p className="text-sm font-medium">{d.titre}</p>
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
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Nom */}
            <FormField
              control={form.control}
              name="nom"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom du document *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex : Contrat de mission 2026" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Type */}
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
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

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Description{' '}
                    <span className="font-normal text-muted-foreground">(optionnelle)</span>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Notes ou détails sur ce document…"
                      className="resize-none"
                      rows={2}
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
              <Button type="submit" disabled={isPending || !fichier}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isPending ? 'Upload en cours…' : 'Ajouter'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
