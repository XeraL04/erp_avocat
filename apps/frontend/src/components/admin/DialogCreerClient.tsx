import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Loader2, Building2, Users } from 'lucide-react';
import { toast } from 'sonner';
import type { AxiosError } from 'axios';

import {
  Dialog,
  DialogContent,
  // DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

import { creerClient } from '@/api/client.api';
import { extraireMessageErreur } from '@/api/auth.api';

// ─── Helper ───────────────────────────────────────────────────────────────────
function normaliserTel(val?: string): string | undefined {
  if (!val) return undefined;
  const nettoye = val.replace(/[\s\-.]+/g, '').trim();
  return nettoye.length > 0 ? nettoye : undefined;
}

// ─── Schémas ──────────────────────────────────────────────────────────────────
const baseSchema = z.object({
  telephone: z
    .string()
    .min(9, 'Numéro invalide')
    .regex(/^[0-9+\s\-.]+$/, 'Format invalide'),
  telephoneSecondaire: z.string().optional(),
  email: z.string().email('Email invalide').optional().or(z.literal('')),
  adresse: z.string().optional(),
  notes: z.string().optional(),
});

const physiqueSchema = baseSchema.extend({
  type: z.literal('physique'),
  nom: z.string().min(2, 'Nom requis'),
  prenom: z.string().min(2, 'Prénom requis'),
  cin: z
    .string()
    .regex(/^\d{18}$/, 'Le NIN doit contenir exactement 18 chiffres')
    .optional()
    .or(z.literal('')),
});

const moraleSchema = baseSchema.extend({
  type: z.literal('morale'),
  raisonSociale: z.string().min(2, 'Raison sociale requise'),
  representantLegal: z.string().optional(),
  nifRc: z.string().optional(),
});

type FormPhysique = z.infer<typeof physiqueSchema>;
type FormMorale = z.infer<typeof moraleSchema>;

// ─── Sous-composant champ ─────────────────────────────────────────────────────
function Champ({
  id,
  label,
  requis,
  optionnel,
  erreur,
  children,
}: {
  id: string;
  label: string;
  requis?: boolean;
  optionnel?: boolean;
  erreur?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-sm">
        {label}
        {requis && <span className="ml-0.5 text-destructive">*</span>}
        {optionnel && (
          <span className="ml-1.5 text-[11px] font-normal text-muted-foreground">optionnel</span>
        )}
      </Label>
      {children}
      {erreur && (
        <p id={`${id}-error`} className="text-xs text-destructive" role="alert">
          {erreur}
        </p>
      )}
    </div>
  );
}

// ─── Label de section ─────────────────────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70">
      {children}
    </p>
  );
}

// ─── Champs communs contact ───────────────────────────────────────────────────
interface ChampsCommunsProps {
  register: ReturnType<typeof useForm<FormPhysique | FormMorale>>['register'];
  errors: Partial<Record<string, { message?: string }>>;
  isPending: boolean;
}

function ChampsCommuns({ register, errors, isPending }: ChampsCommunsProps) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Champ id="telephone" label="Téléphone" requis erreur={errors.telephone?.message}>
          <Input
            id="telephone"
            placeholder="0550 00 00 00"
            inputMode="tel"
            disabled={isPending}
            aria-invalid={!!errors.telephone}
            aria-describedby={errors.telephone ? 'telephone-error' : undefined}
            {...register('telephone')}
          />
        </Champ>
        <Champ id="telephoneSecondaire" label="Tél. secondaire" optionnel>
          <Input
            id="telephoneSecondaire"
            placeholder="0550 00 00 00"
            inputMode="tel"
            disabled={isPending}
            {...register('telephoneSecondaire')}
          />
        </Champ>
      </div>

      <Champ id="email" label="Email" optionnel erreur={errors.email?.message}>
        <Input
          id="email"
          type="email"
          inputMode="email"
          placeholder="email@exemple.dz"
          disabled={isPending}
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? 'email-error' : undefined}
          {...register('email')}
        />
      </Champ>

      <Champ id="adresse" label="Adresse" optionnel>
        <Input
          id="adresse"
          placeholder="Wilaya, commune…"
          disabled={isPending}
          {...register('adresse')}
        />
      </Champ>

      <Champ id="notes" label="Notes" optionnel>
        <Textarea
          id="notes"
          placeholder="Informations complémentaires…"
          rows={2}
          className="resize-none text-sm"
          disabled={isPending}
          {...register('notes')}
        />
      </Champ>
    </div>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────
interface Props {
  ouvert: boolean;
  onFermer: () => void;
}

export default function DialogCreerClient({ ouvert, onFermer }: Props) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [typeClient, setTypeClient] = useState<'physique' | 'morale'>('physique');

  const physiqueForm = useForm<FormPhysique>({
    resolver: zodResolver(physiqueSchema),
    defaultValues: { type: 'physique' },
  });

  const moraleForm = useForm<FormMorale>({
    resolver: zodResolver(moraleSchema),
    defaultValues: { type: 'morale' },
  });

  // ── Mutation ────────────────────────────────────────────────────────────────
  const { mutate, isPending } = useMutation({
    mutationFn: creerClient,
    onSuccess: (clientCree) => {
      queryClient.invalidateQueries({ queryKey: ['cabinet', 'clients'] });
      queryClient.invalidateQueries({ queryKey: ['cabinet', 'dashboard'] });
      toast.success('Client créé — ouvrez un dossier pour continuer');
      physiqueForm.reset();
      moraleForm.reset();
      onFermer();
      navigate('/cabinet/dossiers', {
        state: { ouvrirCreerDossier: true, clientId: clientCree._id },
      });
    },
    onError: (err: unknown) => {
      toast.error(extraireMessageErreur(err as AxiosError));
    },
  });

  const handleFermer = () => {
    if (!isPending) {
      physiqueForm.reset();
      moraleForm.reset();
      onFermer();
    }
  };

  const onSubmitPhysique = (data: FormPhysique) =>
    mutate({
      ...data,
      telephone: normaliserTel(data.telephone)!,
      telephoneSecondaire: normaliserTel(data.telephoneSecondaire),
    });

  const onSubmitMorale = (data: FormMorale) =>
    mutate({
      ...data,
      telephone: normaliserTel(data.telephone)!,
      telephoneSecondaire: normaliserTel(data.telephoneSecondaire),
    });

  const estMorale = typeClient === 'morale';

  return (
    <Dialog open={ouvert} onOpenChange={handleFermer}>
      <DialogContent className="max-h-[90vh] gap-0 overflow-y-auto p-0 sm:max-w-lg">
        {/* ── Header ───────────────────────────────────────────── */}
        <div className="border-b px-6 pb-4 pt-6">
          <DialogTitle className="text-base font-semibold">Nouveau client</DialogTitle>
          <DialogDescription className="mt-0.5 text-xs">
            Choisissez le type de client puis remplissez les informations.
          </DialogDescription>

          {/* Sélecteur type — boutons segmentés custom */}
          <div className="mt-4 grid grid-cols-2 gap-2">
            {(
              [
                {
                  val: 'physique' as const,
                  label: 'Personne physique',
                  Icone: Users,
                },
                {
                  val: 'morale' as const,
                  label: 'Personne morale',
                  Icone: Building2,
                },
              ] as const
            ).map(({ val, label, Icone }) => {
              const actif = typeClient === val;
              return (
                <button
                  key={val}
                  type="button"
                  onClick={() => setTypeClient(val)}
                  className="flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left text-sm transition-all duration-150"
                  style={
                    actif
                      ? {
                          borderColor: 'var(--primary)',
                          backgroundColor: 'var(--surface-accent)',
                          color: 'var(--primary)',
                        }
                      : {
                          borderColor: 'var(--border)',
                          backgroundColor: 'transparent',
                          color: 'var(--muted-foreground)',
                        }
                  }
                >
                  <div
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors"
                    style={{
                      backgroundColor: actif ? 'var(--primary)' : 'var(--muted)',
                      color: actif ? 'var(--primary-foreground)' : 'var(--muted-foreground)',
                    }}
                  >
                    <Icone className="h-3.5 w-3.5" aria-hidden="true" />
                  </div>
                  <span className="font-medium leading-tight">{label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Formulaire Physique ───────────────────────────────── */}
        {!estMorale && (
          <form
            onSubmit={physiqueForm.handleSubmit(onSubmitPhysique)}
            className="px-6 py-4"
            noValidate
          >
            <SectionLabel>Identité</SectionLabel>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Champ
                  id="prenom"
                  label="Prénom"
                  requis
                  erreur={physiqueForm.formState.errors.prenom?.message}
                >
                  <Input
                    id="prenom"
                    placeholder="Ahmed"
                    disabled={isPending}
                    aria-invalid={!!physiqueForm.formState.errors.prenom}
                    aria-describedby={
                      physiqueForm.formState.errors.prenom ? 'prenom-error' : undefined
                    }
                    {...physiqueForm.register('prenom')}
                  />
                </Champ>
                <Champ
                  id="nom"
                  label="Nom"
                  requis
                  erreur={physiqueForm.formState.errors.nom?.message}
                >
                  <Input
                    id="nom"
                    placeholder="Bensalem"
                    disabled={isPending}
                    aria-invalid={!!physiqueForm.formState.errors.nom}
                    aria-describedby={physiqueForm.formState.errors.nom ? 'nom-error' : undefined}
                    {...physiqueForm.register('nom')}
                  />
                </Champ>
              </div>

              <Champ
                id="cin"
                label="N° identification nationale"
                optionnel
                erreur={physiqueForm.formState.errors.cin?.message}
              >
                <Input
                  id="cin"
                  placeholder="18 chiffres"
                  maxLength={18}
                  inputMode="numeric"
                  disabled={isPending}
                  aria-invalid={!!physiqueForm.formState.errors.cin}
                  aria-describedby={physiqueForm.formState.errors.cin ? 'cin-error' : undefined}
                  {...physiqueForm.register('cin')}
                />
              </Champ>
            </div>

            <SectionLabel>Contact</SectionLabel>
            <ChampsCommuns
              register={physiqueForm.register as ChampsCommunsProps['register']}
              errors={physiqueForm.formState.errors}
              isPending={isPending}
            />

            <DialogFooter className="mt-6 gap-2 border-t pt-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleFermer}
                disabled={isPending}
              >
                Annuler
              </Button>
              <Button type="submit" size="sm" disabled={isPending}>
                {isPending && (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                )}
                {isPending ? 'Création…' : 'Créer le client'}
              </Button>
            </DialogFooter>
          </form>
        )}

        {/* ── Formulaire Morale ─────────────────────────────────── */}
        {estMorale && (
          <form onSubmit={moraleForm.handleSubmit(onSubmitMorale)} className="px-6 py-4" noValidate>
            <SectionLabel>Informations société</SectionLabel>
            <div className="space-y-3">
              <Champ
                id="raisonSociale"
                label="Raison sociale"
                requis
                erreur={moraleForm.formState.errors.raisonSociale?.message}
              >
                <Input
                  id="raisonSociale"
                  placeholder="SARL, EURL, SPA…"
                  disabled={isPending}
                  aria-invalid={!!moraleForm.formState.errors.raisonSociale}
                  aria-describedby={
                    moraleForm.formState.errors.raisonSociale ? 'raisonSociale-error' : undefined
                  }
                  {...moraleForm.register('raisonSociale')}
                />
              </Champ>

              <Champ id="representantLegal" label="Représentant légal" optionnel>
                <Input
                  id="representantLegal"
                  placeholder="Nom du gérant ou PDG"
                  disabled={isPending}
                  {...moraleForm.register('representantLegal')}
                />
              </Champ>

              <Champ id="nifRc" label="NIF / Registre de commerce" optionnel>
                <Input
                  id="nifRc"
                  placeholder="Numéro NIF ou RC"
                  disabled={isPending}
                  {...moraleForm.register('nifRc')}
                />
              </Champ>
            </div>

            <SectionLabel>Contact</SectionLabel>
            <ChampsCommuns
              register={moraleForm.register as ChampsCommunsProps['register']}
              errors={moraleForm.formState.errors}
              isPending={isPending}
            />

            <DialogFooter className="mt-6 gap-2 border-t pt-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleFermer}
                disabled={isPending}
              >
                Annuler
              </Button>
              <Button type="submit" size="sm" disabled={isPending}>
                {isPending && (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                )}
                {isPending ? 'Création…' : 'Créer le client'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
