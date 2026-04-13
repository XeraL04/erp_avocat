import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

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
import { schemaModifier, FormModifier } from './paiement.config';

interface Props {
  paiement: PaiementPopule;
  onFermer: () => void;
  onSuccess: () => void;
}

export default function DialogModifierPaiement({ paiement, onFermer, onSuccess }: Props) {
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
      toast.success('Paiement modifié');
      onSuccess();
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? 'Impossible de modifier');
    },
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onFermer()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Modifier le paiement</DialogTitle>
          <DialogDescription className="sr-only">Formulaire de modification</DialogDescription>
        </DialogHeader>

        {paiement.dossier && (
          <div className="rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
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
                    <FormLabel>Montant (DA)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
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
                    <FormLabel>Mode</FormLabel>
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
                    <FormLabel>Date</FormLabel>
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
                    <FormLabel>Référence</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Note</FormLabel>
                  <FormControl>
                    <Textarea className="resize-none" rows={2} {...field} />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={onFermer} disabled={isPending}>
                Annuler
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Enregistrer
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
