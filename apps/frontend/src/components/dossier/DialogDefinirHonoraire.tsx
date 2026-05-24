import { useEffect, useId } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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

import type { Honoraire } from '@/types';
import { definirHonoraire, modifierHonoraire } from '@/api/honoraire.api';

// ─── Schéma ───────────────────────────────────────────────────────────────────
const schema = z.object({
  type: z.enum(['forfait', 'echelonne']),
  montantTotal: z.coerce.number().min(1),
  description: z.string().max(500).optional(),
});

type FormHonoraire = z.infer<typeof schema>;

// ─── Props ────────────────────────────────────────────────────────────────────
interface Props {
  dossierId: string;
  honoraire?: Honoraire | null;
  onFermer: () => void;
}

// ─── Composant ────────────────────────────────────────────────────────────────
export default function DialogDefinirHonoraire({ dossierId, honoraire, onFermer }: Props) {
  const queryClient = useQueryClient();
  const uid = useId();
  const estModif = !!honoraire;

  const { t, i18n } = useTranslation('honoraires');
  const { t: tc } = useTranslation('common');
  const estRTL = i18n.language === 'ar';

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<FormHonoraire>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: honoraire?.type ?? 'forfait',
      montantTotal: honoraire?.montantTotal ?? undefined,
      description: honoraire?.description ?? '',
    },
  });

  useEffect(() => {
    if (honoraire) {
      reset({
        type: honoraire.type,
        montantTotal: honoraire.montantTotal,
        description: honoraire.description ?? '',
      });
    }
  }, [honoraire, reset]);

  const { mutate, isPending } = useMutation({
    mutationFn: (donnees: FormHonoraire) =>
      estModif ? modifierHonoraire(dossierId, donnees) : definirHonoraire(dossierId, donnees),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cabinet', 'honoraire', dossierId] });
      queryClient.invalidateQueries({ queryKey: ['cabinet', 'paiements', dossierId] });
      toast.success(estModif ? t('honoraire_updated_toast') : t('honoraire_defined_toast'));
      onFermer();
    },
    onError: () => toast.error(tc('error')),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && !isPending && onFermer()}>
      <DialogContent
        className="flex flex-col gap-0 overflow-hidden p-0 sm:max-w-md"
        dir={estRTL ? 'rtl' : 'ltr'}
        showCloseButton={false}
      >
        {/* X custom — inset-inline-end s'adapte RTL/LTR automatiquement */}
        <button
          onClick={() => !isPending && onFermer()}
          disabled={isPending}
          aria-label={tc('close')}
          className="absolute z-10 rounded-sm opacity-70 ring-offset-background
            transition-opacity hover:opacity-100 focus:outline-none focus:ring-2
            focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
          style={{ insetInlineEnd: '1rem', insetBlockStart: '1rem' }}
        >
          <X className="h-4 w-4" />
          <span className="sr-only">{tc('close')}</span>
        </button>

        {/* ── Header ── */}
        <DialogHeader className="shrink-0 border-b px-6 py-4">
          <DialogTitle className="text-base">
            {estModif ? t('edit_honoraire_title') : t('define_honoraire_title')}
          </DialogTitle>
        </DialogHeader>

        {/* ── Body ── */}
        <form onSubmit={handleSubmit((d) => mutate(d))} noValidate className="px-6 py-5">
          <div className="space-y-4">
            {/* Type + Montant */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {/* Type d'honoraire */}
              <div className="space-y-1.5">
                <Label htmlFor={`${uid}-type`} className="text-xs font-medium">
                  {t('form_type')} <span className="text-destructive">*</span>
                </Label>
                <Controller
                  name="type"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange} disabled={isPending}>
                      <SelectTrigger id={`${uid}-type`} className="h-9 w-full text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="forfait">{t('type_forfait')}</SelectItem>
                        <SelectItem value="echelonne">{t('type_echelonne')}</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              {/* Montant total */}
              <div className="space-y-1.5">
                <Label htmlFor={`${uid}-montant`} className="text-xs font-medium">
                  {t('form_amount')} <span className="text-destructive">*</span>
                </Label>
                <Input
                  id={`${uid}-montant`}
                  type="number"
                  min="1"
                  placeholder={t('form_amount_placeholder')}
                  disabled={isPending}
                  className="h-9 w-full text-sm"
                  aria-invalid={!!errors.montantTotal}
                  aria-describedby={errors.montantTotal ? `${uid}-montant-error` : undefined}
                  onWheel={(e) => (e.target as HTMLInputElement).blur()}
                  {...register('montantTotal')}
                />
                {errors.montantTotal && (
                  <p id={`${uid}-montant-error`} className="text-xs text-destructive" role="alert">
                    {t('form_amount_required')}
                  </p>
                )}
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor={`${uid}-desc`} className="text-xs font-medium">
                {tc('description')}{' '}
                <span className="font-normal text-muted-foreground/70">
                  ({tc('optional_short')})
                </span>
              </Label>
              <Textarea
                id={`${uid}-desc`}
                rows={2}
                placeholder={t('form_description_placeholder')}
                className="w-full resize-none text-sm"
                disabled={isPending}
                {...register('description')}
              />
            </div>
          </div>

          {/* ── Footer ── */}
          <div className="mt-5 flex justify-end gap-2">
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
              {isPending ? tc('saving') : estModif ? t('update_button') : t('define_button')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
