import { PDFDocument, rgb, StandardFonts, PDFFont, PDFPage } from 'pdf-lib';

// ─── Types internes pour la génération PDF ────────────────────────────────────

interface LigneFacture {
  description: string;
  montant: number;
}

interface DonneesFacture {
  // Infos cabinet
  nomCabinet: string;
  adresseCabinet: string;
  telephoneCabinet: string;
  emailCabinet: string;

  // Infos facture
  numeroFacture: string;
  dateEmission: Date;

  // Infos client
  nomClient: string;
  adresseClient?: string;
  telephoneClient: string;

  // Infos dossier
  referenceDossier: string;
  typeDossier: string;

  // Lignes et totaux
  lignes: LigneFacture[];
  montantTotal: number;
  totalPaye: number;
  resteAPayer: number;
  statutPaiement: 'non_paye' | 'partiel' | 'paye';
}

// ─── Utilitaires d'affichage ──────────────────────────────────────────────────

/**
 * Formate un montant en Dinars Algériens
 * ex: 150000 → "150 000,00 DA"
 */
const formaterMontant = (montant: number): string => {
  // Séparation de la partie entière et décimale
  const [entiere, decimale] = montant.toFixed(2).split('.');

  // Ajout du séparateur de milliers manuellement (espace classique U+0020)
  const entierFormatee = entiere.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

  return `${entierFormatee},${decimale} DA`;
};

/**
 * Formate une date au format algérien : 27/03/2026
 */
const formaterDate = (date: Date): string => {
  return new Intl.DateTimeFormat('fr-DZ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
};

/**
 * Dessine une ligne horizontale sur la page
 */
const dessinerLigne = (page: PDFPage, x1: number, y: number, x2: number, epaisseur = 0.5): void => {
  page.drawLine({
    start: { x: x1, y },
    end: { x: x2, y },
    thickness: epaisseur,
    color: rgb(0.8, 0.8, 0.8),
  });
};

/**
 * Dessine un rectangle de fond coloré (pour l'en-tête de tableau)
 */
const dessinerRectangle = (
  page: PDFPage,
  x: number,
  y: number,
  largeur: number,
  hauteur: number,
  couleur: [number, number, number]
): void => {
  page.drawRectangle({
    x,
    y,
    width: largeur,
    height: hauteur,
    color: rgb(...couleur),
  });
};

// ─── Génération principale du PDF ─────────────────────────────────────────────

/**
 * Génère une facture PDF professionnelle et retourne un Buffer.
 * Utilisé côté backend uniquement (pdf-lib).
 * Format A4, orientation portrait.
 */
export const genererFacturePDF = async (donnees: DonneesFacture): Promise<Buffer> => {
  const pdfDoc = await PDFDocument.create();

  // Métadonnées du document
  pdfDoc.setTitle(`Facture ${donnees.numeroFacture}`);
  pdfDoc.setAuthor(donnees.nomCabinet);
  pdfDoc.setCreationDate(new Date());

  const page = pdfDoc.addPage([595, 842]); // Format A4 en points

  // Chargement des polices standard (pas de dépendance externe)
  const policeNormale: PDFFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const policeBold: PDFFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const { width, height } = page.getSize();
  const margeGauche = 50;
  const margeDroite = width - 50;
  let curseurY = height - 50; // Curseur vertical (de haut en bas)

  // ── Bande d'en-tête ─────────────────────────────────────────────────────────
  dessinerRectangle(page, 0, height - 100, width, 100, [0.13, 0.24, 0.44]);

  // Nom du cabinet en blanc
  page.drawText(donnees.nomCabinet.toUpperCase(), {
    x: margeGauche,
    y: height - 45,
    size: 16,
    font: policeBold,
    color: rgb(1, 1, 1),
  });

  // Sous-titre cabinet
  page.drawText("Cabinet d'Avocat", {
    x: margeGauche,
    y: height - 65,
    size: 10,
    font: policeNormale,
    color: rgb(0.8, 0.9, 1),
  });

  // Numéro de facture (aligné à droite) dans la bande
  page.drawText(`FACTURE N° ${donnees.numeroFacture}`, {
    x: margeDroite - 180,
    y: height - 45,
    size: 14,
    font: policeBold,
    color: rgb(1, 1, 1),
  });

  page.drawText(`Date : ${formaterDate(donnees.dateEmission)}`, {
    x: margeDroite - 180,
    y: height - 65,
    size: 10,
    font: policeNormale,
    color: rgb(0.8, 0.9, 1),
  });

  curseurY = height - 120;

  // ── Bloc cabinet + client côte à côte ─────────────────────────────────────
  // Colonne gauche — infos cabinet
  page.drawText('DE :', {
    x: margeGauche,
    y: curseurY,
    size: 9,
    font: policeBold,
    color: rgb(0.5, 0.5, 0.5),
  });

  curseurY -= 15;
  page.drawText(donnees.nomCabinet, {
    x: margeGauche,
    y: curseurY,
    size: 10,
    font: policeBold,
    color: rgb(0.1, 0.1, 0.1),
  });

  curseurY -= 14;
  page.drawText(donnees.adresseCabinet, {
    x: margeGauche,
    y: curseurY,
    size: 9,
    font: policeNormale,
    color: rgb(0.3, 0.3, 0.3),
  });

  curseurY -= 14;
  page.drawText(`Tél : ${donnees.telephoneCabinet}`, {
    x: margeGauche,
    y: curseurY,
    size: 9,
    font: policeNormale,
    color: rgb(0.3, 0.3, 0.3),
  });

  curseurY -= 14;
  page.drawText(donnees.emailCabinet, {
    x: margeGauche,
    y: curseurY,
    size: 9,
    font: policeNormale,
    color: rgb(0.3, 0.3, 0.3),
  });

  // Colonne droite — infos client
  const colonneClient = 320;
  let curseurYClient = height - 120;

  page.drawText('FACTURÉ À :', {
    x: colonneClient,
    y: curseurYClient,
    size: 9,
    font: policeBold,
    color: rgb(0.5, 0.5, 0.5),
  });

  curseurYClient -= 15;
  page.drawText(donnees.nomClient, {
    x: colonneClient,
    y: curseurYClient,
    size: 10,
    font: policeBold,
    color: rgb(0.1, 0.1, 0.1),
  });

  curseurYClient -= 14;
  page.drawText(`Tél : ${donnees.telephoneClient}`, {
    x: colonneClient,
    y: curseurYClient,
    size: 9,
    font: policeNormale,
    color: rgb(0.3, 0.3, 0.3),
  });

  if (donnees.adresseClient) {
    curseurYClient -= 14;
    page.drawText(donnees.adresseClient, {
      x: colonneClient,
      y: curseurYClient,
      size: 9,
      font: policeNormale,
      color: rgb(0.3, 0.3, 0.3),
    });
  }

  // Référence dossier sous le bloc client
  curseurYClient -= 14;
  page.drawText(`Dossier : ${donnees.referenceDossier} — ${donnees.typeDossier}`, {
    x: colonneClient,
    y: curseurYClient,
    size: 9,
    font: policeNormale,
    color: rgb(0.3, 0.3, 0.3),
  });

  // Descendre le curseur au plus bas des deux colonnes
  curseurY = Math.min(curseurY, curseurYClient) - 25;
  dessinerLigne(page, margeGauche, curseurY, margeDroite, 1);
  curseurY -= 20;

  // ── En-tête du tableau des prestations ────────────────────────────────────
  dessinerRectangle(
    page,
    margeGauche,
    curseurY - 6,
    margeDroite - margeGauche,
    22,
    [0.13, 0.24, 0.44]
  );

  page.drawText('DESCRIPTION DES PRESTATIONS', {
    x: margeGauche + 10,
    y: curseurY,
    size: 9,
    font: policeBold,
    color: rgb(1, 1, 1),
  });

  page.drawText('MONTANT', {
    x: margeDroite - 80,
    y: curseurY,
    size: 9,
    font: policeBold,
    color: rgb(1, 1, 1),
  });

  curseurY -= 25;

  // ── Lignes du tableau ──────────────────────────────────────────────────────
  donnees.lignes.forEach((ligne, index) => {
    // Fond alterné pour la lisibilité
    if (index % 2 === 0) {
      dessinerRectangle(
        page,
        margeGauche,
        curseurY - 6,
        margeDroite - margeGauche,
        20,
        [0.96, 0.97, 0.99]
      );
    }

    page.drawText(ligne.description, {
      x: margeGauche + 10,
      y: curseurY,
      size: 9,
      font: policeNormale,
      color: rgb(0.2, 0.2, 0.2),
    });

    const montantTexte = formaterMontant(ligne.montant);
    const largeurMontant = policeNormale.widthOfTextAtSize(montantTexte, 9);

    page.drawText(montantTexte, {
      x: margeDroite - largeurMontant - 5,
      y: curseurY,
      size: 9,
      font: policeNormale,
      color: rgb(0.2, 0.2, 0.2),
    });

    curseurY -= 22;
    dessinerLigne(page, margeGauche, curseurY + 8, margeDroite);
  });

  curseurY -= 20;

  // ── Bloc récapitulatif financier ───────────────────────────────────────────
  const xRecap = 380;
  const largeurRecap = margeDroite - xRecap;

  // Fond du bloc récap
  dessinerRectangle(page, xRecap - 10, curseurY - 80, largeurRecap + 10, 95, [0.95, 0.97, 1]);

  // Total honoraires
  page.drawText('Total honoraires :', {
    x: xRecap,
    y: curseurY,
    size: 9,
    font: policeNormale,
    color: rgb(0.3, 0.3, 0.3),
  });
  const txtTotal = formaterMontant(donnees.montantTotal);
  page.drawText(txtTotal, {
    x: margeDroite - policeNormale.widthOfTextAtSize(txtTotal, 9) - 5,
    y: curseurY,
    size: 9,
    font: policeNormale,
    color: rgb(0.2, 0.2, 0.2),
  });

  curseurY -= 18;

  // Total payé
  page.drawText('Déjà réglé :', {
    x: xRecap,
    y: curseurY,
    size: 9,
    font: policeNormale,
    color: rgb(0.3, 0.3, 0.3),
  });
  const txtPaye = formaterMontant(donnees.totalPaye);
  page.drawText(txtPaye, {
    x: margeDroite - policeNormale.widthOfTextAtSize(txtPaye, 9) - 5,
    y: curseurY,
    size: 9,
    font: policeNormale,
    color: rgb(0.1, 0.6, 0.1),
  });

  curseurY -= 3;
  dessinerLigne(page, xRecap - 10, curseurY, margeDroite, 1);
  curseurY -= 15;

  // Reste à payer (mis en valeur)
  dessinerRectangle(page, xRecap - 10, curseurY - 8, largeurRecap + 10, 24, [0.13, 0.24, 0.44]);

  page.drawText('RESTE À PAYER :', {
    x: xRecap,
    y: curseurY,
    size: 10,
    font: policeBold,
    color: rgb(1, 1, 1),
  });
  const txtReste = formaterMontant(donnees.resteAPayer);
  page.drawText(txtReste, {
    x: margeDroite - policeBold.widthOfTextAtSize(txtReste, 10) - 5,
    y: curseurY,
    size: 10,
    font: policeBold,
    color: rgb(1, 1, 1),
  });

  curseurY -= 35;

  // Badge statut de paiement
  const badgeTextes = {
    non_paye: 'NON RÉGLÉE',
    partiel: 'PARTIELLEMENT RÉGLÉE',
    paye: 'ENTIÈREMENT RÉGLÉE',
  };
  const badgeCouleurs: Record<string, [number, number, number]> = {
    non_paye: [0.9, 0.2, 0.2],
    partiel: [0.9, 0.6, 0.1],
    paye: [0.1, 0.6, 0.2],
  };

  const badgeTexte = badgeTextes[donnees.statutPaiement];
  const badgeCouleur = badgeCouleurs[donnees.statutPaiement];
  dessinerRectangle(page, xRecap - 10, curseurY - 8, largeurRecap + 10, 22, badgeCouleur);

  const largeurBadge = policeBold.widthOfTextAtSize(badgeTexte, 9);
  page.drawText(badgeTexte, {
    x: xRecap + (largeurRecap - largeurBadge) / 2,
    y: curseurY,
    size: 9,
    font: policeBold,
    color: rgb(1, 1, 1),
  });

  // ── Modes de paiement acceptés ─────────────────────────────────────────────
  curseurY -= 60;
  dessinerLigne(page, margeGauche, curseurY + 10, margeDroite, 1);

  page.drawText('Modes de règlement acceptés :', {
    x: margeGauche,
    y: curseurY,
    size: 9,
    font: policeBold,
    color: rgb(0.3, 0.3, 0.3),
  });

  curseurY -= 14;
  page.drawText('• Espèces (Cash)   • Virement bancaire   • CCP', {
    x: margeGauche,
    y: curseurY,
    size: 9,
    font: policeNormale,
    color: rgb(0.4, 0.4, 0.4),
  });

  // ── Pied de page ───────────────────────────────────────────────────────────
  dessinerLigne(page, margeGauche, 60, margeDroite, 1);
  page.drawText(
    `${donnees.nomCabinet}  —  ${donnees.adresseCabinet}  —  ${donnees.telephoneCabinet}`,
    {
      x: margeGauche,
      y: 45,
      size: 7,
      font: policeNormale,
      color: rgb(0.6, 0.6, 0.6),
    }
  );

  page.drawText(`Document généré le ${formaterDate(new Date())} — ERP Cabinet Avocat`, {
    x: margeGauche,
    y: 32,
    size: 7,
    font: policeNormale,
    color: rgb(0.7, 0.7, 0.7),
  });

  // Numéro de page
  page.drawText('Page 1 / 1', {
    x: margeDroite - 40,
    y: 32,
    size: 7,
    font: policeNormale,
    color: rgb(0.7, 0.7, 0.7),
  });

  // Sérialisation et retour Buffer
  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
};

// Export du type pour le contrôleur
export type { DonneesFacture };
