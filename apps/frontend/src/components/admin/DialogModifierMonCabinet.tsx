import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { Loader2, Building2, X } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { modifierMonCabinet, type Cabinet } from '@/api/utilisateur.api';

const schema = z.object({
  nom: z.string().trim().min(2).optional(),
  telephone: z.string().optional(),
  adresse: z.string().optional(),
  ville: z.string().optional(),
  numeroFiscal: z.string().optional(),
  rib: z.string().optional(),
  tva: z.coerce.number().min(0).max(100).optional(),
});

type Champs = z.infer<typeof schema>;

interface Props {
  cabinet: Cabinet;
  onFermer: () => void;
  onSuccess: (c: Cabinet) => void;
}

export default function DialogModifierMonCabinet({ cabinet, onFermer, onSuccess }: Props) {
  const { t, i18n } = useTranslation('cabinet');
  const { t: tc } = useTranslation('common');
  const estRTL = i18n.language === 'ar';

  const form = useForm<Champs>({
    resolver: zodResolver(schema),
    defaultValues: {
      nom: cabinet.nom ?? '',
      telephone: cabinet.telephone ?? '',
      adresse: cabinet.adresse ?? '',
      ville: cabinet.ville ?? '',
      numeroFiscal: cabinet.numeroFiscal ?? '',
      rib: cabinet.rib ?? '',
      tva: cabinet.tva ?? 19,
    },
  });

  const { mutate, isPending } = useMutation({
    mutationFn: (valeurs: Champs) => modifierMonCabinet(valeurs),
    onSuccess: (c) => {
      toast.success(t('cabinet_updated_toast'));
      onSuccess(c);
    },
    onError: () => toast.error(tc('error')),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onFermer()}>
      <DialogContent className="sm:max-w-lg" dir={estRTL ? 'rtl' : 'ltr'} showCloseButton={false}>
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

        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            {t('cabinet_info_title')}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => mutate(v))} className="space-y-4">
            {/* ── Identité ── */}
            <FormField
              control={form.control}
              name="nom"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('form_cabinet_name')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('form_cabinet_name_placeholder')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="telephone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{tc('phone')}</FormLabel>
                    <FormControl>
                      <Input placeholder="0555 123 456" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="ville"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('form_city')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('form_city_placeholder')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="adresse"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{tc('address')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('form_address_placeholder')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Separator />

            {/* ── Infos fiscales ── */}
            <p className="text-sm font-medium text-muted-foreground">{t('section_fiscal')}</p>

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="numeroFiscal"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('form_fiscal_number')}</FormLabel>
                    <FormControl>
                      <Input placeholder="NIF / NIS" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="tva"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('form_tva')}</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} max={100} placeholder="19" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="rib"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('form_rib')}</FormLabel>
                  <FormControl>
                    <Input placeholder="00200 01234 12345678901 23" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={onFermer} disabled={isPending}>
                {tc('cancel')}
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                {isPending ? tc('saving') : tc('save')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
