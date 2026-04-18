import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { AxiosError } from 'axios';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
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

// ─── ChampsCommuns ────────────────────────────────────────────────────────────
interface ChampsCommunsProps {
  register: ReturnType<typeof useForm<FormPhysique | FormMorale>>['register'];
  errors: Partial<Record<string, { message?: string }>>;
  isPending: boolean;
}

function ChampsCommuns({ register, errors, isPending }: ChampsCommunsProps) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="telephone">Téléphone *</Label>
          <Input
            id="telephone"
            placeholder="0550 00 00 00"
            disabled={isPending}
            aria-invalid={!!errors.telephone}
            aria-describedby={errors.telephone ? 'tel-error' : undefined}
            {...register('telephone')}
          />
          {errors.telephone && (
            <p id="tel-error" className="text-xs text-destructive" role="alert">
              {errors.telephone.message}
            </p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="telephoneSecondaire">Tél. secondaire</Label>
          <Input
            id="telephoneSecondaire"
            placeholder="Optionnel"
            disabled={isPending}
            {...register('telephoneSecondaire')}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="email@exemple.dz"
          disabled={isPending}
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? 'email-error' : undefined}
          {...register('email')}
        />
        {errors.email && (
          <p id="email-error" className="text-xs text-destructive" role="alert">
            {errors.email.message}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="adresse">Adresse</Label>
        <Input
          id="adresse"
          placeholder="Wilaya, commune…"
          disabled={isPending}
          {...register('adresse')}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          placeholder="Informations complémentaires…"
          rows={2}
          className="resize-none"
          disabled={isPending}
          {...register('notes')}
        />
      </div>
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
  const navigate = useNavigate(); // ← NOUVEAU
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
      // ← MODIFIÉ
      queryClient.invalidateQueries({ queryKey: ['cabinet', 'clients'] });
      queryClient.invalidateQueries({ queryKey: ['cabinet', 'dashboard'] });
      toast.success('Client créé — ouvrez un dossier pour continuer');
      physiqueForm.reset();
      moraleForm.reset();
      onFermer();
      // Redirection vers la création de dossier avec le client pré-sélectionné
      navigate('/cabinet/dossiers', {
        state: { ouvrirCreerDossier: true, clientId: clientCree._id ?? clientCree._id },
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

  return (
    <Dialog open={ouvert} onOpenChange={handleFermer}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nouveau client</DialogTitle>
          <DialogDescription>
            Choisissez le type de client puis remplissez les informations.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={typeClient} onValueChange={(v) => setTypeClient(v as 'physique' | 'morale')}>
          <TabsList className="w-full">
            <TabsTrigger value="physique" className="flex-1">
              Personne physique
            </TabsTrigger>
            <TabsTrigger value="morale" className="flex-1">
              Personne morale
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* ── Formulaire Physique ─────────────────────────────── */}
        {typeClient === 'physique' && (
          <form
            onSubmit={physiqueForm.handleSubmit(onSubmitPhysique)}
            className="space-y-4"
            noValidate
          >
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="prenom">Prénom *</Label>
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
                  {physiqueForm.formState.errors.prenom && (
                    <p id="prenom-error" className="text-xs text-destructive" role="alert">
                      {physiqueForm.formState.errors.prenom.message}
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="nom">Nom *</Label>
                  <Input
                    id="nom"
                    placeholder="Bensalem"
                    disabled={isPending}
                    aria-invalid={!!physiqueForm.formState.errors.nom}
                    aria-describedby={physiqueForm.formState.errors.nom ? 'nom-error' : undefined}
                    {...physiqueForm.register('nom')}
                  />
                  {physiqueForm.formState.errors.nom && (
                    <p id="nom-error" className="text-xs text-destructive" role="alert">
                      {physiqueForm.formState.errors.nom.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="cin">
                  Numéro d'identification nationale
                  <span className="ml-1 text-xs font-normal text-muted-foreground">
                    (optionnel)
                  </span>
                </Label>
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
                {physiqueForm.formState.errors.cin && (
                  <p id="cin-error" className="text-xs text-destructive" role="alert">
                    {physiqueForm.formState.errors.cin.message}
                  </p>
                )}
              </div>
            </div>

            <Separator />

            <ChampsCommuns
              register={physiqueForm.register as ChampsCommunsProps['register']}
              errors={physiqueForm.formState.errors}
              isPending={isPending}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleFermer} disabled={isPending}>
                Annuler
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
                {isPending ? 'Création en cours…' : 'Créer le client'}
              </Button>
            </DialogFooter>
          </form>
        )}

        {/* ── Formulaire Morale ───────────────────────────────── */}
        {typeClient === 'morale' && (
          <form onSubmit={moraleForm.handleSubmit(onSubmitMorale)} className="space-y-4" noValidate>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="raisonSociale">Raison sociale *</Label>
                <Input
                  id="raisonSociale"
                  placeholder="SARL, EURL, SPA…"
                  disabled={isPending}
                  aria-invalid={!!moraleForm.formState.errors.raisonSociale}
                  aria-describedby={
                    moraleForm.formState.errors.raisonSociale ? 'rs-error' : undefined
                  }
                  {...moraleForm.register('raisonSociale')}
                />
                {moraleForm.formState.errors.raisonSociale && (
                  <p id="rs-error" className="text-xs text-destructive" role="alert">
                    {moraleForm.formState.errors.raisonSociale.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="representantLegal">Représentant légal</Label>
                <Input
                  id="representantLegal"
                  placeholder="Nom du gérant ou PDG"
                  disabled={isPending}
                  {...moraleForm.register('representantLegal')}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="nifRc">NIF / Registre de commerce</Label>
                <Input
                  id="nifRc"
                  placeholder="Numéro NIF ou RC"
                  disabled={isPending}
                  {...moraleForm.register('nifRc')}
                />
              </div>
            </div>

            <Separator />

            <ChampsCommuns
              register={moraleForm.register as ChampsCommunsProps['register']}
              errors={moraleForm.formState.errors}
              isPending={isPending}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleFermer} disabled={isPending}>
                Annuler
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
                {isPending ? 'Création en cours…' : 'Créer le client'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

// import { useState } from 'react';
// import { useForm } from 'react-hook-form';
// import { zodResolver } from '@hookform/resolvers/zod';
// import { z } from 'zod';
// import { useMutation, useQueryClient } from '@tanstack/react-query';
// import { Loader2 } from 'lucide-react';
// import { toast } from 'sonner';
// import type { AxiosError } from 'axios';

// import {
//   Dialog,
//   DialogContent,
//   DialogHeader,
//   DialogTitle,
//   DialogDescription,
//   DialogFooter,
// } from '@/components/ui/dialog';
// import { Button } from '@/components/ui/button';
// import { Input } from '@/components/ui/input';
// import { Label } from '@/components/ui/label';
// import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
// import { Separator } from '@/components/ui/separator';
// import { Textarea } from '@/components/ui/textarea';

// import { creerClient } from '@/api/client.api';
// import { extraireMessageErreur } from '@/api/auth.api';

// // ─── Helper ───────────────────────────────────────────────────────────────────
// function normaliserTel(val?: string): string | undefined {
//   if (!val) return undefined;
//   const nettoye = val.replace(/[\s\-.]+/g, '').trim();
//   return nettoye.length > 0 ? nettoye : undefined;
// }

// // ─── Schémas ──────────────────────────────────────────────────────────────────
// const baseSchema = z.object({
//   telephone: z
//     .string()
//     .min(9, 'Numéro invalide')
//     .regex(/^[0-9+\s\-.]+$/, 'Format invalide'),
//   telephoneSecondaire: z.string().optional(),
//   email: z.string().email('Email invalide').optional().or(z.literal('')),
//   adresse: z.string().optional(),
//   notes: z.string().optional(),
// });

// const physiqueSchema = baseSchema.extend({
//   type: z.literal('physique'),
//   nom: z.string().min(2, 'Nom requis'),
//   prenom: z.string().min(2, 'Prénom requis'),
//   cin: z
//     .string()
//     .regex(/^\d{18}$/, 'Le NIN doit contenir exactement 18 chiffres')
//     .optional()
//     .or(z.literal('')),
// });

// const moraleSchema = baseSchema.extend({
//   type: z.literal('morale'),
//   raisonSociale: z.string().min(2, 'Raison sociale requise'),
//   representantLegal: z.string().optional(),
//   nifRc: z.string().optional(),
// });

// type FormPhysique = z.infer<typeof physiqueSchema>;
// type FormMorale = z.infer<typeof moraleSchema>;

// // ─── ChampsCommuns ────────────────────────────────────────────────────────────
// interface ChampsCommunsProps {
//   register: ReturnType<typeof useForm<FormPhysique | FormMorale>>['register'];
//   errors: Partial<Record<string, { message?: string }>>;
//   isPending: boolean;
// }

// function ChampsCommuns({ register, errors, isPending }: ChampsCommunsProps) {
//   return (
//     <div className="space-y-3">
//       <div className="grid grid-cols-2 gap-3">
//         <div className="space-y-1.5">
//           <Label htmlFor="telephone">Téléphone *</Label>
//           <Input
//             id="telephone"
//             placeholder="0550 00 00 00"
//             disabled={isPending}
//             aria-invalid={!!errors.telephone}
//             aria-describedby={errors.telephone ? 'tel-error' : undefined}
//             {...register('telephone')}
//           />
//           {errors.telephone && (
//             <p id="tel-error" className="text-xs text-destructive" role="alert">
//               {errors.telephone.message}
//             </p>
//           )}
//         </div>
//         <div className="space-y-1.5">
//           <Label htmlFor="telephoneSecondaire">Tél. secondaire</Label>
//           <Input
//             id="telephoneSecondaire"
//             placeholder="Optionnel"
//             disabled={isPending}
//             {...register('telephoneSecondaire')}
//           />
//         </div>
//       </div>

//       <div className="space-y-1.5">
//         <Label htmlFor="email">Email</Label>
//         <Input
//           id="email"
//           type="email"
//           placeholder="email@exemple.dz"
//           disabled={isPending}
//           aria-invalid={!!errors.email}
//           aria-describedby={errors.email ? 'email-error' : undefined}
//           {...register('email')}
//         />
//         {errors.email && (
//           <p id="email-error" className="text-xs text-destructive" role="alert">
//             {errors.email.message}
//           </p>
//         )}
//       </div>

//       <div className="space-y-1.5">
//         <Label htmlFor="adresse">Adresse</Label>
//         <Input
//           id="adresse"
//           placeholder="Wilaya, commune…"
//           disabled={isPending}
//           {...register('adresse')}
//         />
//       </div>

//       <div className="space-y-1.5">
//         <Label htmlFor="notes">Notes</Label>
//         <Textarea
//           id="notes"
//           placeholder="Informations complémentaires…"
//           rows={2}
//           className="resize-none"
//           disabled={isPending}
//           {...register('notes')}
//         />
//       </div>
//     </div>
//   );
// }

// // ─── Composant principal ──────────────────────────────────────────────────────
// interface Props {
//   ouvert: boolean;
//   onFermer: () => void;
// }

// export default function DialogCreerClient({ ouvert, onFermer }: Props) {
//   const queryClient = useQueryClient();
//   const [typeClient, setTypeClient] = useState<'physique' | 'morale'>('physique');

//   const physiqueForm = useForm<FormPhysique>({
//     resolver: zodResolver(physiqueSchema),
//     defaultValues: { type: 'physique' },
//   });

//   const moraleForm = useForm<FormMorale>({
//     resolver: zodResolver(moraleSchema),
//     defaultValues: { type: 'morale' },
//   });

//   const { mutate, isPending } = useMutation({
//     mutationFn: creerClient,
//     onSuccess: () => {
//       queryClient.invalidateQueries({ queryKey: ['cabinet', 'clients'] });
//       queryClient.invalidateQueries({ queryKey: ['cabinet', 'dashboard'] });
//       toast.success('Client créé avec succès');
//       physiqueForm.reset();
//       moraleForm.reset();
//       onFermer();
//     },
//     onError: (err: unknown) => {
//       toast.error(extraireMessageErreur(err as AxiosError));
//     },
//   });

//   const handleFermer = () => {
//     if (!isPending) {
//       physiqueForm.reset();
//       moraleForm.reset();
//       onFermer();
//     }
//   };

//   const onSubmitPhysique = (data: FormPhysique) =>
//     mutate({
//       ...data,
//       telephone: normaliserTel(data.telephone)!,
//       telephoneSecondaire: normaliserTel(data.telephoneSecondaire),
//     });

//   const onSubmitMorale = (data: FormMorale) =>
//     mutate({
//       ...data,
//       telephone: normaliserTel(data.telephone)!,
//       telephoneSecondaire: normaliserTel(data.telephoneSecondaire),
//     });

//   return (
//     <Dialog open={ouvert} onOpenChange={handleFermer}>
//       <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
//         <DialogHeader>
//           <DialogTitle>Nouveau client</DialogTitle>
//           <DialogDescription>
//             Choisissez le type de client puis remplissez les informations.
//           </DialogDescription>
//         </DialogHeader>

//         <Tabs value={typeClient} onValueChange={(v) => setTypeClient(v as 'physique' | 'morale')}>
//           <TabsList className="w-full">
//             <TabsTrigger value="physique" className="flex-1">
//               Personne physique
//             </TabsTrigger>
//             <TabsTrigger value="morale" className="flex-1">
//               Personne morale
//             </TabsTrigger>
//           </TabsList>
//         </Tabs>

//         {/* ── Formulaire Physique ─────────────────────────────── */}
//         {typeClient === 'physique' && (
//           <form
//             onSubmit={physiqueForm.handleSubmit(onSubmitPhysique)}
//             className="space-y-4"
//             noValidate
//           >
//             <div className="space-y-3">
//               <div className="grid grid-cols-2 gap-3">
//                 <div className="space-y-1.5">
//                   <Label htmlFor="prenom">Prénom *</Label>
//                   <Input
//                     id="prenom"
//                     placeholder="Ahmed"
//                     disabled={isPending}
//                     aria-invalid={!!physiqueForm.formState.errors.prenom}
//                     aria-describedby={
//                       physiqueForm.formState.errors.prenom ? 'prenom-error' : undefined
//                     }
//                     {...physiqueForm.register('prenom')}
//                   />
//                   {physiqueForm.formState.errors.prenom && (
//                     <p id="prenom-error" className="text-xs text-destructive" role="alert">
//                       {physiqueForm.formState.errors.prenom.message}
//                     </p>
//                   )}
//                 </div>
//                 <div className="space-y-1.5">
//                   <Label htmlFor="nom">Nom *</Label>
//                   <Input
//                     id="nom"
//                     placeholder="Bensalem"
//                     disabled={isPending}
//                     aria-invalid={!!physiqueForm.formState.errors.nom}
//                     aria-describedby={physiqueForm.formState.errors.nom ? 'nom-error' : undefined}
//                     {...physiqueForm.register('nom')}
//                   />
//                   {physiqueForm.formState.errors.nom && (
//                     <p id="nom-error" className="text-xs text-destructive" role="alert">
//                       {physiqueForm.formState.errors.nom.message}
//                     </p>
//                   )}
//                 </div>
//               </div>

//               <div className="space-y-1.5">
//                 <Label htmlFor="cin">
//                   Numéro d'identification nationale
//                   <span className="ml-1 text-xs font-normal text-muted-foreground">
//                     (optionnel)
//                   </span>
//                 </Label>
//                 <Input
//                   id="cin"
//                   placeholder="18 chiffres"
//                   maxLength={18}
//                   inputMode="numeric"
//                   disabled={isPending}
//                   aria-invalid={!!physiqueForm.formState.errors.cin}
//                   aria-describedby={physiqueForm.formState.errors.cin ? 'cin-error' : undefined}
//                   {...physiqueForm.register('cin')}
//                 />
//                 {physiqueForm.formState.errors.cin && (
//                   <p id="cin-error" className="text-xs text-destructive" role="alert">
//                     {physiqueForm.formState.errors.cin.message}
//                   </p>
//                 )}
//               </div>
//             </div>

//             <Separator />

//             <ChampsCommuns
//               register={physiqueForm.register as ChampsCommunsProps['register']}
//               errors={physiqueForm.formState.errors}
//               isPending={isPending}
//             />

//             <DialogFooter>
//               <Button type="button" variant="outline" onClick={handleFermer} disabled={isPending}>
//                 Annuler
//               </Button>
//               <Button type="submit" disabled={isPending}>
//                 {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
//                 {isPending ? 'Création en cours…' : 'Créer le client'}
//               </Button>
//             </DialogFooter>
//           </form>
//         )}

//         {/* ── Formulaire Morale ───────────────────────────────── */}
//         {typeClient === 'morale' && (
//           <form onSubmit={moraleForm.handleSubmit(onSubmitMorale)} className="space-y-4" noValidate>
//             <div className="space-y-3">
//               <div className="space-y-1.5">
//                 <Label htmlFor="raisonSociale">Raison sociale *</Label>
//                 <Input
//                   id="raisonSociale"
//                   placeholder="SARL, EURL, SPA…"
//                   disabled={isPending}
//                   aria-invalid={!!moraleForm.formState.errors.raisonSociale}
//                   aria-describedby={
//                     moraleForm.formState.errors.raisonSociale ? 'rs-error' : undefined
//                   }
//                   {...moraleForm.register('raisonSociale')}
//                 />
//                 {moraleForm.formState.errors.raisonSociale && (
//                   <p id="rs-error" className="text-xs text-destructive" role="alert">
//                     {moraleForm.formState.errors.raisonSociale.message}
//                   </p>
//                 )}
//               </div>

//               <div className="space-y-1.5">
//                 <Label htmlFor="representantLegal">Représentant légal</Label>
//                 <Input
//                   id="representantLegal"
//                   placeholder="Nom du gérant ou PDG"
//                   disabled={isPending}
//                   {...moraleForm.register('representantLegal')}
//                 />
//               </div>

//               <div className="space-y-1.5">
//                 <Label htmlFor="nifRc">NIF / Registre de commerce</Label>
//                 <Input
//                   id="nifRc"
//                   placeholder="Numéro NIF ou RC"
//                   disabled={isPending}
//                   {...moraleForm.register('nifRc')}
//                 />
//               </div>
//             </div>

//             <Separator />

//             <ChampsCommuns
//               register={moraleForm.register as ChampsCommunsProps['register']}
//               errors={moraleForm.formState.errors}
//               isPending={isPending}
//             />

//             <DialogFooter>
//               <Button type="button" variant="outline" onClick={handleFermer} disabled={isPending}>
//                 Annuler
//               </Button>
//               <Button type="submit" disabled={isPending}>
//                 {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
//                 {isPending ? 'Création en cours…' : 'Créer le client'}
//               </Button>
//             </DialogFooter>
//           </form>
//         )}
//       </DialogContent>
//     </Dialog>
//   );
// }
