import { useEffect, useId } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, AlertCircle, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import type { AxiosError } from 'axios';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { modifierFacture, type Facture, type StatutFacture } from '@/api/facture.api';
import { couleurStatutFacture, libelleStatutFacture, formaterMontantDA } from '@/lib/utils';
import { extraireMessageErreur } from '@/api/auth.api';

// ─── Transitions autorisées ───────────────────────────────────────────────────
const TRANSITIONS: Record<StatutFacture, StatutFacture[]> = {
  brouillon: ['emise'],
  emise: ['payee'],
  payee: [],
};

// ─── Schéma ───────────────────────────────────────────────────────────────────
const schema = z
  .object({
    montant: z.number().positive().optional(),
    statut: z.enum(['brouillon', 'emise', 'payee']).optional(),
  })
  .refine((d) => d.montant !== undefined || d.statut !== undefined);

type FormModifier = z.infer<typeof schema>;

// ─── Props ────────────────────────────────────────────────────────────────────
interface Props {
  facture: Facture;
  onFermer: () => void;
}

// ─── Composant ────────────────────────────────────────────────────────────────
export function DialogModifierFacture({ facture, onFermer }: Props) {
  const queryClient = useQueryClient();
  const uid = useId();

  const { t } = useTranslation('factures');
  const { t: tc } = useTranslation('common');

  const prochainsStatuts = TRANSITIONS[facture.statut];
  const peutModifierMontant = facture.statut === 'brouillon';
  const estRegle = facture.statut === 'payee';

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<FormModifier>({ resolver: zodResolver(schema) });

  useEffect(() => {
    reset({ montant: facture.montant, statut: undefined });
  }, [facture, reset]);

  const { mutate, isPending } = useMutation({
    mutationFn: (d: FormModifier) =>
      modifierFacture(facture.id, {
        montant: peutModifierMontant ? d.montant : undefined,
        statut: d.statut,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cabinet', 'factures'] });
      toast.success(t('facture_mise_a_jour'));
      onFermer();
    },
    onError: (err: unknown) => toast.error(extraireMessageErreur(err as AxiosError)),
  });

  // ── Rendu ──────────────────────────────────────────────────────────────────
  return (
    <Dialog open onOpenChange={(o) => !o && !isPending && onFermer()}>
      <DialogContent className="flex flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
        {/* ── Header ──────────────────────────────────────────── */}
        <DialogHeader className="shrink-0 border-b px-6 py-4">
          <div className="flex items-center gap-2.5">
            <DialogTitle className="text-base">{t('modifier_facture')}</DialogTitle>
            <Badge variant={couleurStatutFacture(facture.statut)}>
              {libelleStatutFacture(facture.statut)}
            </Badge>
          </div>
          <DialogDescription className="font-mono text-xs text-muted-foreground">
            {facture.numero}
          </DialogDescription>
        </DialogHeader>

        {/* ── Body ────────────────────────────────────────────── */}
        <form
          id={`${uid}-form`}
          onSubmit={handleSubmit((d) => mutate(d))}
          noValidate
          className="px-6 py-5"
        >
          <div className="space-y-4">
            {/* ── Montant ───────────────────────────────────────── */}
            <div className="space-y-1.5">
              <Label htmlFor={`${uid}-montant`} className="text-xs font-medium">
                {t('montant_label')}
                {!peutModifierMontant && (
                  <span className="ml-1.5 font-normal text-muted-foreground/70">
                    ({t('non_modifiable')} — {libelleStatutFacture(facture.statut).toLowerCase()})
                  </span>
                )}
              </Label>
              <Input
                id={`${uid}-montant`}
                type="number"
                min="0"
                step="500"
                className="h-9 w-full text-sm"
                disabled={!peutModifierMontant || isPending}
                {...register('montant', { valueAsNumber: true })}
              />
              {!peutModifierMontant && (
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <AlertCircle className="h-3 w-3 shrink-0" aria-hidden="true" />
                  {t('montant_actuel', { montant: formaterMontantDA(facture.montant) })}
                </p>
              )}
              {errors.montant && (
                <p className="text-xs text-destructive" role="alert">
                  {tc('montant_positif')}
                </p>
              )}
            </div>

            {/* ── Changement de statut ──────────────────────────── */}
            {prochainsStatuts.length > 0 && (
              <div className="space-y-1.5">
                <div className="border-t border-dashed border-border/60" />
                <Label htmlFor={`${uid}-statut`} className="text-xs font-medium">
                  {t('changer_statut')}
                </Label>
                <Controller
                  name="statut"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange} disabled={isPending}>
                      <SelectTrigger id={`${uid}-statut`} className="h-9 w-full text-sm">
                        <SelectValue placeholder={t('conserver_statut_actuel')} />
                      </SelectTrigger>
                      <SelectContent>
                        {prochainsStatuts.map((s) => (
                          <SelectItem key={s} value={s}>
                            {libelleStatutFacture(s)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {/* Transition visuelle : statut actuel → prochain(s) */}
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <span>{libelleStatutFacture(facture.statut)}</span>
                  <ArrowRight className="h-3 w-3 shrink-0" aria-hidden="true" />
                  <span>{prochainsStatuts.map(libelleStatutFacture).join(` ${tc('ou')} `)}</span>
                </p>
              </div>
            )}

            {/* ── Facture réglée ────────────────────────────────── */}
            {estRegle && (
              <p className="rounded-md bg-muted px-3 py-2.5 text-xs text-muted-foreground">
                {t('facture_reglee_info')}
              </p>
            )}
          </div>

          {/* ── Footer ────────────────────────────────────────────── */}
          <div className="mt-5 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onFermer}
              disabled={isPending}
            >
              {tc('annuler')}
            </Button>
            <Button type="submit" size="sm" form={`${uid}-form`} disabled={isPending || estRegle}>
              {isPending && (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              )}
              {isPending ? tc('enregistrement_en_cours') : tc('enregistrer')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// import { useEffect, useId } from 'react';
// import { useForm, Controller } from 'react-hook-form';
// import { zodResolver } from '@hookform/resolvers/zod';
// import { z } from 'zod';
// import { useMutation, useQueryClient } from '@tanstack/react-query';
// import { Loader2, AlertCircle, ArrowRight } from 'lucide-react';
// import { toast } from 'sonner';
// import type { AxiosError } from 'axios';

// import {
//   Dialog,
//   DialogContent,
//   DialogHeader,
//   DialogTitle,
//   DialogDescription,
// } from '@/components/ui/dialog';
// import { Button } from '@/components/ui/button';
// import { Input } from '@/components/ui/input';
// import { Label } from '@/components/ui/label';
// import { Badge } from '@/components/ui/badge';
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from '@/components/ui/select';

// import { modifierFacture, type Facture, type StatutFacture } from '@/api/facture.api';
// import { couleurStatutFacture, libelleStatutFacture, formaterMontantDA } from '@/lib/utils';
// import { extraireMessageErreur } from '@/api/auth.api';

// // ─── Transitions autorisées ───────────────────────────────────────────────────
// const TRANSITIONS: Record<StatutFacture, StatutFacture[]> = {
//   brouillon: ['emise'],
//   emise: ['payee'],
//   payee: [],
// };

// // ─── Schéma ───────────────────────────────────────────────────────────────────
// const schema = z
//   .object({
//     montant: z
//       .number({ invalid_type_error: 'Montant invalide' })
//       .positive('Le montant doit être positif')
//       .optional(),
//     statut: z.enum(['brouillon', 'emise', 'payee']).optional(),
//   })
//   .refine((d) => d.montant !== undefined || d.statut !== undefined, {
//     message: 'Modifiez au moins un champ',
//   });

// type FormModifier = z.infer<typeof schema>;

// // ─── Props ────────────────────────────────────────────────────────────────────
// interface Props {
//   facture: Facture;
//   onFermer: () => void;
// }

// // ─── Composant ────────────────────────────────────────────────────────────────
// export function DialogModifierFacture({ facture, onFermer }: Props) {
//   const queryClient = useQueryClient();
//   const uid = useId();
//   const prochainsStatuts = TRANSITIONS[facture.statut];
//   const peutModifierMontant = facture.statut === 'brouillon';
//   const estRegle = facture.statut === 'payee';

//   const {
//     register,
//     handleSubmit,
//     reset,
//     control,
//     formState: { errors },
//   } = useForm<FormModifier>({ resolver: zodResolver(schema) });

//   useEffect(() => {
//     reset({ montant: facture.montant, statut: undefined });
//   }, [facture, reset]);

//   const { mutate, isPending } = useMutation({
//     mutationFn: (d: FormModifier) =>
//       modifierFacture(facture.id, {
//         montant: peutModifierMontant ? d.montant : undefined,
//         statut: d.statut,
//       }),
//     onSuccess: () => {
//       queryClient.invalidateQueries({ queryKey: ['cabinet', 'factures'] });
//       toast.success('Facture mise à jour');
//       onFermer();
//     },
//     onError: (err: unknown) => toast.error(extraireMessageErreur(err as AxiosError)),
//   });

//   return (
//     <Dialog open onOpenChange={(o) => !o && !isPending && onFermer()}>
//       <DialogContent className="flex flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
//         {/* ── Header ──────────────────────────────────────────── */}
//         <DialogHeader className="shrink-0 border-b px-6 py-4">
//           <div className="flex items-center gap-2.5">
//             <DialogTitle className="text-base">Modifier la facture</DialogTitle>
//             <Badge variant={couleurStatutFacture(facture.statut)}>
//               {libelleStatutFacture(facture.statut)}
//             </Badge>
//           </div>
//           <DialogDescription className="font-mono text-xs text-muted-foreground">
//             {facture.numero}
//           </DialogDescription>
//         </DialogHeader>

//         {/* ── Body ────────────────────────────────────────────── */}
//         <form
//           id={`${uid}-form`}
//           onSubmit={handleSubmit((d) => mutate(d))}
//           noValidate
//           className="px-6 py-5"
//         >
//           <div className="space-y-4">
//             {/* ── Montant ─────────────────────────────────────── */}
//             <div className="space-y-1.5">
//               <Label htmlFor={`${uid}-montant`} className="text-xs font-medium">
//                 Montant (DA)
//                 {!peutModifierMontant && (
//                   <span className="ml-1.5 font-normal text-muted-foreground/70">
//                     (non modifiable — {libelleStatutFacture(facture.statut).toLowerCase()})
//                   </span>
//                 )}
//               </Label>
//               <Input
//                 id={`${uid}-montant`}
//                 type="number"
//                 min="0"
//                 step="500"
//                 className="h-9 w-full text-sm"
//                 disabled={!peutModifierMontant || isPending}
//                 {...register('montant', { valueAsNumber: true })}
//               />
//               {!peutModifierMontant && (
//                 <p className="flex items-center gap-1 text-xs text-muted-foreground">
//                   <AlertCircle className="h-3 w-3 shrink-0" aria-hidden="true" />
//                   Montant actuel : {formaterMontantDA(facture.montant)}
//                 </p>
//               )}
//               {errors.montant && (
//                 <p className="text-xs text-destructive" role="alert">
//                   {errors.montant.message}
//                 </p>
//               )}
//             </div>

//             {/* ── Changement de statut ─────────────────────────── */}
//             {prochainsStatuts.length > 0 && (
//               <div className="space-y-1.5">
//                 <div className="border-t border-dashed border-border/60" />
//                 <Label htmlFor={`${uid}-statut`} className="text-xs font-medium">
//                   Changer le statut
//                 </Label>
//                 <Controller
//                   name="statut"
//                   control={control}
//                   render={({ field }) => (
//                     <Select value={field.value} onValueChange={field.onChange} disabled={isPending}>
//                       <SelectTrigger id={`${uid}-statut`} className="h-9 w-full text-sm">
//                         <SelectValue placeholder="Conserver le statut actuel" />
//                       </SelectTrigger>
//                       <SelectContent>
//                         {prochainsStatuts.map((s) => (
//                           <SelectItem key={s} value={s}>
//                             {libelleStatutFacture(s)}
//                           </SelectItem>
//                         ))}
//                       </SelectContent>
//                     </Select>
//                   )}
//                 />
//                 <p className="flex items-center gap-1 text-xs text-muted-foreground">
//                   <span>{libelleStatutFacture(facture.statut)}</span>
//                   <ArrowRight className="h-3 w-3 shrink-0" aria-hidden="true" />
//                   <span>{prochainsStatuts.map(libelleStatutFacture).join(' ou ')}</span>
//                 </p>
//               </div>
//             )}

//             {/* ── Facture réglée ───────────────────────────────── */}
//             {estRegle && (
//               <p className="rounded-md bg-muted px-3 py-2.5 text-xs text-muted-foreground">
//                 Cette facture est entièrement réglée. Aucune modification possible.
//               </p>
//             )}
//           </div>

//           {/* ── Footer ──────────────────────────────────────────── */}
//           <div className="mt-5 flex justify-end gap-2">
//             <Button
//               type="button"
//               variant="outline"
//               size="sm"
//               onClick={onFermer}
//               disabled={isPending}
//             >
//               Annuler
//             </Button>
//             <Button type="submit" size="sm" form={`${uid}-form`} disabled={isPending || estRegle}>
//               {isPending && (
//                 <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden="true" />
//               )}
//               {isPending ? 'Enregistrement…' : 'Enregistrer'}
//             </Button>
//           </div>
//         </form>
//       </DialogContent>
//     </Dialog>
//   );
// }
