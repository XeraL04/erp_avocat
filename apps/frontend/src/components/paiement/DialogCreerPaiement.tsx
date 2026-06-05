import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useDebounce } from 'use-debounce';
import { Loader2, Search, X, AlertCircle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
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
  creerSchemaPaiement,
  getConfigStatut,
  type FormCreer,
  type StatutKey,
  formaterMontant,
  type DossierSelectorItem,
} from './paiement.config';

interface Props {
  onFermer: () => void;
  onSuccess: () => void;
}

export default function DialogCreerPaiement({ onFermer, onSuccess }: Props) {
  const { t, i18n } = useTranslation('paiements');
  const { t: tc } = useTranslation('common');

  const schemaCreer = useMemo(() => creerSchemaPaiement(t), [t]);
  const CONFIG_STATUT = useMemo(() => getConfigStatut(t), [t]);
  const locale = i18n.language === 'ar' ? 'ar-DZ' : 'fr-DZ';

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
    const handler = (e: MouseEvent) => {
      if (selectorRef.current && !selectorRef.current.contains(e.target as Node)) {
        setSelectorOuvert(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
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
      toast.success(t('paiement_enregistre'));
      onSuccess();
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? t('erreur_enregistrement'));
    },
  });

  const resteAPayer = reponseHonoraire?.resteAPayer;
  const afficherFormulaire = reponseHonoraire && reponseHonoraire.resteAPayer > 0;
  const dossierSolde = reponseHonoraire && reponseHonoraire.resteAPayer === 0;

  const Opt = () => <span className="font-normal text-muted-foreground/70">({tc('opt')})</span>;

  return (
    <Dialog open onOpenChange={(o) => !o && onFermer()}>
      <DialogContent
        className="flex max-h-[90vh] min-h-96 flex-col gap-0 overflow-hidden p-0 sm:max-w-lg"
        dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}
        showCloseButton={false}
      >
        <button
          onClick={onFermer}
          disabled={isPending}
          aria-label={tc('close')}
          className="absolute z-10 rounded-sm opacity-70 ring-offset-background
      transition-opacity hover:opacity-100 focus:outline-none focus:ring-2
      focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
          style={{
            insetInlineEnd: '1rem',
            insetBlockStart: '1rem',
          }}
        >
          <X className="h-4 w-4" />
          <span className="sr-only">{tc('close')}</span>
        </button>

        <DialogHeader className="shrink-0 border-b px-6 py-4">
          <DialogTitle className="text-base">{t('enregistrer_paiement')}</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {t('description')}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          <Form {...form}>
            <form
              id="form-creer-paiement"
              onSubmit={form.handleSubmit((v) => mutate(v))}
              className="space-y-4"
            >
              <FormField
                control={form.control}
                name="dossierId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium">
                      {tc('dossier')} <span className="text-destructive">*</span>
                    </FormLabel>
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
                            aria-label={tc('deselectionner_dossier')}
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
                            placeholder={t('rechercher_dossier')}
                            className="h-9 pl-9 text-sm"
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
                          aria-label={t('resultats_dossiers')}
                        >
                          {chargementDossiers ? (
                            <div className="space-y-1.5 p-2">
                              {[...Array(3)].map((_, i) => (
                                <Skeleton key={i} className="h-10 w-full" />
                              ))}
                            </div>
                          ) : dossiers.length === 0 ? (
                            <p className="p-4 text-center text-sm text-muted-foreground">
                              {rechercheDossier
                                ? tc('aucun_dossier_trouve')
                                : tc('taper_pour_rechercher')}
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
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              {dossierSelectionne && (
                <div className="rounded-lg border bg-muted/30 p-3">
                  {chargementHonoraire ? (
                    <div className="space-y-2">
                      <Skeleton className="h-3.5 w-32" />
                      <Skeleton className="h-3.5 w-48" />
                    </div>
                  ) : !reponseHonoraire ? (
                    <div className="flex items-center gap-2 text-xs text-destructive">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      <span>{t('aucun_honoraire')}</span>
                    </div>
                  ) : (
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">{t('honoraire_total')}</span>
                        <span className="font-medium tabular-nums">
                          {formaterMontant(reponseHonoraire.honoraire.montantTotal, locale)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">{t('deja_regle')}</span>
                        <span className="tabular-nums" style={{ color: 'var(--color-success)' }}>
                          {formaterMontant(reponseHonoraire.totalPaye, locale)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between border-t border-dashed border-border/60 pt-2 font-semibold">
                        <span>{t('reste_a_payer')}</span>
                        <span
                          className="tabular-nums"
                          style={{
                            color:
                              reponseHonoraire.resteAPayer === 0
                                ? 'var(--color-success)'
                                : 'var(--color-warning)',
                          }}
                        >
                          {formaterMontant(reponseHonoraire.resteAPayer, locale)}
                        </span>
                      </div>

                      {(() => {
                        const cfg =
                          CONFIG_STATUT[reponseHonoraire.statut as StatutKey] ??
                          CONFIG_STATUT.non_paye;
                        const { Icone } = cfg;
                        return (
                          <div
                            className="mt-1 inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium"
                            style={cfg.style}
                          >
                            <Icone className="h-3 w-3" aria-hidden="true" />
                            {cfg.label}
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              )}

              {afficherFormulaire && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="montant"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-medium">
                            {t('montant_label')} <span className="text-destructive">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={1}
                              max={resteAPayer}
                              className="h-9 text-sm"
                              placeholder={
                                resteAPayer
                                  ? t('montant_max', {
                                      max: formaterMontant(resteAPayer, locale),
                                    })
                                  : ''
                              }
                              {...field}
                              value={field.value ?? ''}
                              onChange={(e) => field.onChange(e.target.valueAsNumber)}
                            />
                          </FormControl>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="mode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-medium">
                            {t('mode_label')} <span className="text-destructive">*</span>
                          </FormLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger className="h-9 w-full text-sm">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="cash">{t('mode_cash')}</SelectItem>
                              <SelectItem value="virement">{t('mode_virement')}</SelectItem>
                              <SelectItem value="ccp">{t('mode_ccp')}</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage className="text-xs" />
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
                          <FormLabel className="text-xs font-medium">
                            {tc('date')} <span className="text-destructive">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input type="date" className="h-9 text-sm" {...field} />
                          </FormControl>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="reference"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-medium">
                            {t('reference_label')} <Opt />
                          </FormLabel>
                          <FormControl>
                            <Input
                              className="h-9 text-sm"
                              placeholder={t('reference_placeholder')}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="note"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-medium">
                          {tc('note')} <Opt />
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            className="resize-none text-sm"
                            rows={2}
                            placeholder={t('note_placeholder')}
                            {...field}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </>
              )}

              {dossierSolde && (
                <div
                  className="flex items-center gap-2 rounded-lg p-3 text-xs font-medium"
                  style={{
                    backgroundColor: 'color-mix(in oklch, var(--color-success) 10%, transparent)',
                    color: 'var(--color-success)',
                  }}
                >
                  <CheckCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span>{t('dossier_solde')}</span>
                </div>
              )}
            </form>
          </Form>
        </div>

        <div className="shrink-0 border-t px-6 py-4">
          {afficherFormulaire ? (
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onFermer}
                disabled={isPending}
              >
                {tc('annuler')}
              </Button>
              <Button type="submit" size="sm" form="form-creer-paiement" disabled={isPending}>
                {isPending && (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                )}
                {isPending ? tc('enregistrement_en_cours') : tc('enregistrer')}
              </Button>
            </div>
          ) : (
            <div className="flex justify-end">
              <Button type="button" variant="outline" size="sm" onClick={onFermer}>
                {tc('fermer')}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
