import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { Loader2, Building2 } from 'lucide-react';
import { toast } from 'sonner';

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
  nom: z.string().trim().min(2, 'Minimum 2 caractères').optional(),
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
      toast.success('Informations du cabinet mises à jour');
      onSuccess(c);
    },
    onError: () => toast.error('Erreur lors de la mise à jour'),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onFermer()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Informations du cabinet
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => mutate(v))} className="space-y-4">
            {/* ── Identité ───────────────────────────────────────── */}
            <FormField
              control={form.control}
              name="nom"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom du cabinet</FormLabel>
                  <FormControl>
                    <Input placeholder="Cabinet Maître Benali" {...field} />
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
                    <FormLabel>Téléphone</FormLabel>
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
                    <FormLabel>Ville</FormLabel>
                    <FormControl>
                      <Input placeholder="Alger" {...field} />
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
                  <FormLabel>Adresse</FormLabel>
                  <FormControl>
                    <Input placeholder="Rue Didouche Mourad, Alger" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Separator />

            {/* ── Infos fiscales ─────────────────────────────────── */}
            <p className="text-sm font-medium text-muted-foreground">Informations fiscales</p>

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="numeroFiscal"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Numéro fiscal</FormLabel>
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
                    <FormLabel>TVA (%)</FormLabel>
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
                  <FormLabel>RIB bancaire</FormLabel>
                  <FormControl>
                    <Input placeholder="00200 01234 12345678901 23" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={onFermer} disabled={isPending}>
                Annuler
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Enregistrer
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
