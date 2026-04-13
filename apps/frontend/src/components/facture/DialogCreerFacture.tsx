import { useState, useRef, useEffect } from 'react';
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

const schema = z.object({
  clientId: z.string({ required_error: 'Le client est obligatoire' }).min(1),
  dossierId: z.string({ required_error: 'Le dossier est obligatoire' }).min(1),
  montant: z
    .number({ invalid_type_error: 'Montant invalide', required_error: 'Montant obligatoire' })
    .positive('Le montant doit être positif'),
  dateEmission: z
    .string()
    .optional()
    .refine((val) => !val || /^\d{4}-\d{2}-\d{2}$/.test(val), { message: 'Date invalide' }),
});

type FormCreerFacture = z.infer<typeof schema>;

interface Props {
  ouvert: boolean;
  onFermer: () => void;
}

export function DialogCreerFacture({ ouvert, onFermer }: Props) {
  const queryClient = useQueryClient();

  // Sélecteur client (même pattern que DialogCreerDossier)
  const [rechercheClient, setRechercheClient] = useState('');
  const [clientSelectionne, setClientSelectionne] = useState<Client | null>(null);
  const [selectorOuvert, setSelectorOuvert] = useState(false);
  const selectorRef = useRef<HTMLDivElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    formState: { errors },
  } = useForm<FormCreerFacture>({ resolver: zodResolver(schema) });

  // Clients — recherche debounced via listerClients
  const { data: dataClients, isLoading: chargementClients } = useQuery({
    queryKey: ['cabinet', 'clients', 'selector', rechercheClient],
    queryFn: () => listerClients({ q: rechercheClient || undefined, limit: 10 }),
    enabled: ouvert && selectorOuvert,
  });

  // Dossiers filtrés par client sélectionné
  const { data: dataDossiers } = useQuery({
    queryKey: ['cabinet', 'dossiers', 'selector', clientSelectionne?._id],
    queryFn: () => listerDossiers({ client: clientSelectionne!._id, limit: 100 }),
    enabled: ouvert && !!clientSelectionne,
  });

  const clients = dataClients?.data ?? [];
  const dossiers = dataDossiers?.data ?? [];

  // Fermer le dropdown client au clic extérieur
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (selectorRef.current && !selectorRef.current.contains(e.target as Node)) {
        setSelectorOuvert(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Reset dossier quand client change
  useEffect(() => {
    setValue('dossierId', '');
  }, [clientSelectionne, setValue]);

  const { mutate, isPending } = useMutation({
    mutationFn: creerFacture,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cabinet', 'factures'] });
      toast.success('Facture créée en brouillon');
      handleFermer();
    },
    onError: (err: unknown) => toast.error(extraireMessageErreur(err as AxiosError)),
  });

  const selectionnerClient = (client: Client) => {
    setClientSelectionne(client);
    setValue('clientId', client._id, { shouldValidate: true });
    setRechercheClient('');
    setSelectorOuvert(false);
  };

  const handleFermer = () => {
    if (isPending) return;
    reset();
    setClientSelectionne(null);
    setRechercheClient('');
    setSelectorOuvert(false);
    onFermer();
  };

  return (
    <Dialog open={ouvert} onOpenChange={handleFermer}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nouvelle facture</DialogTitle>
          <DialogDescription>
            Créée en <strong>brouillon</strong> — numéro FACT-YYYY-NNN généré automatiquement.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit((d) => {
            mutate({
              ...d,
              montant: Number(d.montant),
              dateEmission: d.dateEmission ? new Date(d.dateEmission).toISOString() : undefined,
            });
          })}
        >
          {/* Sélecteur client — même pattern que DialogCreerDossier */}
          <div className="space-y-1.5">
            <Label>Client</Label>
            <div ref={selectorRef} className="relative">
              {clientSelectionne ? (
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
                    onClick={() => {
                      setClientSelectionne(null);
                      setValue('clientId', '', { shouldValidate: false });
                    }}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher un client..."
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
                <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md">
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
                    <ul className="max-h-52 overflow-y-auto py-1">
                      {clients.map((client) => (
                        <li
                          key={client._id}
                          className="cursor-pointer px-3 py-2 transition-colors hover:bg-accent"
                          onMouseDown={(e) => {
                            e.preventDefault();
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
            <input type="hidden" {...register('clientId')} />
            {errors.clientId && (
              <p className="text-xs text-destructive">{errors.clientId.message}</p>
            )}
          </div>

          {/* Sélecteur dossier */}
          <div className="space-y-1.5">
            <Label>Dossier</Label>
            <Controller
              name="dossierId"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={!clientSelectionne}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        !clientSelectionne
                          ? "Sélectionnez d'abord un client"
                          : dossiers.length === 0
                            ? 'Aucun dossier trouvé'
                            : 'Sélectionner un dossier...'
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {dossiers.map((dossier) => (
                      <SelectItem key={dossier._id} value={dossier._id}>
                        <span className="font-mono text-xs">{dossier.reference}</span>
                        <span className="ml-2 text-muted-foreground">{dossier.titre}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.dossierId && (
              <p className="text-xs text-destructive">{errors.dossierId.message}</p>
            )}
          </div>

          {/* Montant */}
          <div className="space-y-1.5">
            <Label htmlFor="montant">Montant (DA)</Label>
            <Input
              id="montant"
              type="number"
              placeholder="150000"
              min="0"
              step="500"
              {...register('montant', { valueAsNumber: true })}
            />
            {errors.montant && <p className="text-xs text-destructive">{errors.montant.message}</p>}
          </div>

          {/* Date d'émission */}
          <div className="space-y-1.5">
            <Label htmlFor="dateEmission">
              Date d'émission{' '}
              <span className="text-xs font-normal text-muted-foreground">(optionnel)</span>
            </Label>
            <Input id="dateEmission" type="date" {...register('dateEmission')} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleFermer} disabled={isPending}>
              Annuler
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isPending ? 'Création...' : 'Créer la facture'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
