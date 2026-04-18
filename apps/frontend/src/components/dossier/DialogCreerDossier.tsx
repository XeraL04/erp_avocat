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
import { Separator } from '@/components/ui/separator';

import { creerDossier } from '@/api/dossier.api';
import { listerClients, obtenirClient } from '@/api/client.api';
import {
  nomAffiche,
  LABELS_QUALITE,
  LABELS_TYPE_AFFAIRE,
  // LABELS_SPECIALITE,
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

// ─── Valeurs par défaut ───────────────────────────────────────────────────────

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
}

// ─── Composant ────────────────────────────────────────────────────────────────

export default function DialogCreerDossier({ ouvert, onFermer, clientPreselectionne }: Props) {
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

  // ─── Pré-sélection client ─────────────────────────────────────────────────

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

  // Reset à la fermeture
  useEffect(() => {
    if (!ouvert) {
      form.reset(defaultValues);
      setClientSelectionne(null);
      setRechercheClient('');
      setSelectorOuvert(false);
    }
  }, [ouvert, form]);

  // Fermeture dropdown au clic extérieur
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (selectorRef.current && !selectorRef.current.contains(e.target as Node))
        setSelectorOuvert(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ─── Recherche clients ────────────────────────────────────────────────────

  const { data: clientsData, isLoading: chargementClients } = useQuery({
    queryKey: ['cabinet', 'clients', 'selector', rechercheClientDebounced],
    queryFn: () => listerClients({ q: rechercheClientDebounced || undefined, limit: 10 }),
    enabled: selectorOuvert,
  });

  const clients = clientsData?.data ?? [];

  // ─── Mutation ─────────────────────────────────────────────────────────────

  const { mutate, isPending } = useMutation({
    mutationFn: creerDossier,
    onSuccess: (dossier) => {
      queryClient.invalidateQueries({ queryKey: ['cabinet', 'dossiers'] });
      queryClient.invalidateQueries({ queryKey: ['cabinet', 'dashboard'] });
      toast.success(`Dossier ${dossier.reference} créé avec succès`);
      onFermer();
    },
    onError: () => toast.error('Erreur lors de la création du dossier'),
  });

  const handleFermer = () => {
    if (isPending) return;
    onFermer();
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

  // Valeur typeAffaire observée pour filtrer les spécialités
  const typeAffaireSelectionne = form.watch('typeAffaire');
  const optionsSpecialite = typeAffaireSelectionne
    ? (SPECIALITES_PAR_TYPE[typeAffaireSelectionne as TypeAffaire] ?? [])
    : [];

  return (
    <Dialog
      open={ouvert}
      onOpenChange={(o) => {
        if (!o) handleFermer();
      }}
    >
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
        {/* ── Header fixe ── */}
        <DialogHeader className="shrink-0 border-b px-6 py-4">
          <DialogTitle>Nouveau dossier</DialogTitle>
          <DialogDescription>
            La référence DOS-{new Date().getFullYear()}-NNN sera générée automatiquement.
          </DialogDescription>
        </DialogHeader>

        {/* ── Body scrollable ── */}
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          <Form {...form}>
            <form
              id="form-creer-dossier"
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-6"
            >
              {/* ── Parties ──────────────────────────────────────────────── */}
              <div className="space-y-4">
                <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Parties
                </h3>

                {/* Sélecteur client */}
                <FormField
                  control={form.control}
                  name="clientId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pour le compte de / En faveur de *</FormLabel>
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
                              className="pl-9"
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
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Qualité du client */}
                <FormField
                  control={form.control}
                  name="qualiteClient"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Qualité du client *</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
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
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Separator />

                {/* Adversaire */}
                <FormField
                  control={form.control}
                  name="adversaire"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contre (adversaire) *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Nom complet de l'adversaire ou raison sociale"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Qualité de l'adversaire */}
                <FormField
                  control={form.control}
                  name="qualiteAdversaire"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Qualité de l'adversaire *</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
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
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* ── Identification judiciaire ─────────────────────────────── */}
              <div className="space-y-4">
                <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Identification judiciaire
                </h3>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {/* N° dossier */}
                  <FormField
                    control={form.control}
                    name="dossierNumero"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Dossier n°{' '}
                          <span className="font-normal text-muted-foreground">(opt.)</span>
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="Ex : 2024/1234" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Date d'ouverture */}
                  <FormField
                    control={form.control}
                    name="dateOuverture"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Date d'ouverture{' '}
                          <span className="font-normal text-muted-foreground">(opt.)</span>
                        </FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Institution */}
                  <FormField
                    control={form.control}
                    name="institution"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Institution{' '}
                          <span className="font-normal text-muted-foreground">(opt.)</span>
                        </FormLabel>
                        <Select
                          value={field.value ?? ''}
                          onValueChange={(v) => field.onChange(v === '_none' ? '' : v)}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Sélectionner l'institution" />
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
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Nom de l'institution */}
                  <FormField
                    control={form.control}
                    name="nomInstitution"
                    render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel>
                          Quelle institution{' '}
                          <span className="font-normal text-muted-foreground">(opt.)</span>
                        </FormLabel>
                        <FormControl>
                          <InputInstitution value={field.value ?? ''} onChange={field.onChange} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Type d'affaire */}
                  <FormField
                    control={form.control}
                    name="typeAffaire"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Type d'affaire{' '}
                          <span className="font-normal text-muted-foreground">(opt.)</span>
                        </FormLabel>
                        <Select
                          value={field.value ?? ''}
                          onValueChange={(v) => {
                            field.onChange(v === '_none' ? '' : v);
                            // Réinitialise la spécialité quand le type change
                            form.setValue('specialite', '');
                          }}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Sélectionner le type" />
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
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Spécialité — dépend du type d'affaire */}
                  <FormField
                    control={form.control}
                    name="specialite"
                    render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel>
                          Spécialité{' '}
                          <span className="font-normal text-muted-foreground">(opt.)</span>
                        </FormLabel>
                        <Select
                          value={field.value ?? ''}
                          onValueChange={(v) => field.onChange(v === '_none' ? '' : v)}
                          disabled={!typeAffaireSelectionne || typeAffaireSelectionne === ''}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue
                                placeholder={
                                  typeAffaireSelectionne
                                    ? 'Sélectionner la spécialité'
                                    : "Choisir d'abord un type d'affaire"
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
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* ── Description ──────────────────────────────────────────── */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Description <span className="font-normal text-muted-foreground">(opt.)</span>
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        rows={3}
                        placeholder="Contexte de l'affaire, faits importants…"
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </div>

        {/* ── Footer fixe ── */}
        <div className="shrink-0 border-t px-6 py-4">
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={handleFermer} disabled={isPending}>
              Annuler
            </Button>
            <Button type="submit" form="form-creer-dossier" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
              {isPending ? 'Création…' : 'Créer le dossier'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
