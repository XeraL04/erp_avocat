import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CalendarClock, Plus, Trash2, Pencil } from 'lucide-react';

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
import { formaterDate } from '@/lib/utils';

// ─── Props ────────────────────────────────────────────────────────────────────

interface TabReportsProps {
  dossierId: string;
  reports: Report[];
  estAdmin: boolean;
  onMutationSuccess: () => void;
}

// ─── État interne du formulaire ───────────────────────────────────────────────

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
  // ── Dialog ajout ──────────────────────────────────────────────────────────
  const [dialogAjoutOuvert, setDialogAjoutOuvert] = useState(false);
  const [formulaireAjout, setFormulaireAjout] = useState<EtatFormulaire>(formulaireVide);

  // ── Dialog modification ───────────────────────────────────────────────────
  const [reportAModifier, setReportAModifier] = useState<Report | null>(null);
  const [formulaireModif, setFormulaireModif] = useState<EtatFormulaire>(formulaireVide);

  // ── Dialog suppression ────────────────────────────────────────────────────
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
      toast.success('Report ajouté');
      fermerDialogAjout();
      onMutationSuccess();
    },
    onError: () => toast.error("Erreur lors de l'ajout du report"),
  });

  const { mutate: modifier, isPending: modifEnCours } = useMutation({
    mutationFn: () =>
      modifierReport(dossierId, reportAModifier!._id, {
        date: formulaireModif.date,
        raison: formulaireModif.raison,
        jugement: formulaireModif.jugement.trim() || undefined,
      }),
    onSuccess: () => {
      toast.success('Report mis à jour');
      fermerDialogModif();
      onMutationSuccess();
    },
    onError: () => toast.error('Erreur lors de la modification du report'),
  });

  const { mutate: supprimer, isPending: suppressionEnCours } = useMutation({
    mutationFn: () => supprimerReport(dossierId, reportASupprimer!._id),
    onSuccess: () => {
      toast.success('Report supprimé');
      setReportASupprimer(null);
      onMutationSuccess();
    },
    onError: () => toast.error('Erreur lors de la suppression'),
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
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">Reports d'audience</CardTitle>
          <Button size="sm" onClick={() => setDialogAjoutOuvert(true)}>
            <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
            Ajouter un report
          </Button>
        </CardHeader>

        <CardContent className="p-0">
          {sorted.length === 0 ? (
            /* ── État vide ─────────────────────────────────────── */
            <div className="flex flex-col items-center gap-2 py-16 text-center">
              <CalendarClock className="h-10 w-10 text-muted-foreground/30" aria-hidden="true" />
              <p className="text-sm font-medium">Aucun report enregistré</p>
              <p className="text-xs text-muted-foreground">
                Cliquez sur « Ajouter un report » pour enregistrer la prochaine audience.
              </p>
            </div>
          ) : (
            /* ── Tableau ───────────────────────────────────────── */
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-40 pl-6">Les Renvois</TableHead>
                    <TableHead>Les Motifs</TableHead>
                    <TableHead>Le Dispositif</TableHead>
                    {estAdmin && <TableHead className="w-24 pr-4" />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sorted.map((report, index) => (
                    <TableRow key={report._id ?? index}>
                      {/* Les Renvois — date */}
                      <TableCell className="pl-6 font-medium tabular-nums">
                        {formaterDate(report.date)}
                      </TableCell>

                      {/* Les Motifs — raison */}
                      <TableCell className="text-muted-foreground">{report.raison}</TableCell>

                      {/* Le Dispositif — jugement */}
                      <TableCell className="text-muted-foreground">
                        {report.jugement ? (
                          report.jugement
                        ) : (
                          <span className="text-muted-foreground/40">—</span>
                        )}
                      </TableCell>

                      {/* Actions : modifier + supprimer */}
                      {estAdmin && (
                        <TableCell className="pr-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-foreground"
                              onClick={() => ouvrirDialogModif(report)}
                              aria-label="Modifier ce report"
                            >
                              <Pencil className="h-4 w-4" aria-hidden="true" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              onClick={() => setReportASupprimer(report)}
                              aria-label="Supprimer ce report"
                            >
                              <Trash2 className="h-4 w-4" aria-hidden="true" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Dialog — Ajouter un report ───────────────────────────── */}
      <Dialog
        open={dialogAjoutOuvert}
        onOpenChange={(o) => {
          if (!o && !ajoutEnCours) fermerDialogAjout();
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Ajouter un report</DialogTitle>
          </DialogHeader>

          <FormulaireReport valeurs={formulaireAjout} onChange={setFormulaireAjout} />

          <DialogFooter>
            <Button variant="outline" onClick={fermerDialogAjout} disabled={ajoutEnCours}>
              Annuler
            </Button>
            <Button onClick={() => ajouter()} disabled={!peutSoumettreAjout || ajoutEnCours}>
              {ajoutEnCours ? 'Ajout...' : 'Ajouter'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog — Modifier un report ──────────────────────────── */}
      <Dialog
        open={!!reportAModifier}
        onOpenChange={(o) => {
          if (!o && !modifEnCours) fermerDialogModif();
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Modifier le report</DialogTitle>
          </DialogHeader>

          <FormulaireReport valeurs={formulaireModif} onChange={setFormulaireModif} />

          <DialogFooter>
            <Button variant="outline" onClick={fermerDialogModif} disabled={modifEnCours}>
              Annuler
            </Button>
            <Button onClick={() => modifier()} disabled={!peutSoumettreModif || modifEnCours}>
              {modifEnCours ? 'Enregistrement...' : 'Enregistrer'}
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
            <AlertDialogTitle>Supprimer ce report ?</AlertDialogTitle>
            <AlertDialogDescription>
              {reportASupprimer && (
                <>
                  Le report du <strong>{formaterDate(reportASupprimer.date)}</strong> (
                  {reportASupprimer.raison}) sera définitivement supprimé.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => supprimer()}
              disabled={suppressionEnCours}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ─── Sous-composant formulaire partagé ────────────────────────────────────────

interface FormulaireReportProps {
  valeurs: EtatFormulaire;
  onChange: (v: EtatFormulaire) => void;
}

function FormulaireReport({ valeurs, onChange }: FormulaireReportProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="report-date">Les Renvois (date) *</Label>
        <Input
          id="report-date"
          type="date"
          value={valeurs.date}
          onChange={(e) => onChange({ ...valeurs, date: e.target.value })}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="report-raison">Les Motifs *</Label>
        <Input
          id="report-raison"
          placeholder="Ex : Absence de l'avocat adverse"
          value={valeurs.raison}
          onChange={(e) => onChange({ ...valeurs, raison: e.target.value })}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="report-jugement">
          Le Dispositif <span className="text-xs text-muted-foreground">(optionnel)</span>
        </Label>
        <Textarea
          id="report-jugement"
          rows={2}
          placeholder="Ex : Renvoi au 15/06/2026 pour production de pièces"
          value={valeurs.jugement}
          onChange={(e) => onChange({ ...valeurs, jugement: e.target.value })}
        />
      </div>
    </div>
  );
}
