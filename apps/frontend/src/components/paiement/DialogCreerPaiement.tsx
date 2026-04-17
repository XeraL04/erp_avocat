import { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useDebounce } from 'use-debounce';
import { Loader2, Search, X, AlertCircle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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

import { creerPaiement } from '@/api/paiement.api';
import { obtenirHonoraire } from '@/api/honoraire.api';
import { listerDossiers } from '@/api/dossier.api';

import {
  schemaCreer,
  type FormCreer,
  CONFIG_STATUT,
  type StatutKey,
  formaterMontant,
  type DossierSelectorItem,
} from './paiement.config';

interface Props {
  onFermer: () => void;
  onSuccess: () => void;
}

export default function DialogCreerPaiement({ onFermer, onSuccess }: Props) {
  const [dossierSelectionne, setDossierSelectionne] = useState<{
    id: string;
    reference: string;
    titre: string;
  } | null>(null);
  const [rechercheDossier, setRechercheDossier] = useState('');
  const [rechercheDebounced] = useDebounce(rechercheDossier, 300);
  const [selectorOuvert, setSelectorOuvert] = useState(false);

  const selectorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (selectorRef.current && !selectorRef.current.contains(e.target as Node)) {
        setSelectorOuvert(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const { data: dossiersData, isLoading: chargementDossiers } = useQuery({
    queryKey: ['dossiers', 'selector', rechercheDebounced],
    queryFn: () => listerDossiers({ q: rechercheDebounced || undefined, limit: 5 }),
    enabled: selectorOuvert,
  });

  const dossiers = (dossiersData?.data ?? []) as unknown as DossierSelectorItem[];

  const { data: reponseHonoraire, isLoading: chargementHonoraire } = useQuery({
    queryKey: ['honoraire', dossierSelectionne?.id],
    queryFn: () => obtenirHonoraire(dossierSelectionne!.id),
    enabled: !!dossierSelectionne,
  });

  const form = useForm<FormCreer>({
    resolver: zodResolver(schemaCreer),
    defaultValues: {
      dossierId: '',
      honoraireId: '',
      montant: undefined,
      mode: 'cash',
      date: new Date().toISOString().slice(0, 10),
      reference: '',
      note: '',
    },
  });

  useEffect(() => {
    const honoraire = reponseHonoraire?.honoraire;
    if (honoraire && form.getValues('honoraireId') !== honoraire._id) {
      form.setValue('honoraireId', honoraire._id);
    }
  }, [reponseHonoraire, form]);

  const { mutate, isPending } = useMutation({
    mutationFn: (v: FormCreer) =>
      creerPaiement({
        dossierId: v.dossierId,
        honoraireId: v.honoraireId,
        montant: v.montant,
        mode: v.mode,
        date: `${v.date}T00:00:00.000Z`,
        reference: v.reference || undefined,
        note: v.note || undefined,
      }),
    onSuccess: () => {
      toast.success('Paiement enregistré');
      onSuccess();
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? "Erreur lors de l'enregistrement");
    },
  });

  const resteAPayer = reponseHonoraire?.resteAPayer;
  const afficherFormulaire = reponseHonoraire && reponseHonoraire.resteAPayer > 0;
  const dossierSolde = reponseHonoraire && reponseHonoraire.resteAPayer === 0;

  return (
    <Dialog open onOpenChange={(o) => !o && onFermer()}>
      <DialogContent className="flex min-h-120 max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
        {/* ── Header fixe ── */}
        <DialogHeader className="shrink-0 border-b px-6 py-4">
          <DialogTitle>Enregistrer un paiement</DialogTitle>
          <DialogDescription>
            Associez le paiement à un dossier — le client est automatiquement déduit.
          </DialogDescription>
        </DialogHeader>

        {/* ── Body scrollable ── */}
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          <Form {...form}>
            <form
              id="form-creer-paiement"
              onSubmit={form.handleSubmit((v) => mutate(v))}
              className="space-y-4"
            >
              {/* Sélecteur de dossier */}
              <FormField
                control={form.control}
                name="dossierId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dossier *</FormLabel>
                    <div className="relative" ref={selectorRef}>
                      {dossierSelectionne ? (
                        <div className="flex items-center justify-between rounded-md border border-input bg-background px-3 py-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">
                              {dossierSelectionne.titre}
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
                            aria-label="Désélectionner le dossier"
                            onClick={() => {
                              setDossierSelectionne(null);
                              field.onChange('');
                              form.setValue('honoraireId', '');
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
                        <div
                          className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md"
                          role="listbox"
                          aria-label="Résultats de recherche de dossiers"
                        >
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
                            <ul className="py-1">
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

              {/* Info honoraire */}
              {dossierSelectionne && (
                <div className="rounded-lg border bg-muted/30 p-3">
                  {chargementHonoraire ? (
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-4 w-48" />
                    </div>
                  ) : !reponseHonoraire ? (
                    <div className="flex items-center gap-2 text-sm text-destructive">
                      <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                      <span>Aucun honoraire défini pour ce dossier. Définissez-en un d'abord.</span>
                    </div>
                  ) : (
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Honoraire total</span>
                        <span className="font-medium tabular-nums">
                          {formaterMontant(reponseHonoraire.honoraire.montantTotal)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Déjà réglé</span>
                        <span className="tabular-nums" style={{ color: 'var(--color-success)' }}>
                          {formaterMontant(reponseHonoraire.totalPaye)}
                        </span>
                      </div>
                      <Separator />
                      <div className="flex items-center justify-between font-semibold">
                        <span>Reste à payer</span>
                        <span
                          className="tabular-nums"
                          style={{
                            color:
                              reponseHonoraire.resteAPayer === 0
                                ? 'var(--color-success)'
                                : 'var(--color-warning)',
                          }}
                        >
                          {formaterMontant(reponseHonoraire.resteAPayer)}
                        </span>
                      </div>

                      {/* Badge statut — nouvelle API CONFIG_STATUT */}
                      {(() => {
                        const cfg =
                          CONFIG_STATUT[reponseHonoraire.statut as StatutKey] ??
                          CONFIG_STATUT['non_paye'];
                        const { Icone } = cfg;
                        return (
                          <div
                            className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium"
                            style={cfg.style}
                          >
                            <Icone className="h-3.5 w-3.5" aria-hidden="true" />
                            {cfg.label}
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              )}

              {/* Formulaire paiement */}
              {afficherFormulaire && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="montant"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Montant (DA) *</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={1}
                              max={resteAPayer}
                              placeholder={`Max : ${resteAPayer ? formaterMontant(resteAPayer) : ''}`}
                              {...field}
                              value={field.value ?? ''}
                              onChange={(e) => field.onChange(e.target.valueAsNumber)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="mode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Mode *</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="cash">💵 Espèces</SelectItem>
                              <SelectItem value="virement">🏦 Virement</SelectItem>
                              <SelectItem value="ccp">📮 CCP</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date *</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="reference"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Référence{' '}
                            <span className="font-normal text-muted-foreground">(opt.)</span>
                          </FormLabel>
                          <FormControl>
                            <Input placeholder="ex : VIR-2026-001" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="note"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Note <span className="font-normal text-muted-foreground">(opt.)</span>
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            className="resize-none"
                            rows={2}
                            placeholder="Détails…"
                            {...field}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </>
              )}

              {/* Banner dossier soldé */}
              {dossierSolde && (
                <div
                  className="flex items-center gap-2 rounded-lg p-3 text-sm"
                  style={{
                    backgroundColor: 'color-mix(in oklch, var(--color-success) 10%, transparent)',
                    color: 'var(--color-success)',
                  }}
                >
                  <CheckCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>Ce dossier est entièrement réglé.</span>
                </div>
              )}
            </form>
          </Form>
        </div>

        {/* ── Footer fixe ── */}
        <div className="shrink-0 border-t px-6 py-4">
          {afficherFormulaire ? (
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={onFermer} disabled={isPending}>
                Annuler
              </Button>
              <Button type="submit" form="form-creer-paiement" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
                {isPending ? 'Enregistrement…' : 'Enregistrer'}
              </Button>
            </div>
          ) : (
            <div className="flex justify-end">
              <Button type="button" variant="outline" onClick={onFermer}>
                Fermer
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
