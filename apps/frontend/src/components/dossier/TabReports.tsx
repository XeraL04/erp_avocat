import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CalendarClock, Plus, Trash2, Pencil } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import type { Report } from '@/types';
import { ajouterReport, modifierReport, supprimerReport } from '@/api/dossier.api';
import { formaterDate, cn } from '@/lib/utils';

// ─── Props ────────────────────────────────────────────────────────────────────
interface TabReportsProps {
  dossierId: string;
  reports: Report[];
  estAdmin: boolean;
  onMutationSuccess: () => void;
}

interface EtatFormulaire {
  date: string;
  raison: string;
  jugement: string;
}

const formulaireVide: EtatFormulaire = { date: '', raison: '', jugement: '' };

// ─── Composant ────────────────────────────────────────────────────────────────
export default function TabReports({
  dossierId,
  reports,
  estAdmin,
  onMutationSuccess,
}: TabReportsProps) {
  const { t } = useTranslation('reports');
  const { t: tc } = useTranslation('common');

  const [dialogAjoutOuvert, setDialogAjoutOuvert] = useState(false);
  const [formulaireAjout, setFormulaireAjout] = useState<EtatFormulaire>(formulaireVide);
  const [reportAModifier, setReportAModifier] = useState<Report | null>(null);
  const [formulaireModif, setFormulaireModif] = useState<EtatFormulaire>(formulaireVide);
  const [reportASupprimer, setReportASupprimer] = useState<Report | null>(null);

  // ── Mutations ──────────────────────────────────────────────────────────────
  const { mutate: ajouter, isPending: ajoutEnCours } = useMutation({
    mutationFn: () =>
      ajouterReport(dossierId, {
        date: formulaireAjout.date,
        raison: formulaireAjout.raison,
        jugement: formulaireAjout.jugement.trim() || undefined,
      }),
    onSuccess: () => {
      toast.success(t('report_ajoute'));
      fermerDialogAjout();
      onMutationSuccess();
    },
    onError: () => toast.error(t('erreur_ajout')),
  });

  const { mutate: modifier, isPending: modifEnCours } = useMutation({
    mutationFn: () =>
      modifierReport(dossierId, reportAModifier!._id, {
        date: formulaireModif.date,
        raison: formulaireModif.raison,
        jugement: formulaireModif.jugement.trim() || undefined,
      }),
    onSuccess: () => {
      toast.success(t('report_modifie'));
      fermerDialogModif();
      onMutationSuccess();
    },
    onError: () => toast.error(t('erreur_modification')),
  });

  const { mutate: supprimer, isPending: suppressionEnCours } = useMutation({
    mutationFn: () => supprimerReport(dossierId, reportASupprimer!._id),
    onSuccess: () => {
      toast.success(t('report_supprime'));
      setReportASupprimer(null);
      onMutationSuccess();
    },
    onError: () => toast.error(tc('erreur_suppression')),
  });

  // ── Helpers ────────────────────────────────────────────────────────────────
  const fermerDialogAjout = () => {
    setDialogAjoutOuvert(false);
    setFormulaireAjout(formulaireVide);
  };

  const ouvrirDialogModif = (report: Report) => {
    setReportAModifier(report);
    setFormulaireModif({
      date: new Date(report.date).toISOString().split('T')[0],
      raison: report.raison,
      jugement: report.jugement ?? '',
    });
  };

  const fermerDialogModif = () => {
    setReportAModifier(null);
    setFormulaireModif(formulaireVide);
  };

  const peutSoumettreAjout =
    formulaireAjout.date.trim() !== '' && formulaireAjout.raison.trim().length >= 2;

  const peutSoumettreModif =
    formulaireModif.date.trim() !== '' && formulaireModif.raison.trim().length >= 2;

  const sorted = [...reports].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // ── Rendu ──────────────────────────────────────────────────────────────────
  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3 pt-4">
          <CardTitle className="text-sm font-medium text-muted-foreground">{t('titre')}</CardTitle>
          <Button size="sm" onClick={() => setDialogAjoutOuvert(true)}>
            <Plus className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
            {tc('ajouter')}
          </Button>
        </CardHeader>

        <CardContent className="p-0">
          {sorted.length === 0 ? (
            /* ── État vide ─────────────────────────────────────── */
            <div className="flex flex-col items-center gap-2 py-14 text-center">
              <CalendarClock className="h-9 w-9 text-muted-foreground/25" aria-hidden="true" />
              <p className="text-sm font-medium">{t('aucun_report')}</p>
              <p className="max-w-xs text-xs text-muted-foreground">{t('aucun_report_desc')}</p>
            </div>
          ) : (
            /* ── Timeline table ────────────────────────────────── */
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-10 pl-5" />
                    <TableHead className="w-36 text-xs">{t('col_renvoi')}</TableHead>
                    <TableHead className="text-xs">{t('col_motif')}</TableHead>
                    <TableHead className="hidden text-xs md:table-cell">
                      {t('col_dispositif')}
                    </TableHead>
                    {estAdmin && <TableHead className="w-20 pr-4" />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sorted.map((report, index) => {
                    const isLast = index === sorted.length - 1;
                    return (
                      <TableRow
                        key={report._id ?? index}
                        className="group align-top hover:bg-accent/40"
                      >
                        {/* ── Indicateur timeline ─────────────── */}
                        <TableCell className="pl-5 pt-3.5">
                          <div className="relative flex flex-col items-center">
                            {!isLast && (
                              <span
                                className="absolute top-5 h-full w-px bg-border/60"
                                aria-hidden="true"
                              />
                            )}
                            <span
                              className={cn(
                                'relative z-10 flex h-5 w-5 items-center justify-center rounded-full ring-2',
                                isLast ? 'bg-primary/10 ring-primary/20' : 'bg-muted ring-border'
                              )}
                              aria-hidden="true"
                            >
                              <span
                                className={cn(
                                  'h-1.5 w-1.5 rounded-full',
                                  isLast ? 'bg-primary' : 'bg-muted-foreground/40'
                                )}
                              />
                            </span>
                          </div>
                        </TableCell>

                        {/* ── Date ────────────────────────────── */}
                        <TableCell className="pt-3">
                          <span className="text-xs font-semibold tabular-nums text-foreground">
                            {formaterDate(report.date)}
                          </span>
                          <p className="mt-0.5 text-xs text-muted-foreground md:hidden">
                            {report.raison}
                          </p>
                        </TableCell>

                        {/* ── Motif ───────────────────────────── */}
                        <TableCell className="hidden pt-3 text-xs text-muted-foreground md:table-cell">
                          {report.raison}
                        </TableCell>

                        {/* ── Dispositif ──────────────────────── */}
                        <TableCell className="hidden pt-3 text-xs text-muted-foreground md:table-cell">
                          {report.jugement ? (
                            <span className="leading-relaxed">{report.jugement}</span>
                          ) : (
                            <span className="text-muted-foreground/30">—</span>
                          )}
                        </TableCell>

                        {/* ── Actions ─────────────────────────── */}
                        {estAdmin && (
                          <TableCell className="pr-4 pt-2 text-right">
                            <div className="flex items-center justify-end gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                onClick={() => ouvrirDialogModif(report)}
                                aria-label={t('modifier_report')}
                              >
                                <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                onClick={() => setReportASupprimer(report)}
                                aria-label={t('supprimer_report')}
                              >
                                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Dialog — Ajouter un report ──────────────────────────── */}
      <Dialog
        open={dialogAjoutOuvert}
        onOpenChange={(o) => {
          if (!o && !ajoutEnCours) fermerDialogAjout();
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('dialog_ajouter_titre')}</DialogTitle>
          </DialogHeader>
          <FormulaireReport valeurs={formulaireAjout} onChange={setFormulaireAjout} />
          <DialogFooter>
            <Button variant="outline" onClick={fermerDialogAjout} disabled={ajoutEnCours}>
              {tc('cancel')}
            </Button>
            <Button onClick={() => ajouter()} disabled={!peutSoumettreAjout || ajoutEnCours}>
              {ajoutEnCours ? tc('ajout_en_cours') : tc('ajouter')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog — Modifier un report ─────────────────────────── */}
      <Dialog
        open={!!reportAModifier}
        onOpenChange={(o) => {
          if (!o && !modifEnCours) fermerDialogModif();
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('dialog_modifier_titre')}</DialogTitle>
          </DialogHeader>
          <FormulaireReport valeurs={formulaireModif} onChange={setFormulaireModif} />
          <DialogFooter>
            <Button variant="outline" onClick={fermerDialogModif} disabled={modifEnCours}>
              {tc('cancel')}
            </Button>
            <Button onClick={() => modifier()} disabled={!peutSoumettreModif || modifEnCours}>
              {modifEnCours ? tc('enregistrement_en_cours') : tc('enregistrer')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── AlertDialog — Confirmer suppression ─────────────────── */}
      <AlertDialog
        open={!!reportASupprimer}
        onOpenChange={(o) => {
          if (!o) setReportASupprimer(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('confirmer_supprimer_titre')}</AlertDialogTitle>
            <AlertDialogDescription>
              {reportASupprimer &&
                t('confirmer_supprimer_desc', {
                  date: formaterDate(reportASupprimer.date),
                  raison: reportASupprimer.raison,
                })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={suppressionEnCours}>{tc('annuler')}</AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                variant="destructive"
                disabled={suppressionEnCours}
                onClick={() => supprimer()}
              >
                {suppressionEnCours ? tc('suppression_en_cours') : tc('supprimer')}
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ─── Sous-composant formulaire ────────────────────────────────────────────────
interface FormulaireReportProps {
  valeurs: EtatFormulaire;
  onChange: (v: EtatFormulaire) => void;
}

function FormulaireReport({ valeurs, onChange }: FormulaireReportProps) {
  const { t } = useTranslation('reports');
  const { t: tc } = useTranslation('common');

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="report-date" className="text-xs font-medium">
          {t('champ_date')} <span className="text-destructive">*</span>
        </Label>
        <Input
          id="report-date"
          type="date"
          className="h-9 text-sm"
          value={valeurs.date}
          onChange={(e) => onChange({ ...valeurs, date: e.target.value })}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="report-raison" className="text-xs font-medium">
          {t('champ_motif')} <span className="text-destructive">*</span>
        </Label>
        <Input
          id="report-raison"
          className="h-9 text-sm"
          placeholder={t('placeholder_motif')}
          value={valeurs.raison}
          onChange={(e) => onChange({ ...valeurs, raison: e.target.value })}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="report-jugement" className="text-xs font-medium">
          {t('champ_dispositif')}{' '}
          <span className="font-normal text-muted-foreground">({tc('optionnel')})</span>
        </Label>
        <Textarea
          id="report-jugement"
          rows={3}
          className="resize-none text-sm"
          placeholder={t('placeholder_dispositif')}
          value={valeurs.jugement}
          onChange={(e) => onChange({ ...valeurs, jugement: e.target.value })}
        />
      </div>
    </div>
  );
}
