import { useMemo } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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

import { modifierPaiement, nomClient, type PaiementPopule } from '@/api/paiement.api';
import { modifierSchemaPaiement, type FormModifier, formaterMontant } from './paiement.config';

interface Props {
  paiement: PaiementPopule;
  onFermer: () => void;
  onSuccess: () => void;
}

export default function DialogModifierPaiement({ paiement, onFermer, onSuccess }: Props) {
  const { t, i18n } = useTranslation('paiements');
  const { t: tc } = useTranslation('common');

  const schemaModifier = useMemo(() => modifierSchemaPaiement(t), [t]);
  const locale = i18n.language === 'ar' ? 'ar-DZ' : 'fr-DZ';

  const form = useForm<FormModifier>({
    resolver: zodResolver(schemaModifier),
    defaultValues: {
      montant: paiement.montant,
      mode: paiement.mode,
      date: paiement.date.slice(0, 10),
      reference: paiement.reference ?? '',
      note: paiement.note ?? '',
    },
  });

  const { isDirty } = form.formState;

  const { mutate, isPending } = useMutation({
    mutationFn: (v: FormModifier) =>
      modifierPaiement(paiement._id, {
        montant: v.montant,
        mode: v.mode,
        date: `${v.date}T00:00:00.000Z`,
        reference: v.reference || undefined,
        note: v.note || undefined,
      }),
    onSuccess: () => {
      toast.success(t('paiement_modifie'));
      onSuccess();
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? t('erreur_modification'));
    },
  });

  const Opt = () => <span className="font-normal text-muted-foreground/70">({tc('opt')})</span>;

  return (
    <Dialog open onOpenChange={(o) => !o && onFermer()}>
      <DialogContent
        className="gap-0 p-0 sm:max-w-md"
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

        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle className="text-base">{t('modifier_paiement')}</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {formaterMontant(paiement.montant, locale)}
            {paiement.dossier && (
              <>
                {' · '}
                <span className="font-mono">{paiement.dossier.reference}</span>
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 py-5">
          {paiement.dossier && (
            <div className="mb-4 rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
              <span className="font-mono">{paiement.dossier.reference}</span>
              {' · '}
              {paiement.dossier.titre}
              {paiement.dossier.client && (
                <span className="ml-2 font-medium text-foreground">
                  — {nomClient(paiement.dossier.client)}
                </span>
              )}
            </div>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit((v) => mutate(v))} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="montant"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-medium">{t('montant_label')}</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          className="h-9 text-sm"
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
                      <FormLabel className="text-xs font-medium">{t('mode_label')}</FormLabel>
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
                      <FormLabel className="text-xs font-medium">{tc('date')}</FormLabel>
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
                        <Input className="h-9 text-sm" {...field} />
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
                      <Textarea className="resize-none text-sm" rows={2} {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="flex items-center justify-between pt-1">
                <span
                  className={`text-xs text-muted-foreground transition-opacity ${
                    isDirty ? 'opacity-100' : 'opacity-0'
                  }`}
                >
                  {t('modifications_non_enregistrees')}
                </span>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={onFermer}
                    disabled={isPending}
                  >
                    {tc('annuler')}
                  </Button>
                  <Button type="submit" size="sm" disabled={isPending || !isDirty}>
                    {isPending && (
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                    )}
                    {isPending ? tc('enregistrement_en_cours') : tc('enregistrer')}
                  </Button>
                </div>
              </div>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// import { useMutation } from '@tanstack/react-query';
// import { useForm } from 'react-hook-form';
// import { zodResolver } from '@hookform/resolvers/zod';
// import { Loader2 } from 'lucide-react';
// import { toast } from 'sonner';

// import { Button } from '@/components/ui/button';
// import { Input } from '@/components/ui/input';
// import { Textarea } from '@/components/ui/textarea';
// import {
//   Dialog,
//   DialogContent,
//   DialogDescription,
//   DialogHeader,
//   DialogTitle,
// } from '@/components/ui/dialog';
// import {
//   Form,
//   FormControl,
//   FormField,
//   FormItem,
//   FormLabel,
//   FormMessage,
// } from '@/components/ui/form';
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from '@/components/ui/select';

// import { modifierPaiement, nomClient, type PaiementPopule } from '@/api/paiement.api';
// import { schemaModifier, type FormModifier, formaterMontant } from './paiement.config';

// interface Props {
//   paiement: PaiementPopule;
//   onFermer: () => void;
//   onSuccess: () => void;
// }

// export default function DialogModifierPaiement({ paiement, onFermer, onSuccess }: Props) {
//   const form = useForm<FormModifier>({
//     resolver: zodResolver(schemaModifier),
//     defaultValues: {
//       montant: paiement.montant,
//       mode: paiement.mode,
//       date: paiement.date.slice(0, 10),
//       reference: paiement.reference ?? '',
//       note: paiement.note ?? '',
//     },
//   });

//   const { isDirty } = form.formState;

//   const { mutate, isPending } = useMutation({
//     mutationFn: (v: FormModifier) =>
//       modifierPaiement(paiement._id, {
//         montant: v.montant,
//         mode: v.mode,
//         date: `${v.date}T00:00:00.000Z`,
//         reference: v.reference || undefined,
//         note: v.note || undefined,
//       }),
//     onSuccess: () => {
//       toast.success('Paiement modifié');
//       onSuccess();
//     },
//     onError: (err: unknown) => {
//       const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
//       toast.error(msg ?? 'Impossible de modifier');
//     },
//   });

//   const Opt = () => <span className="font-normal text-muted-foreground/70">(opt.)</span>;

//   return (
//     <Dialog open onOpenChange={(o) => !o && onFermer()}>
//       <DialogContent className="gap-0 p-0 sm:max-w-md">
//         {/* ── Header ──────────────────────────────────────────── */}
//         <DialogHeader className="border-b px-6 py-4">
//           <DialogTitle className="text-base">Modifier le paiement</DialogTitle>
//           <DialogDescription className="text-xs text-muted-foreground">
//             {formaterMontant(paiement.montant)}
//             {paiement.dossier && (
//               <>
//                 {' '}
//                 · <span className="font-mono">{paiement.dossier.reference}</span>
//               </>
//             )}
//           </DialogDescription>
//         </DialogHeader>

//         <div className="px-6 py-5">
//           {/* ── Bandeau dossier / client ─────────────────────── */}
//           {paiement.dossier && (
//             <div className="mb-4 rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
//               <span className="font-mono">{paiement.dossier.reference}</span>
//               {' · '}
//               {paiement.dossier.titre}
//               {paiement.dossier.client && (
//                 <span className="ml-2 font-medium text-foreground">
//                   — {nomClient(paiement.dossier.client)}
//                 </span>
//               )}
//             </div>
//           )}

//           {/* ── Formulaire ──────────────────────────────────── */}
//           <Form {...form}>
//             <form onSubmit={form.handleSubmit((v) => mutate(v))} className="space-y-4">
//               {/* Montant + Mode */}
//               <div className="grid grid-cols-2 gap-3">
//                 <FormField
//                   control={form.control}
//                   name="montant"
//                   render={({ field }) => (
//                     <FormItem>
//                       <FormLabel className="text-xs font-medium">Montant (DA)</FormLabel>
//                       <FormControl>
//                         <Input
//                           type="number"
//                           min={1}
//                           className="h-9 text-sm"
//                           {...field}
//                           value={field.value ?? ''}
//                           onChange={(e) => field.onChange(e.target.valueAsNumber)}
//                         />
//                       </FormControl>
//                       <FormMessage className="text-xs" />
//                     </FormItem>
//                   )}
//                 />
//                 <FormField
//                   control={form.control}
//                   name="mode"
//                   render={({ field }) => (
//                     <FormItem>
//                       <FormLabel className="text-xs font-medium">Mode</FormLabel>
//                       <Select value={field.value} onValueChange={field.onChange}>
//                         <FormControl>
//                           <SelectTrigger className="h-9 w-full text-sm">
//                             <SelectValue />
//                           </SelectTrigger>
//                         </FormControl>
//                         <SelectContent>
//                           <SelectItem value="cash">Espèces</SelectItem>
//                           <SelectItem value="virement">Virement</SelectItem>
//                           <SelectItem value="ccp">CCP</SelectItem>
//                         </SelectContent>
//                       </Select>
//                       <FormMessage className="text-xs" />
//                     </FormItem>
//                   )}
//                 />
//               </div>

//               {/* Date + Référence */}
//               <div className="grid grid-cols-2 gap-3">
//                 <FormField
//                   control={form.control}
//                   name="date"
//                   render={({ field }) => (
//                     <FormItem>
//                       <FormLabel className="text-xs font-medium">Date</FormLabel>
//                       <FormControl>
//                         <Input type="date" className="h-9 text-sm" {...field} />
//                       </FormControl>
//                       <FormMessage className="text-xs" />
//                     </FormItem>
//                   )}
//                 />
//                 <FormField
//                   control={form.control}
//                   name="reference"
//                   render={({ field }) => (
//                     <FormItem>
//                       <FormLabel className="text-xs font-medium">
//                         Référence <Opt />
//                       </FormLabel>
//                       <FormControl>
//                         <Input className="h-9 text-sm" {...field} />
//                       </FormControl>
//                       <FormMessage className="text-xs" />
//                     </FormItem>
//                   )}
//                 />
//               </div>

//               {/* Note */}
//               <FormField
//                 control={form.control}
//                 name="note"
//                 render={({ field }) => (
//                   <FormItem>
//                     <FormLabel className="text-xs font-medium">
//                       Note <Opt />
//                     </FormLabel>
//                     <FormControl>
//                       <Textarea className="resize-none text-sm" rows={2} {...field} />
//                     </FormControl>
//                   </FormItem>
//                 )}
//               />

//               {/* ── Footer actions ───────────────────────────── */}
//               <div className="flex justify-end gap-2 pt-1">
//                 <Button
//                   type="button"
//                   variant="outline"
//                   size="sm"
//                   onClick={onFermer}
//                   disabled={isPending}
//                 >
//                   Annuler
//                 </Button>
//                 <Button type="submit" size="sm" disabled={isPending || !isDirty}>
//                   {isPending && (
//                     <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden="true" />
//                   )}
//                   {isPending ? 'Enregistrement…' : 'Enregistrer'}
//                 </Button>
//               </div>
//             </form>
//           </Form>
//         </div>
//       </DialogContent>
//     </Dialog>
//   );
// }
