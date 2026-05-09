import { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Search, X } from 'lucide-react';
import { toast } from 'sonner';
import { useDebounce } from 'use-debounce';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

import { creerDossier } from '@/api/dossier.api';
import { listerClients, obtenirClient } from '@/api/client.api';
import {
  nomAffiche,
  LABELS_QUALITE,
  LABELS_TYPE_AFFAIRE,
  SPECIALITES_PAR_TYPE,
  LABELS_INSTITUTION,
  GROUPES_INSTITUTION,
} from '@/types';
import type {
  Client,
  QualitePartie,
  TypeAffaire,
  SpecialiteDossier,
  InstitutionDossier,
} from '@/types';
import InputInstitution from '@/components/dossier/InputInstitution';

// ─── Schéma Zod ───────────────────────────────────────────────────────────────
const qualiteEnum = z.enum([
  'demandeur',
  'defendeur',
  'demandeur_pourvoi',
  'defendeur_pourvoi',
  'demandeur_renvoi',
  'defendeur_renvoi',
]);

const schemaCreerDossier = z.object({
  clientId: z.string().min(1, 'Le client est requis'),
  qualiteClient: qualiteEnum,
  adversaire: z.string().min(2, "Nom de l'adversaire requis (min 2 car.)").trim(),
  qualiteAdversaire: qualiteEnum,
  dossierNumero: z.string().optional(),
  institution: z.string().optional(),
  nomInstitution: z.string().optional(),
  typeAffaire: z.string().optional(),
  specialite: z.string().optional(),
  dateOuverture: z.string().optional(),
  description: z.string().max(2000).optional(),
});

type FormCreerDossier = z.infer<typeof schemaCreerDossier>;

const defaultValues: FormCreerDossier = {
  clientId: '',
  qualiteClient: 'demandeur',
  adversaire: '',
  qualiteAdversaire: 'defendeur',
  dossierNumero: '',
  institution: '',
  nomInstitution: '',
  typeAffaire: '',
  specialite: '',
  dateOuverture: new Date().toISOString().split('T')[0],
  description: '',
};

// ─── Props ────────────────────────────────────────────────────────────────────
interface Props {
  ouvert: boolean;
  onFermer: () => void;
  clientPreselectionne?: string;
  onSuccess?: (dossierId: string) => void;
}

// ─── Composant ────────────────────────────────────────────────────────────────
export default function DialogCreerDossier({
  ouvert,
  onFermer,
  clientPreselectionne,
  onSuccess,
}: Props) {
  const queryClient = useQueryClient();

  const [rechercheClient, setRechercheClient] = useState('');
  const [rechercheClientDebounced] = useDebounce(rechercheClient, 300);
  const [clientSelectionne, setClientSelectionne] = useState<Client | null>(null);
  const [selectorOuvert, setSelectorOuvert] = useState(false);
  const selectorRef = useRef<HTMLDivElement>(null);

  const form = useForm<FormCreerDossier>({
    resolver: zodResolver(schemaCreerDossier),
    defaultValues,
  });

  // ─── Pré-sélection client ──────────────────────────────────────────────────
  const { data: clientPrecharge } = useQuery({
    queryKey: ['cabinet', 'client', clientPreselectionne],
    queryFn: () => obtenirClient(clientPreselectionne!),
    enabled: !!clientPreselectionne && ouvert,
  });

  useEffect(() => {
    if (clientPrecharge && ouvert) {
      setClientSelectionne(clientPrecharge);
      form.setValue('clientId', clientPrecharge._id, { shouldValidate: true });
    }
  }, [clientPrecharge, ouvert, form]);

  useEffect(() => {
    if (!ouvert) {
      form.reset(defaultValues);
      setClientSelectionne(null);
      setRechercheClient('');
      setSelectorOuvert(false);
    }
  }, [ouvert, form]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (selectorRef.current && !selectorRef.current.contains(e.target as Node))
        setSelectorOuvert(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ─── Recherche clients ─────────────────────────────────────────────────────
  const { data: clientsData, isLoading: chargementClients } = useQuery({
    queryKey: ['cabinet', 'clients', 'selector', rechercheClientDebounced],
    queryFn: () => listerClients({ q: rechercheClientDebounced || undefined, limit: 10 }),
    enabled: selectorOuvert,
  });

  const clients = clientsData?.data ?? [];

  // ─── Mutation ──────────────────────────────────────────────────────────────
  const { mutate, isPending } = useMutation({
    mutationFn: creerDossier,
    onSuccess: (dossier) => {
      queryClient.invalidateQueries({ queryKey: ['cabinet', 'dossiers'] });
      queryClient.invalidateQueries({ queryKey: ['cabinet', 'dashboard'] });
      toast.success(`Dossier ${dossier.reference} créé avec succès`);
      if (onSuccess) onSuccess(dossier._id);
      onFermer();
    },
    onError: () => toast.error('Erreur lors de la création du dossier'),
  });

  const handleFermer = () => {
    if (!isPending) onFermer();
  };

  const selectionnerClient = (client: Client) => {
    setClientSelectionne(client);
    form.setValue('clientId', client._id, { shouldValidate: true });
    setRechercheClient('');
    setSelectorOuvert(false);
  };

  const onSubmit = (data: FormCreerDossier) => {
    mutate({
      clientId: data.clientId,
      qualiteClient: data.qualiteClient as QualitePartie,
      adversaire: data.adversaire,
      qualiteAdversaire: data.qualiteAdversaire as QualitePartie,
      dossierNumero: data.dossierNumero || undefined,
      institution: (data.institution || undefined) as InstitutionDossier | undefined,
      nomInstitution: data.nomInstitution?.trim() || undefined,
      typeAffaire: (data.typeAffaire || undefined) as TypeAffaire | undefined,
      specialite: (data.specialite || undefined) as SpecialiteDossier | undefined,
      dateOuverture: data.dateOuverture || undefined,
      description: data.description || undefined,
    });
  };

  const typeAffaireSelectionne = form.watch('typeAffaire');
  const optionsSpecialite = typeAffaireSelectionne
    ? (SPECIALITES_PAR_TYPE[typeAffaireSelectionne as TypeAffaire] ?? [])
    : [];

  const Opt = () => <span className="font-normal text-muted-foreground/70">(opt.)</span>;

  const SectionTitle = ({ children }: { children: React.ReactNode }) => (
    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
      {children}
    </p>
  );

  return (
    <Dialog
      open={ouvert}
      onOpenChange={(o) => {
        if (!o) handleFermer();
      }}
    >
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
        {/* ── Header ──────────────────────────────────────────── */}
        <DialogHeader className="shrink-0 border-b px-6 py-4">
          <DialogTitle className="text-base">Nouveau dossier</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            La référence DOS-{new Date().getFullYear()}-NNN sera générée automatiquement.
          </DialogDescription>
        </DialogHeader>

        {/* ── Body scrollable ─────────────────────────────────── */}
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          <Form {...form}>
            <form
              id="form-creer-dossier"
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-7"
              noValidate
            >
              {/* ══ Parties ═══════════════════════════════════════
                  Grille unique à 2 colonnes :
                  clientId      → col-span-2
                  qualiteClient → col-span-2
                  séparateur    → col-span-2
                  adversaire    → col 1
                  qualiteAdv.   → col 2
              ════════════════════════════════════════════════════ */}
              <section className="space-y-3">
                <SectionTitle>Parties</SectionTitle>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {/* Sélecteur client — pleine largeur */}
                  <FormField
                    control={form.control}
                    name="clientId"
                    render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel className="text-xs font-medium">
                          Pour le compte de / En faveur de{' '}
                          <span className="text-destructive">*</span>
                        </FormLabel>
                        <div ref={selectorRef} className="relative">
                          {clientSelectionne ? (
                            <div className="flex items-center justify-between rounded-md border border-input bg-background px-3 py-2">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium">
                                  {nomAffiche(clientSelectionne)}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {clientSelectionne.telephone}
                                </p>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 shrink-0"
                                aria-label="Désélectionner le client"
                                onClick={() => {
                                  setClientSelectionne(null);
                                  field.onChange('');
                                }}
                              >
                                <X className="h-3.5 w-3.5" aria-hidden="true" />
                              </Button>
                            </div>
                          ) : (
                            <div className="relative">
                              <Search
                                className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                                aria-hidden="true"
                              />
                              <Input
                                placeholder="Rechercher un client…"
                                className="h-9 pl-9 text-sm"
                                value={rechercheClient}
                                onChange={(e) => {
                                  setRechercheClient(e.target.value);
                                  setSelectorOuvert(true);
                                }}
                                onFocus={() => setSelectorOuvert(true)}
                              />
                            </div>
                          )}

                          {selectorOuvert && !clientSelectionne && (
                            <div
                              className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md"
                              role="listbox"
                              aria-label="Résultats de recherche de clients"
                            >
                              {chargementClients ? (
                                <div className="space-y-1.5 p-2">
                                  {Array.from({ length: 3 }).map((_, i) => (
                                    <Skeleton key={i} className="h-10 w-full" />
                                  ))}
                                </div>
                              ) : clients.length === 0 ? (
                                <p className="p-4 text-center text-sm text-muted-foreground">
                                  {rechercheClient
                                    ? 'Aucun client trouvé'
                                    : 'Tapez pour rechercher un client'}
                                </p>
                              ) : (
                                <ul className="max-h-52 overflow-y-auto py-1">
                                  {clients.map((client) => (
                                    <li
                                      key={client._id}
                                      role="option"
                                      aria-selected={false}
                                      className="cursor-pointer px-3 py-2 transition-colors hover:bg-accent"
                                      onMouseDown={(e) => {
                                        e.preventDefault();
                                        selectionnerClient(client);
                                      }}
                                    >
                                      <p className="text-sm font-medium">{nomAffiche(client)}</p>
                                      <p className="text-xs text-muted-foreground">
                                        {client.telephone}
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

                  {/* Qualité du client — pleine largeur */}
                  <FormField
                    control={form.control}
                    name="qualiteClient"
                    render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel className="text-xs font-medium">
                          Qualité du client <span className="text-destructive">*</span>
                        </FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger className="h-9 w-full text-sm">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {(Object.entries(LABELS_QUALITE) as [QualitePartie, string][]).map(
                              ([val, label]) => (
                                <SelectItem key={val} value={val}>
                                  {label}
                                </SelectItem>
                              )
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />

                  {/* Séparateur — pleine largeur */}
                  <div className="sm:col-span-2 border-t border-dashed border-border/60" />

                  {/* Adversaire — col 1 */}
                  <FormField
                    control={form.control}
                    name="adversaire"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-medium">
                          Contre (adversaire) <span className="text-destructive">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            className="h-9 w-full text-sm"
                            placeholder="Nom complet ou raison sociale"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />

                  {/* Qualité adversaire — col 2 */}
                  <FormField
                    control={form.control}
                    name="qualiteAdversaire"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-medium">
                          Qualité de l'adversaire <span className="text-destructive">*</span>
                        </FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger className="h-9 w-full text-sm">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {(Object.entries(LABELS_QUALITE) as [QualitePartie, string][]).map(
                              ([val, label]) => (
                                <SelectItem key={val} value={val}>
                                  {label}
                                </SelectItem>
                              )
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />
                </div>
              </section>

              {/* ══ Identification judiciaire ═════════════════════ */}
              <section className="space-y-3">
                <SectionTitle>Identification judiciaire</SectionTitle>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {/* Dossier n° — col 1 */}
                  <FormField
                    control={form.control}
                    name="dossierNumero"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-medium">
                          Dossier n° <Opt />
                        </FormLabel>
                        <FormControl>
                          <Input
                            className="h-9 w-full text-sm"
                            placeholder="ex : 2024/1234"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />

                  {/* Date d'ouverture — col 2 */}
                  <FormField
                    control={form.control}
                    name="dateOuverture"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-medium">
                          Date d'ouverture <Opt />
                        </FormLabel>
                        <FormControl>
                          <Input type="date" className="h-9 w-full text-sm" {...field} />
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />

                  {/* Institution — col 1 */}
                  <FormField
                    control={form.control}
                    name="institution"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-medium">
                          Institution <Opt />
                        </FormLabel>
                        <Select
                          value={field.value ?? ''}
                          onValueChange={(v) => field.onChange(v === '_none' ? '' : v)}
                        >
                          <FormControl>
                            <SelectTrigger className="h-9 w-full text-sm">
                              <SelectValue placeholder="Sélectionner" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="_none">— Aucune —</SelectItem>
                            {GROUPES_INSTITUTION.map((groupe) => (
                              <SelectGroup key={groupe.label}>
                                <SelectLabel>{groupe.label}</SelectLabel>
                                {groupe.options.map((val) => (
                                  <SelectItem key={val} value={val}>
                                    {LABELS_INSTITUTION[val]}
                                  </SelectItem>
                                ))}
                              </SelectGroup>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />

                  {/* Nom institution — col 2 */}
                  <FormField
                    control={form.control}
                    name="nomInstitution"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-medium">
                          Nom de l'institution <Opt />
                        </FormLabel>
                        <FormControl>
                          <InputInstitution value={field.value ?? ''} onChange={field.onChange} />
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />

                  {/* Type d'affaire — col 1 */}
                  <FormField
                    control={form.control}
                    name="typeAffaire"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-medium">
                          Type d'affaire <Opt />
                        </FormLabel>
                        <Select
                          value={field.value ?? ''}
                          onValueChange={(v) => {
                            field.onChange(v === '_none' ? '' : v);
                            form.setValue('specialite', '');
                          }}
                        >
                          <FormControl>
                            <SelectTrigger className="h-9 w-full text-sm">
                              <SelectValue placeholder="Sélectionner" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="_none">— Aucun —</SelectItem>
                            {(Object.entries(LABELS_TYPE_AFFAIRE) as [TypeAffaire, string][]).map(
                              ([val, label]) => (
                                <SelectItem key={val} value={val}>
                                  {label}
                                </SelectItem>
                              )
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />

                  {/* Spécialité — col 2 */}
                  <FormField
                    control={form.control}
                    name="specialite"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-medium">
                          Spécialité <Opt />
                        </FormLabel>
                        <Select
                          value={field.value ?? ''}
                          onValueChange={(v) => field.onChange(v === '_none' ? '' : v)}
                          disabled={!typeAffaireSelectionne || typeAffaireSelectionne === ''}
                        >
                          <FormControl>
                            <SelectTrigger className="h-9 w-full text-sm">
                              <SelectValue
                                placeholder={
                                  typeAffaireSelectionne
                                    ? 'Sélectionner'
                                    : "Choisir d'abord un type"
                                }
                              />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="_none">— Aucune —</SelectItem>
                            {optionsSpecialite.map(({ valeur, label }) => (
                              <SelectItem key={valeur} value={valeur}>
                                {label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />
                </div>
              </section>

              {/* ══ Description ═══════════════════════════════════ */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium">
                      Description <Opt />
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        rows={3}
                        placeholder="Contexte de l'affaire, faits importants…"
                        className="w-full resize-none text-sm"
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

        {/* ── Footer fixe ─────────────────────────────────────── */}
        <div className="shrink-0 border-t bg-muted/20 px-6 py-3">
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleFermer}
              disabled={isPending}
            >
              Annuler
            </Button>
            <Button type="submit" size="sm" form="form-creer-dossier" disabled={isPending}>
              {isPending && (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              )}
              {isPending ? 'Création…' : 'Créer le dossier'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
