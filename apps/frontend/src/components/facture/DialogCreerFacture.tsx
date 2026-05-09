import { useState, useRef, useEffect, useId } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Search, X } from 'lucide-react';
import { toast } from 'sonner';
import type { AxiosError } from 'axios';

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

import { creerFacture } from '@/api/facture.api';
import { listerClients } from '@/api/client.api';
import { listerDossiers } from '@/api/dossier.api';
import { nomAffiche } from '@/types';
import type { Client } from '@/types';
import { extraireMessageErreur } from '@/api/auth.api';

// ─── Schéma ───────────────────────────────────────────────────────────────────
const schema = z.object({
  clientId: z.string({ required_error: 'Le client est obligatoire' }).min(1),
  dossierId: z.string({ required_error: 'Le dossier est obligatoire' }).min(1),
  montant: z.preprocess(
    (val) => (val === '' || val === undefined || isNaN(Number(val)) ? undefined : Number(val)),
    z.number({ required_error: 'Montant obligatoire' }).positive('Le montant doit être positif')
  ) as z.ZodType<number>, // ✅ cast explicite pour RHF
  dateEmission: z
    .string()
    .optional()
    .refine((val) => !val || /^\d{4}-\d{2}-\d{2}$/.test(val), { message: 'Date invalide' }),
});

type FormCreerFacture = z.infer<typeof schema>;

// ─── Props ────────────────────────────────────────────────────────────────────
interface Props {
  ouvert: boolean;
  onFermer: () => void;
  dossierId?: string;
  clientId?: string;
}

// ─── Composant ────────────────────────────────────────────────────────────────
export function DialogCreerFacture({
  ouvert,
  onFermer,
  dossierId: dossierIdProp,
  clientId: clientIdProp,
}: Props) {
  const queryClient = useQueryClient();
  const uid = useId();

  const [rechercheClient, setRechercheClient] = useState('');
  const [clientSelectionne, setClientSelectionne] = useState<Client | null>(null);
  const [selectorOuvert, setSelectorOuvert] = useState(false);

  const inputRechercheRef = useRef<HTMLInputElement>(null);
  const selectorRef = useRef<HTMLDivElement>(null);

  const modeContextualise = !!dossierIdProp && !!clientIdProp;

  // ✅ Fix dossierId — defaultValues au lieu de useEffect
  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    formState: { errors },
  } = useForm<FormCreerFacture>({
    resolver: zodResolver(schema),
    defaultValues: {
      clientId: clientIdProp ?? '',
      dossierId: dossierIdProp ?? '',
      montant: undefined,
      dateEmission: '',
    },
  });

  // ── Queries ────────────────────────────────────────────────────────────────
  const { data: dataClients, isLoading: chargementClients } = useQuery({
    queryKey: ['cabinet', 'clients', 'selector', rechercheClient],
    queryFn: () => listerClients({ q: rechercheClient || undefined, limit: 10 }),
    enabled: ouvert && selectorOuvert,
  });

  const { data: dataDossiers } = useQuery({
    queryKey: ['cabinet', 'dossiers', 'selector', clientSelectionne?._id],
    queryFn: () => listerDossiers({ clientId: clientSelectionne!._id, limit: 100 }),
    enabled: ouvert && !!clientSelectionne,
  });

  const clients = dataClients?.data ?? [];
  const dossiers = dataDossiers?.data ?? [];

  // ── Fermer dropdown au clic extérieur ──────────────────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (selectorRef.current && !selectorRef.current.contains(e.target as Node))
        setSelectorOuvert(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Reset dossier quand client change ──────────────────────────────────────
  useEffect(() => {
    if (!modeContextualise) setValue('dossierId', '');
  }, [clientSelectionne, setValue, modeContextualise]);

  // ── Mutation ───────────────────────────────────────────────────────────────
  const { mutate, isPending } = useMutation({
    mutationFn: creerFacture,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cabinet', 'factures'] });
      toast.success('Facture créée en brouillon');
      handleFermer();
    },
    onError: (err: unknown) => toast.error(extraireMessageErreur(err as AxiosError)),
  });

  // ── Handlers ───────────────────────────────────────────────────────────────
  const selectionnerClient = (client: Client) => {
    setClientSelectionne(client);
    setValue('clientId', client._id, { shouldValidate: true });
    setRechercheClient('');
    setSelectorOuvert(false);
  };

  const deselectionnerClient = () => {
    setClientSelectionne(null);
    setValue('clientId', '', { shouldValidate: false });
    requestAnimationFrame(() => inputRechercheRef.current?.focus());
  };

  const handleFermer = () => {
    if (isPending) return;
    reset({
      clientId: clientIdProp ?? '',
      dossierId: dossierIdProp ?? '',
      montant: undefined,
      dateEmission: '',
    });
    setClientSelectionne(null);
    setRechercheClient('');
    setSelectorOuvert(false);
    onFermer();
  };

  const handleKeyDownListe = (e: React.KeyboardEvent, client: Client) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      selectionnerClient(client);
    }
  };

  const listboxId = `${uid}-client-listbox`;
  const inputId = `${uid}-recherche-client`;

  return (
    <Dialog open={ouvert} onOpenChange={handleFermer}>
      <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nouvelle facture</DialogTitle>
          <DialogDescription>
            Créée en <strong>brouillon</strong> — numéro FACT-YYYY-NNN généré automatiquement.
          </DialogDescription>
        </DialogHeader>

        <form
          id={`${uid}-form`}
          onSubmit={handleSubmit(
            (d) =>
              mutate({
                clientId: d.clientId,
                dossierId: d.dossierId,
                montant: d.montant as number,
                dateEmission: d.dateEmission ? new Date(d.dateEmission).toISOString() : undefined,
              }),
            (errs) => console.log('❌ Erreurs Zod :', errs)
          )}
          className="space-y-4 pt-2"
          noValidate
        >
          {/* ✅ Inputs hidden en mode contextualisé */}
          {modeContextualise && (
            <>
              <input type="hidden" {...register('clientId')} />
              <input type="hidden" {...register('dossierId')} />
            </>
          )}

          {/* ── Sélecteur client ───────────────────────────────── */}
          {!modeContextualise && (
            <div className="space-y-1.5">
              <Label htmlFor={inputId}>Client</Label>
              <div ref={selectorRef} className="relative">
                {clientSelectionne ? (
                  <div className="flex items-center justify-between rounded-md border border-input bg-background px-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {nomAffiche(clientSelectionne)}
                      </p>
                      <p className="text-xs text-muted-foreground">{clientSelectionne.telephone}</p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0"
                      onClick={deselectionnerClient}
                      aria-label={`Retirer ${nomAffiche(clientSelectionne)}`}
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
                      ref={inputRechercheRef}
                      id={inputId}
                      role="combobox"
                      aria-expanded={selectorOuvert}
                      aria-controls={selectorOuvert ? listboxId : undefined}
                      aria-autocomplete="list"
                      autoComplete="off"
                      placeholder="Rechercher un client…"
                      className="pl-9"
                      value={rechercheClient}
                      disabled={isPending}
                      onChange={(e) => {
                        setRechercheClient(e.target.value);
                        setSelectorOuvert(true);
                      }}
                      onFocus={() => setSelectorOuvert(true)}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') setSelectorOuvert(false);
                      }}
                    />
                  </div>
                )}

                {selectorOuvert && !clientSelectionne && (
                  <div
                    id={listboxId}
                    role="listbox"
                    aria-label="Résultats clients"
                    className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md"
                  >
                    {chargementClients ? (
                      <div className="space-y-1.5 p-2">
                        {Array.from({ length: 3 }).map((_, i) => (
                          <Skeleton key={i} className="h-10 w-full" />
                        ))}
                      </div>
                    ) : clients.length === 0 ? (
                      <p className="p-4 text-center text-sm text-muted-foreground">
                        {rechercheClient ? 'Aucun client trouvé' : 'Tapez pour rechercher'}
                      </p>
                    ) : (
                      <ul className="max-h-52 overflow-y-auto py-1" role="presentation">
                        {clients.map((client) => (
                          <li
                            key={client._id}
                            role="option"
                            aria-selected={false}
                            tabIndex={0}
                            className="cursor-pointer px-3 py-2 transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              selectionnerClient(client);
                            }}
                            onKeyDown={(e) => handleKeyDownListe(e, client)}
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

              <input type="hidden" aria-hidden="true" {...register('clientId')} />
              {errors.clientId && (
                <p className="text-xs text-destructive" role="alert">
                  {errors.clientId.message}
                </p>
              )}
            </div>
          )}

          {/* ── Sélecteur dossier ───────────────────────────────── */}
          {!modeContextualise && (
            <div className="space-y-1.5">
              <Label htmlFor={`${uid}-dossier`}>Dossier</Label>
              <Controller
                name="dossierId"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={!clientSelectionne || isPending}
                  >
                    <SelectTrigger id={`${uid}-dossier`}>
                      <SelectValue
                        placeholder={
                          !clientSelectionne
                            ? "Sélectionnez d'abord un client"
                            : dossiers.length === 0
                              ? 'Aucun dossier trouvé'
                              : 'Sélectionner un dossier…'
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {dossiers.map((dossier) => (
                        <SelectItem key={dossier._id} value={dossier._id}>
                          <span className="font-mono text-xs">{dossier.reference}</span>
                          {dossier.adversaire && (
                            <span className="ml-2 text-muted-foreground">
                              c/ {dossier.adversaire}
                            </span>
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.dossierId && (
                <p className="text-xs text-destructive" role="alert">
                  {errors.dossierId.message}
                </p>
              )}
            </div>
          )}

          {/* ── Montant ────────────────────────────────────────── */}
          <div className="space-y-1.5">
            <Label htmlFor={`${uid}-montant`}>Montant (DA)</Label>
            <Input
              id={`${uid}-montant`}
              type="number"
              placeholder="150000"
              min="0"
              step="500"
              disabled={isPending}
              {...register('montant')} // ✅ pas de valueAsNumber — géré par preprocess
            />
            {errors.montant && (
              <p className="text-xs text-destructive" role="alert">
                {errors.montant.message}
              </p>
            )}
          </div>

          {/* ── Date d'émission ────────────────────────────────── */}
          <div className="space-y-1.5">
            <Label htmlFor={`${uid}-date`}>
              Date d'émission{' '}
              <span className="text-xs font-normal text-muted-foreground">(optionnel)</span>
            </Label>
            <Input
              id={`${uid}-date`}
              type="date"
              disabled={isPending}
              {...register('dateEmission')}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleFermer} disabled={isPending}>
              Annuler
            </Button>
            <Button type="submit" form={`${uid}-form`} disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
              {isPending ? 'Création…' : 'Créer la facture'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
