import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { Resolver } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Building2, X } from 'lucide-react';
import { toast } from 'sonner';
import type { AxiosError } from 'axios';
import { useTranslation } from 'react-i18next';

import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

import { modifierClient } from '@/api/client.api';
import { extraireMessageErreur } from '@/api/auth.api';
import { nomAffiche, initialesAvatar } from '@/lib/utils';
import type { Client } from '@/types';

// ─── Type formulaire ──────────────────────────────────────────────────────────
interface FormModifier {
  telephone: string;
  nom?: string;
  prenom?: string;
  cin?: string;
  raisonSociale?: string;
  representantLegal?: string;
  nifRc?: string;
  telephoneSecondaire?: string;
  email?: string;
  adresse?: string;
  notes?: string;
}

// ─── Schéma Zod ───────────────────────────────────────────────────────────────
const vide = (min?: number) =>
  z.preprocess(
    (v) => (v === '' ? undefined : v),
    min ? z.string().min(min).optional() : z.string().optional()
  );

const schema = z.object({
  nom: vide(2),
  prenom: vide(2),
  cin: vide(),
  raisonSociale: vide(2),
  representantLegal: vide(),
  nifRc: vide(),
  telephone: z
    .string()
    .min(9)
    .regex(/^[0-9+\s]+$/),
  telephoneSecondaire: vide(),
  email: z.preprocess((v) => (v === '' ? undefined : v), z.string().email().optional()),
  adresse: vide(),
  notes: vide(),
});

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
  const { t: tc } = useTranslation('common');
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-sm">
        {label}
        {requis && <span className="ml-0.5 text-destructive">*</span>}
        {optionnel && (
          <span className="ml-1.5 text-[11px] font-normal text-muted-foreground">
            {tc('optional')}
          </span>
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

// ─── Séparateur de section ────────────────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70">
      {children}
    </p>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────
interface Props {
  client: Client;
  onFermer: () => void;
}

export default function DialogModifierClient({ client, onFermer }: Props) {
  const queryClient = useQueryClient();
  const estMorale = client.type === 'morale';
  const nomClient = nomAffiche(client);

  const { t, i18n } = useTranslation('clients');
  const { t: tc } = useTranslation('common');
  const estRTL = i18n.language === 'ar';

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormModifier>({
    resolver: zodResolver(schema) as Resolver<FormModifier>,
    defaultValues: {
      nom: client.nom ?? '',
      prenom: client.prenom ?? '',
      cin: client.cin ?? '',
      raisonSociale: client.raisonSociale ?? '',
      representantLegal: client.representantLegal ?? '',
      nifRc: client.nifRc ?? '',
      telephone: client.telephone,
      telephoneSecondaire: client.telephoneSecondaire ?? '',
      email: client.email ?? '',
      adresse: client.adresse ?? '',
      notes: client.notes ?? '',
    },
  });

  useEffect(() => {
    reset({
      nom: client.nom ?? '',
      prenom: client.prenom ?? '',
      cin: client.cin ?? '',
      raisonSociale: client.raisonSociale ?? '',
      representantLegal: client.representantLegal ?? '',
      nifRc: client.nifRc ?? '',
      telephone: client.telephone,
      telephoneSecondaire: client.telephoneSecondaire ?? '',
      email: client.email ?? '',
      adresse: client.adresse ?? '',
      notes: client.notes ?? '',
    });
  }, [client, reset]);

  const { mutate, isPending } = useMutation({
    mutationFn: (data: FormModifier) => modifierClient(client._id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cabinet', 'clients'] });
      queryClient.invalidateQueries({ queryKey: ['cabinet', 'client', client._id] });
      toast.success(t('client_updated_toast'));
      onFermer();
    },
    onError: (err: unknown) => {
      toast.error(extraireMessageErreur(err as AxiosError));
    },
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onFermer()}>
      <DialogContent
        className="max-h-[90vh] gap-0 overflow-y-auto p-0 sm:max-w-lg"
        dir={estRTL ? 'rtl' : 'ltr'}
        showCloseButton={false}
      >
        {/* X custom — inset-inline-end s'adapte automatiquement RTL/LTR */}
        <button
          onClick={() => !isPending && onFermer()}
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

        {/* ── Header identité ── */}
        <div className="border-b px-6 pb-4 pt-6">
          <div className="flex items-center gap-3">
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-primary-foreground"
              style={{ backgroundColor: 'var(--primary)' }}
              aria-hidden="true"
            >
              {estMorale ? <Building2 className="h-5 w-5" /> : initialesAvatar(nomClient)}
            </div>

            <div className="min-w-0 flex-1">
              <DialogTitle className="text-base font-semibold leading-tight">
                {nomClient}
              </DialogTitle>
              <div className="mt-1 flex items-center gap-2">
                <DialogDescription className="text-xs">{t('edit_subtitle')}</DialogDescription>
                <span
                  className="rounded-full px-2 py-0.5 text-[11px] font-medium"
                  style={{
                    color: estMorale ? 'var(--plan-pro)' : 'var(--status-essai)',
                    backgroundColor: estMorale ? 'var(--plan-pro-bg)' : 'var(--status-essai-bg)',
                  }}
                >
                  {estMorale ? t('legal_person') : t('natural_person')}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Formulaire ── */}
        <form
          onSubmit={handleSubmit((data) => mutate(data))}
          className="space-y-0 px-6 py-4"
          noValidate
        >
          <SectionLabel>{estMorale ? t('section_company') : t('section_identity')}</SectionLabel>

          <div className="space-y-3">
            {!estMorale ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <Champ
                    id="mod-prenom"
                    label={t('form_firstname')}
                    erreur={errors.prenom?.message}
                  >
                    <Input
                      id="mod-prenom"
                      disabled={isPending}
                      aria-invalid={!!errors.prenom}
                      aria-describedby={errors.prenom ? 'mod-prenom-error' : undefined}
                      {...register('prenom')}
                    />
                  </Champ>
                  <Champ id="mod-nom" label={t('form_lastname')} erreur={errors.nom?.message}>
                    <Input
                      id="mod-nom"
                      disabled={isPending}
                      aria-invalid={!!errors.nom}
                      aria-describedby={errors.nom ? 'mod-nom-error' : undefined}
                      {...register('nom')}
                    />
                  </Champ>
                </div>
                <Champ id="mod-cin" label={t('form_nin')} optionnel>
                  <Input
                    id="mod-cin"
                    maxLength={18}
                    inputMode="numeric"
                    disabled={isPending}
                    {...register('cin')}
                  />
                </Champ>
              </>
            ) : (
              <>
                <Champ
                  id="mod-rs"
                  label={t('form_raison_sociale')}
                  erreur={errors.raisonSociale?.message}
                >
                  <Input
                    id="mod-rs"
                    disabled={isPending}
                    aria-invalid={!!errors.raisonSociale}
                    aria-describedby={errors.raisonSociale ? 'mod-rs-error' : undefined}
                    {...register('raisonSociale')}
                  />
                </Champ>
                <Champ id="mod-rep" label={t('form_legal_rep')} optionnel>
                  <Input id="mod-rep" disabled={isPending} {...register('representantLegal')} />
                </Champ>
                <Champ id="mod-nif" label={t('form_nif_rc')} optionnel>
                  <Input id="mod-nif" disabled={isPending} {...register('nifRc')} />
                </Champ>
              </>
            )}
          </div>

          <SectionLabel>{t('section_contact')}</SectionLabel>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Champ id="mod-tel" label={t('form_phone')} requis erreur={errors.telephone?.message}>
                <Input
                  id="mod-tel"
                  inputMode="tel"
                  disabled={isPending}
                  aria-invalid={!!errors.telephone}
                  aria-describedby={errors.telephone ? 'mod-tel-error' : undefined}
                  {...register('telephone')}
                />
              </Champ>
              <Champ id="mod-tel2" label={t('form_phone2')} optionnel>
                <Input
                  id="mod-tel2"
                  inputMode="tel"
                  disabled={isPending}
                  {...register('telephoneSecondaire')}
                />
              </Champ>
            </div>

            <Champ id="mod-email" label={t('form_email')} optionnel erreur={errors.email?.message}>
              <Input
                id="mod-email"
                type="email"
                inputMode="email"
                disabled={isPending}
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? 'mod-email-error' : undefined}
                {...register('email')}
              />
            </Champ>

            <Champ id="mod-adresse" label={t('form_address')} optionnel>
              <Input id="mod-adresse" disabled={isPending} {...register('adresse')} />
            </Champ>
          </div>

          <SectionLabel>{t('section_notes')}</SectionLabel>

          <Textarea
            id="mod-notes"
            rows={3}
            placeholder={t('form_notes_placeholder')}
            className="resize-none text-sm"
            disabled={isPending}
            {...register('notes')}
          />

          <DialogFooter className="mt-6 gap-2 border-t pt-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onFermer}
              disabled={isPending}
            >
              {tc('cancel')}
            </Button>
            <Button type="submit" size="sm" disabled={isPending}>
              {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
              {isPending ? tc('saving') : tc('save_changes')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
