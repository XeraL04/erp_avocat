import { useState, useRef, useEffect } from 'react';
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

interface Props {
  ouvert: boolean;
  onFermer: () => void;
}

export default function DialogCreerDossier({ ouvert, onFermer }: Props) {
  const queryClient = useQueryClient();

  const [rechercheClient, setRechercheClient] = useState('');
  const [rechercheClientDebounced] = useDebounce(rechercheClient, 300);
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
  } = useForm<FormCreerDossier>({
    resolver: zodResolver(schemaCreerDossier),
    defaultValues: {
      type: 'civil',
      dateOuverture: new Date().toISOString().split('T')[0],
    },
  });

  const { data: clientsData, isLoading: chargementClients } = useQuery({
    queryKey: ['cabinet', 'clients', 'selector', rechercheClientDebounced],
    queryFn: () => listerClients({ q: rechercheClientDebounced || undefined, limit: 10 }),
    enabled: selectorOuvert,
  });

  const clients = clientsData?.data ?? [];

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (selectorRef.current && !selectorRef.current.contains(e.target as Node))
        setSelectorOuvert(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const { mutate, isPending } = useMutation({
    mutationFn: creerDossier,
    onSuccess: (dossier) => {
      queryClient.invalidateQueries({ queryKey: ['cabinet', 'dossiers'] });
      queryClient.invalidateQueries({ queryKey: ['cabinet', 'dashboard'] });
      toast.success(`Dossier ${dossier.reference} créé avec succès`);
      reset({ type: 'civil', dateOuverture: new Date().toISOString().split('T')[0] });
      setClientSelectionne(null);
      setRechercheClient('');
      setSelectorOuvert(false);
      onFermer();
    },
    onError: () => toast.error('Erreur lors de la création du dossier'),
  });

  const handleFermer = () => {
    if (isPending) return;
    reset({ type: 'civil', dateOuverture: new Date().toISOString().split('T')[0] });
    setClientSelectionne(null);
    setRechercheClient('');
    setSelectorOuvert(false);
    onFermer();
  };

  const selectionnerClient = (client: Client) => {
    setClientSelectionne(client);
    setValue('client', client._id, { shouldValidate: true });
    setRechercheClient('');
    setSelectorOuvert(false);
  };

  return (
    <Dialog open={ouvert} onOpenChange={handleFermer}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nouveau dossier</DialogTitle>
          <DialogDescription>
            La référence DOS-{new Date().getFullYear()}-NNN sera générée automatiquement.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit((data) => mutate(data))} className="space-y-4">
          {/* Titre */}
          <div className="space-y-1.5">
            <Label htmlFor="titre">Titre du dossier *</Label>
            <Input
              id="titre"
              placeholder="Ex : Litige commercial Sarl El Baraka"
              {...register('titre')}
            />
            {errors.titre && <p className="text-xs text-destructive">{errors.titre.message}</p>}
          </div>

          {/* Sélecteur client */}
          <div className="space-y-1.5">
            <Label>Client *</Label>
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
                      setValue('client', '', { shouldValidate: false });
                    }}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : (
                <div>
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
              )}
            </div>
            <input type="hidden" {...register('client')} />
            {errors.client && <p className="text-xs text-destructive">{errors.client.message}</p>}
          </div>

          {/* Type */}
          <div className="space-y-1.5">
            <Label>Type d'affaire *</Label>
            <Controller
              name="type"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
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
            {errors.type && <p className="text-xs text-destructive">{errors.type.message}</p>}
          </div>

          {/* Date d'ouverture */}
          <div className="space-y-1.5">
            <Label htmlFor="dateOuverture">Date d'ouverture</Label>
            <Input id="dateOuverture" type="date" {...register('dateOuverture')} />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="description">
              Description <span className="text-muted-foreground">(optionnel)</span>
            </Label>
            <Textarea
              id="description"
              rows={3}
              placeholder="Contexte de l'affaire, faits importants, accord avec le client..."
              {...register('description')}
            />
            {errors.description && (
              <p className="text-xs text-destructive">{errors.description.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleFermer} disabled={isPending}>
              Annuler
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isPending ? 'Création...' : 'Créer le dossier'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
