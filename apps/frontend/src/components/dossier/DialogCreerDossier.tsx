import { useState, useRef, useEffect, useId } from 'react';
import { useForm, Controller } from 'react-hook-form';
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
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

import { creerDossier } from '@/api/dossier.api';
import { listerClients } from '@/api/client.api';
import { nomAffiche } from '@/types';
import type { Client } from '@/types';

// ─── Schéma ───────────────────────────────────────────────────────────────────
const schemaCreerDossier = z.object({
  titre: z.string().min(2, 'Minimum 2 caractères').max(200, 'Titre trop long'),
  client: z.string().min(1, 'Le client est requis'),
  type: z.enum(['civil', 'penal', 'commercial', 'administratif', 'autre'], {
    errorMap: () => ({ message: 'Type requis' }),
  }),
  description: z.string().max(2000).optional(),
  dateOuverture: z.string().optional(),
});

type FormCreerDossier = z.infer<typeof schemaCreerDossier>;

// ─── Composant ────────────────────────────────────────────────────────────────
interface Props {
  ouvert: boolean;
  onFermer: () => void;
}

export default function DialogCreerDossier({ ouvert, onFermer }: Props) {
  const queryClient = useQueryClient();
  const uid = useId(); // préfixe unique pour les ids ARIA

  const [rechercheClient, setRechercheClient] = useState('');
  const [rechercheClientDebounced] = useDebounce(rechercheClient, 300);
  const [clientSelectionne, setClientSelectionne] = useState<Client | null>(null);
  const [selectorOuvert, setSelectorOuvert] = useState(false);
  const selectorRef = useRef<HTMLDivElement>(null);
  const listeRef = useRef<HTMLUListElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    formState: { errors },
  } = useForm<FormCreerDossier>({
    resolver: zodResolver(schemaCreerDossier),
    defaultValues: {
      type: 'civil',
      dateOuverture: new Date().toISOString().split('T')[0],
    },
  });

  // ── Clients ────────────────────────────────────────────────────────────────
  const { data: clientsData, isLoading: chargementClients } = useQuery({
    queryKey: ['cabinet', 'clients', 'selector', rechercheClientDebounced],
    queryFn: () => listerClients({ q: rechercheClientDebounced || undefined, limit: 10 }),
    enabled: selectorOuvert,
  });

  const clients = clientsData?.data ?? [];

  // Fermer le sélecteur au clic extérieur
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (selectorRef.current && !selectorRef.current.contains(e.target as Node))
        setSelectorOuvert(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Mutation ───────────────────────────────────────────────────────────────
  const { mutate, isPending } = useMutation({
    mutationFn: creerDossier,
    onSuccess: (dossier) => {
      queryClient.invalidateQueries({ queryKey: ['cabinet', 'dossiers'] });
      queryClient.invalidateQueries({ queryKey: ['cabinet', 'dashboard'] });
      toast.success(`Dossier ${dossier.reference} créé avec succès`);
      handleReset();
      onFermer();
    },
    onError: () => toast.error('Erreur lors de la création du dossier'),
  });

  const handleReset = () => {
    reset({ type: 'civil', dateOuverture: new Date().toISOString().split('T')[0] });
    setClientSelectionne(null);
    setRechercheClient('');
    setSelectorOuvert(false);
  };

  const handleFermer = () => {
    if (isPending) return;
    handleReset();
    onFermer();
  };

  const selectionnerClient = (client: Client) => {
    setClientSelectionne(client);
    setValue('client', client._id, { shouldValidate: true });
    setRechercheClient('');
    setSelectorOuvert(false);
  };

  const effacerClient = () => {
    setClientSelectionne(null);
    setValue('client', '', { shouldValidate: false });
  };

  return (
    <Dialog open={ouvert} onOpenChange={handleFermer}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nouveau dossier</DialogTitle>
          <DialogDescription>
            La référence DOS-{new Date().getFullYear()}-NNN sera générée automatiquement.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit((data) => mutate(data))} className="space-y-4" noValidate>
          {/* ── Titre ─────────────────────────────────────────── */}
          <div className="space-y-1.5">
            <Label htmlFor={`${uid}-titre`}>Titre du dossier *</Label>
            <Input
              id={`${uid}-titre`}
              placeholder="Ex : Litige commercial Sarl El Baraka"
              disabled={isPending}
              aria-invalid={!!errors.titre}
              aria-describedby={errors.titre ? `${uid}-titre-error` : undefined}
              {...register('titre')}
            />
            {errors.titre && (
              <p id={`${uid}-titre-error`} className="text-xs text-destructive" role="alert">
                {errors.titre.message}
              </p>
            )}
          </div>

          {/* ── Sélecteur client (combobox) ────────────────────── */}
          <div className="space-y-1.5">
            <Label htmlFor={`${uid}-client-search`}>Client *</Label>

            <div
              ref={selectorRef}
              className="relative"
              role="combobox"
              aria-expanded={selectorOuvert}
              aria-haspopup="listbox"
              aria-owns={`${uid}-client-list`}
            >
              {clientSelectionne ? (
                /* Client sélectionné — affichage */
                <div className="flex items-center justify-between rounded-md border border-input bg-background px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{nomAffiche(clientSelectionne)}</p>
                    <p className="text-xs text-muted-foreground">{clientSelectionne.telephone}</p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0"
                    onClick={effacerClient}
                    aria-label="Retirer le client sélectionné"
                  >
                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                  </Button>
                </div>
              ) : (
                /* Champ de recherche */
                <div>
                  <div className="relative">
                    <Search
                      className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                      aria-hidden="true"
                    />
                    <Input
                      id={`${uid}-client-search`}
                      placeholder="Rechercher un client…"
                      className="pl-9"
                      value={rechercheClient}
                      disabled={isPending}
                      aria-invalid={!!errors.client}
                      aria-describedby={errors.client ? `${uid}-client-error` : undefined}
                      aria-autocomplete="list"
                      aria-controls={`${uid}-client-list`}
                      onChange={(e) => {
                        setRechercheClient(e.target.value);
                        setSelectorOuvert(true);
                      }}
                      onFocus={() => setSelectorOuvert(true)}
                    />
                  </div>

                  {/* Dropdown résultats */}
                  {selectorOuvert && (
                    <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md">
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
                        <ul
                          id={`${uid}-client-list`}
                          ref={listeRef}
                          role="listbox"
                          aria-label="Clients"
                          className="max-h-52 overflow-y-auto py-1"
                        >
                          {clients.map((client) => (
                            <li
                              key={client._id}
                              role="option"
                              aria-selected={false}
                              className="cursor-pointer px-3 py-2 transition-colors hover:bg-accent"
                              onMouseDown={(e) => {
                                e.preventDefault(); // évite onBlur avant onClick
                                selectionnerClient(client);
                              }}
                            >
                              <p className="text-sm font-medium">{nomAffiche(client)}</p>
                              <p className="text-xs text-muted-foreground">{client.telephone}</p>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Champ caché portant la valeur pour RHF */}
            <input type="hidden" {...register('client')} />
            {errors.client && (
              <p id={`${uid}-client-error`} className="text-xs text-destructive" role="alert">
                {errors.client.message}
              </p>
            )}
          </div>

          {/* ── Type d'affaire ─────────────────────────────────── */}
          <div className="space-y-1.5">
            <Label htmlFor={`${uid}-type`}>Type d'affaire *</Label>
            <Controller
              name="type"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange} disabled={isPending}>
                  <SelectTrigger id={`${uid}-type`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="civil">Civil</SelectItem>
                    <SelectItem value="penal">Pénal</SelectItem>
                    <SelectItem value="commercial">Commercial</SelectItem>
                    <SelectItem value="administratif">Administratif</SelectItem>
                    <SelectItem value="autre">Autre</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            {errors.type && (
              <p className="text-xs text-destructive" role="alert">
                {errors.type.message}
              </p>
            )}
          </div>

          {/* ── Date d'ouverture ───────────────────────────────── */}
          <div className="space-y-1.5">
            <Label htmlFor={`${uid}-date`}>Date d'ouverture</Label>
            <Input
              id={`${uid}-date`}
              type="date"
              disabled={isPending}
              {...register('dateOuverture')}
            />
          </div>

          {/* ── Description ────────────────────────────────────── */}
          <div className="space-y-1.5">
            <Label htmlFor={`${uid}-desc`}>
              Description{' '}
              <span className="text-xs font-normal text-muted-foreground">(optionnel)</span>
            </Label>
            <Textarea
              id={`${uid}-desc`}
              rows={3}
              placeholder="Contexte de l'affaire, faits importants, accord avec le client…"
              className="resize-none"
              disabled={isPending}
              aria-invalid={!!errors.description}
              aria-describedby={errors.description ? `${uid}-desc-error` : undefined}
              {...register('description')}
            />
            {errors.description && (
              <p id={`${uid}-desc-error`} className="text-xs text-destructive" role="alert">
                {errors.description.message}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleFermer} disabled={isPending}>
              Annuler
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
              {isPending ? 'Création en cours…' : 'Créer le dossier'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
