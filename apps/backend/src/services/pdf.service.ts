import { PDFDocument, rgb, StandardFonts, PDFFont, PDFPage } from 'pdf-lib';


// ─── Types ────────────────────────────────────────────────────────────────────


interface LigneFacture {
  description: string;
  montant: number;
}


export interface DonneesFacture {
  // Infos cabinet
  nomCabinet: string;
  titreCabinet?: string;        // ex: "Avocat" — affiché sous le nom
  adresseCabinet: string;
  villeCabinet?: string;        // ex: "Skikda" — affiché avec la date
  telephoneCabinet: string;
  faxCabinet?: string;          // affiché sur la même ligne que le tél
  emailCabinet: string;
  numeroFiscal?: string;        // Numéro fiscal / الرقم الجبائي
  rib?: string;                 // RIB bancaire

  // Infos facture
  numeroFacture: string;        // رقم المذكرة
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

  // TVA (optionnel — 0 = pas de ligne TVA)
  tauxTva?: number;
}


// ─── Utilitaires ──────────────────────────────────────────────────────────────


/**
 * Formate un montant en Dinars Algériens.
 * N'utilise PAS Intl.NumberFormat (incompatible WinAnsi pdf-lib → crash U+202F).
 * Résultat : "30 000,00 DA"
 */
const formaterMontant = (montant: number): string => {
  const [entiere, decimale] = montant.toFixed(2).split('.');
  const entierFormatee = entiere.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${entierFormatee},${decimale} DA`;
};


/**
 * Formate une date au format YYYY/MM/DD (comme dans la facture exemple).
 * N'utilise PAS Intl.DateTimeFormat (risque U+202F sur certains OS).
 */
const formaterDate = (date: Date): string => {
  const annee = date.getFullYear();
  const mois = String(date.getMonth() + 1).padStart(2, '0');
  const jour = String(date.getDate()).padStart(2, '0');
  return `${annee}/${mois}/${jour}`;
};


/**
 * Convertit un montant entier en lettres françaises.
 * Couvre jusqu'à 9 999 999 DA.
 */
const montantEnLettres = (montant: number): string => {
  const unites = [
    '', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf',
    'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize',
    'dix-sept', 'dix-huit', 'dix-neuf',
  ];
  const dizaines = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante', 'quatre-vingt', 'quatre-vingt'];

  const convertirInf100 = (n: number): string => {
    if (n < 20) return unites[n];
    const d = Math.floor(n / 10);
    const u = n % 10;
    if (d === 7) return `soixante-${unites[10 + u]}`;
    if (d === 9) return u === 0 ? 'quatre-vingt-dix' : `quatre-vingt-${unites[10 + u]}`;
    if (d === 8) return u === 0 ? 'quatre-vingts' : `quatre-vingt-${unites[u]}`;
    return u === 0 ? dizaines[d] : u === 1 ? `${dizaines[d]}-et-un` : `${dizaines[d]}-${unites[u]}`;
  };

  const convertirInf1000 = (n: number): string => {
    if (n < 100) return convertirInf100(n);
    const c = Math.floor(n / 100);
    const r = n % 100;
    const cent = c === 1 ? 'cent' : `${unites[c]}-cent${r === 0 ? 's' : ''}`;
    return r === 0 ? cent : `${cent}-${convertirInf100(r)}`;
  };

  const entier = Math.floor(montant);
  if (entier === 0) return 'zero dinar algerien';

  let res = '';
  if (entier >= 1000000) {
    const m = Math.floor(entier / 1000000);
    const r = entier % 1000000;
    res += m === 1 ? 'un-million' : `${convertirInf1000(m)}-millions`;
    if (r > 0) res += `-${convertirInf1000(r)}`;
  } else if (entier >= 1000) {
    const k = Math.floor(entier / 1000);
    const r = entier % 1000;
    res += k === 1 ? 'mille' : `${convertirInf1000(k)}-mille`;
    if (r > 0) res += `-${convertirInf1000(r)}`;
  } else {
    res = convertirInf1000(entier);
  }

  res = res.replace(/-/g, ' ');
  res = res.charAt(0).toUpperCase() + res.slice(1);
  return `${res} dinar${entier > 1 ? 's' : ''} algerien${entier > 1 ? 's' : ''}.`;
};


/**
 * Dessine des points de remplissage entre deux positions X sur la même ligne.
 */
const dessinerPointilles = (
  page: PDFPage,
  police: PDFFont,
  xDebut: number,
  xFin: number,
  y: number,
  taille: number,
): void => {
  const largeurPoint = police.widthOfTextAtSize('.', taille);
  const nombre = Math.floor((xFin - xDebut) / largeurPoint);
  if (nombre <= 0) return;
  page.drawText('.'.repeat(nombre), {
    x: xDebut,
    y,
    size: taille,
    font: police,
    color: rgb(0.5, 0.5, 0.5),
  });
};


/**
 * Écrit un texte aligné à droite par rapport à une position X de référence.
 */
const drawTextRight = (
  page: PDFPage,
  texte: string,
  xDroit: number,
  y: number,
  taille: number,
  police: PDFFont,
  couleur: [number, number, number] = [0, 0, 0],
): void => {
  const largeur = police.widthOfTextAtSize(texte, taille);
  page.drawText(texte, {
    x: xDroit - largeur,
    y,
    size: taille,
    font: police,
    color: rgb(...couleur),
  });
};


// ─── Génération principale ────────────────────────────────────────────────────


export const genererFacturePDF = async (donnees: DonneesFacture): Promise<Buffer> => {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.setTitle(`Memoire honoraires ${donnees.numeroFacture}`);
  pdfDoc.setAuthor(donnees.nomCabinet);
  pdfDoc.setCreationDate(new Date());

  const page = pdfDoc.addPage([595, 842]); // A4
  const policeN: PDFFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const policeB: PDFFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const { width, height } = page.getSize();

  const margeG = 50;
  const margeD = width - 50;
  let y = height - 50;


  // ══════════════════════════════════════════════════════════════════════════
  // SECTION 1 — EN-TÊTE : ville+date à gauche | infos cabinet à droite
  // ══════════════════════════════════════════════════════════════════════════

  // Ville + Date (colonne gauche, en gras comme dans l'exemple)
  const ville = donnees.villeCabinet ?? '';
  const dateTexte = ville
    ? `${ville} le : ${formaterDate(donnees.dateEmission)}`
    : `le : ${formaterDate(donnees.dateEmission)}`;

  page.drawText(dateTexte, {
    x: margeG,
    y,
    size: 10,
    font: policeB,
    color: rgb(0, 0, 0),
  });

  // Colonne droite — infos cabinet (alignées à droite)
  let yCabinet = y;

  // Nom cabinet
  drawTextRight(page, donnees.nomCabinet, margeD, yCabinet, 11, policeB);
  yCabinet -= 16;

  // Titre (Avocat)
  const titre = donnees.titreCabinet ?? 'Avocat';
  drawTextRight(page, titre, margeD, yCabinet, 10, policeN);
  yCabinet -= 16;

  // Adresse
  drawTextRight(page, donnees.adresseCabinet, margeD, yCabinet, 9, policeN);
  yCabinet -= 14;

  // Téléphone / Fax
  const telFax = donnees.faxCabinet
    ? `Tel / Fax : ${donnees.telephoneCabinet} / ${donnees.faxCabinet}`
    : `Tel : ${donnees.telephoneCabinet}`;
  drawTextRight(page, telFax, margeD, yCabinet, 9, policeN);
  yCabinet -= 14;

  // Numéro fiscal (en gras comme dans l'exemple)
  if (donnees.numeroFiscal) {
    const txtFiscal = `Num. Fiscal : ${donnees.numeroFiscal}`;
    drawTextRight(page, txtFiscal, margeD, yCabinet, 9, policeB);
    yCabinet -= 14;
  }

  // RIB (en gras comme dans l'exemple)
  if (donnees.rib) {
    const txtRib = `RIB : ${donnees.rib}`;
    drawTextRight(page, txtRib, margeD, yCabinet, 9, policeB);
    yCabinet -= 14;
  }

  // Numéro de mémoire (رقم المذكرة) en gras
  const txtRef = `Ref. N : ${donnees.numeroFacture}`;
  drawTextRight(page, txtRef, margeD, yCabinet, 9, policeB);
  yCabinet -= 14;

  // Descendre au-dessous du bloc le plus long
  y = Math.min(y - 14, yCabinet) - 20;


  // ── Séparateur fin ─────────────────────────────────────────────────────────
  page.drawLine({
    start: { x: margeG, y },
    end: { x: margeD, y },
    thickness: 0.5,
    color: rgb(0.7, 0.7, 0.7),
  });
  y -= 28;


  // ══════════════════════════════════════════════════════════════════════════
  // SECTION 2 — TITRE "Memoire d'honoraires //" (centré + souligné)
  // ══════════════════════════════════════════════════════════════════════════

  const titrePrincipal = `Memoire d'honoraires // ${donnees.numeroFacture}`;
  const largeurTitre = policeB.widthOfTextAtSize(titrePrincipal, 14);
  const xTitre = (width - largeurTitre) / 2;

  page.drawText(titrePrincipal, {
    x: xTitre,
    y,
    size: 14,
    font: policeB,
    color: rgb(0, 0, 0),
  });

  // Soulignement manuel (trait noir sous le texte)
  page.drawLine({
    start: { x: xTitre, y: y - 3 },
    end: { x: xTitre + largeurTitre, y: y - 3 },
    thickness: 1,
    color: rgb(0, 0, 0),
  });
  y -= 38;


  // ══════════════════════════════════════════════════════════════════════════
  // SECTION 3 — PARAGRAPHE INTRODUCTIF "En [client] — [adresse] — sur :"
  // ══════════════════════════════════════════════════════════════════════════

  page.drawText(`En ${donnees.nomClient}`, {
    x: margeG,
    y,
    size: 11,
    font: policeN,
    color: rgb(0, 0, 0),
  });
  y -= 18;

  if (donnees.adresseClient) {
    page.drawText(`${donnees.adresseClient}, sur :`, {
      x: margeG,
      y,
      size: 11,
      font: policeN,
      color: rgb(0, 0, 0),
    });
  } else {
    page.drawText('sur :', {
      x: margeG,
      y,
      size: 11,
      font: policeN,
      color: rgb(0, 0, 0),
    });
  }
  y -= 28;


  // ══════════════════════════════════════════════════════════════════════════
  // SECTION 4 — LIGNES DE PRESTATIONS avec points de remplissage
  // ══════════════════════════════════════════════════════════════════════════

  const xMontantDroit = margeD - 10; // alignement droit des montants

  for (const ligne of donnees.lignes) {
    const label = `- ${ligne.description} :`;
    const montantTexte = formaterMontant(ligne.montant);

    // Label à gauche
    page.drawText(label, {
      x: margeG + 10,
      y,
      size: 11,
      font: policeN,
      color: rgb(0, 0, 0),
    });

    // Montant aligné à droite
    drawTextRight(page, montantTexte, xMontantDroit, y, 11, policeN);

    // Points de remplissage entre label et montant
    const xFinLabel = margeG + 10 + policeN.widthOfTextAtSize(label, 11) + 4;
    const xDebutMontant = xMontantDroit - policeN.widthOfTextAtSize(montantTexte, 11) - 4;
    dessinerPointilles(page, policeN, xFinLabel, xDebutMontant, y, 11);

    y -= 22;
  }


  // ── Ligne TVA (si tauxTva > 0) ─────────────────────────────────────────────
  const tauxTva = donnees.tauxTva ?? 0;
  let montantTva = 0;

  if (tauxTva > 0) {
    const baseHt = donnees.lignes.reduce((s, l) => s + l.montant, 0);
    montantTva = Math.round(baseHt * tauxTva) / 100;
    const labelTva = `- Taxe sur la Valeur Ajoutee ${tauxTva}% :`;
    const montantTvaTexte = formaterMontant(montantTva);

    page.drawText(labelTva, {
      x: margeG + 10,
      y,
      size: 11,
      font: policeN,
      color: rgb(0, 0, 0),
    });

    drawTextRight(page, montantTvaTexte, xMontantDroit, y, 11, policeN);

    const xFinTva = margeG + 10 + policeN.widthOfTextAtSize(labelTva, 11) + 4;
    const xDebutTva = xMontantDroit - policeN.widthOfTextAtSize(montantTvaTexte, 11) - 4;
    dessinerPointilles(page, policeN, xFinTva, xDebutTva, y, 11);

    y -= 22;
  }


  // ── Ligne TOTAL (المجموع) en gras ──────────────────────────────────────────
  const baseTotal = donnees.lignes.reduce((s, l) => s + l.montant, 0);
  const montantTotalFacture = Math.round(baseTotal + montantTva);
  const labelTotal = '- Total :';
  const montantTotalTexte = formaterMontant(montantTotalFacture);

  page.drawText(labelTotal, {
    x: margeG + 10,
    y,
    size: 11,
    font: policeB,
    color: rgb(0, 0, 0),
  });

  drawTextRight(page, montantTotalTexte, xMontantDroit, y, 11, policeB);

  const xFinTotal = margeG + 10 + policeB.widthOfTextAtSize(labelTotal, 11) + 4;
  const xDebutTotal = xMontantDroit - policeB.widthOfTextAtSize(montantTotalTexte, 11) - 4;
  dessinerPointilles(page, policeN, xFinTotal, xDebutTotal, y, 11);

  y -= 38;


  // ══════════════════════════════════════════════════════════════════════════
  // SECTION 5 — MONTANT EN LETTRES
  // ══════════════════════════════════════════════════════════════════════════

  const lettres = montantEnLettres(montantTotalFacture);
  const texteLettre = `Soit : ${lettres}`;

  // Gestion du retour à la ligne si texte trop long (>80 chars à 10pt)
  const maxChars = 80;
  const mots = texteLettre.split(' ');
  let ligneCourante = '';

  for (const mot of mots) {
    const test = ligneCourante ? `${ligneCourante} ${mot}` : mot;
    if (test.length > maxChars && ligneCourante) {
      page.drawText(ligneCourante, {
        x: margeG + 15,
        y,
        size: 10,
        font: policeN,
        color: rgb(0, 0, 0),
      });
      y -= 16;
      ligneCourante = mot;
    } else {
      ligneCourante = test;
    }
  }
  if (ligneCourante) {
    page.drawText(ligneCourante, {
      x: margeG + 15,
      y,
      size: 10,
      font: policeN,
      color: rgb(0, 0, 0),
    });
    y -= 16;
  }

  y -= 30;


  // ══════════════════════════════════════════════════════════════════════════
  // SECTION 6 — RÉCAPITULATIF FINANCIER (état du dossier)
  // Affiché seulement si il y a des paiements enregistrés ou reste à payer
  // ══════════════════════════════════════════════════════════════════════════

  if (donnees.montantTotal > 0) {
    // Ligne séparatrice légère
    page.drawLine({
      start: { x: margeG, y: y + 5 },
      end: { x: margeD, y: y + 5 },
      thickness: 0.5,
      color: rgb(0.8, 0.8, 0.8),
    });

    page.drawText('Etat du dossier :', {
      x: margeG,
      y,
      size: 9,
      font: policeB,
      color: rgb(0.4, 0.4, 0.4),
    });
    y -= 16;

    // Total honoraires
    const txtTotalH = `Honoraires totaux : ${formaterMontant(donnees.montantTotal)}`;
    page.drawText(txtTotalH, {
      x: margeG + 10,
      y,
      size: 9,
      font: policeN,
      color: rgb(0.3, 0.3, 0.3),
    });
    y -= 14;

    // Déjà réglé
    const txtPaye = `Deja regle : ${formaterMontant(donnees.totalPaye)}`;
    page.drawText(txtPaye, {
      x: margeG + 10,
      y,
      size: 9,
      font: policeN,
      color: rgb(0.1, 0.55, 0.1),
    });
    y -= 14;

    // Reste à payer
    const txtReste = `Reste a payer : ${formaterMontant(donnees.resteAPayer)}`;
    page.drawText(txtReste, {
      x: margeG + 10,
      y,
      size: 9,
      font: donnees.resteAPayer > 0 ? policeB : policeN,
      color: donnees.resteAPayer > 0 ? rgb(0.8, 0.2, 0.1) : rgb(0.1, 0.55, 0.1),
    });
    y -= 20;
  }


  // ══════════════════════════════════════════════════════════════════════════
  // SECTION 7 — PIED DE PAGE
  // ══════════════════════════════════════════════════════════════════════════

  page.drawLine({
    start: { x: margeG, y: 55 },
    end: { x: margeD, y: 55 },
    thickness: 0.5,
    color: rgb(0.7, 0.7, 0.7),
  });

  const piedTexte = `${donnees.nomCabinet}  -  ${donnees.adresseCabinet}  -  Tel: ${donnees.telephoneCabinet}`;
  page.drawText(piedTexte, {
    x: margeG,
    y: 40,
    size: 7,
    font: policeN,
    color: rgb(0.5, 0.5, 0.5),
  });

  const dateGen = `Document genere le ${formaterDate(new Date())} - ERP Cabinet Avocat`;
  const largeurDateGen = policeN.widthOfTextAtSize(dateGen, 7);
  page.drawText(dateGen, {
    x: margeD - largeurDateGen,
    y: 40,
    size: 7,
    font: policeN,
    color: rgb(0.6, 0.6, 0.6),
  });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
};


// Export du type pour le contrôleur
// export type { DonneesFacture };








// import { PDFDocument, rgb, StandardFonts, PDFFont, PDFPage } from 'pdf-lib';

// // ─── Types internes pour la génération PDF ────────────────────────────────────

// interface LigneFacture {
//   description: string;
//   montant: number;
// }

// interface DonneesFacture {
//   // Infos cabinet
//   nomCabinet: string;
//   adresseCabinet: string;
//   telephoneCabinet: string;
//   emailCabinet: string;

//   // Infos facture
//   numeroFacture: string;
//   dateEmission: Date;

//   // Infos client
//   nomClient: string;
//   adresseClient?: string;
//   telephoneClient: string;

//   // Infos dossier
//   referenceDossier: string;
//   typeDossier: string;

//   // Lignes et totaux
//   lignes: LigneFacture[];
//   montantTotal: number;
//   totalPaye: number;
//   resteAPayer: number;
//   statutPaiement: 'non_paye' | 'partiel' | 'paye';
// }

// // ─── Utilitaires d'affichage ──────────────────────────────────────────────────

// /**
//  * Formate un montant en Dinars Algériens
//  * ex: 150000 → "150 000,00 DA"
//  */
// const formaterMontant = (montant: number): string => {
//   // Séparation de la partie entière et décimale
//   const [entiere, decimale] = montant.toFixed(2).split('.');

//   // Ajout du séparateur de milliers manuellement (espace classique U+0020)
//   const entierFormatee = entiere.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

//   return `${entierFormatee},${decimale} DA`;
// };

// /**
//  * Formate une date au format algérien : 27/03/2026
//  */
// const formaterDate = (date: Date): string => {
//   return new Intl.DateTimeFormat('fr-DZ', {
//     day: '2-digit',
//     month: '2-digit',
//     year: 'numeric',
//   }).format(date);
// };

// /**
//  * Dessine une ligne horizontale sur la page
//  */
// const dessinerLigne = (page: PDFPage, x1: number, y: number, x2: number, epaisseur = 0.5): void => {
//   page.drawLine({
//     start: { x: x1, y },
//     end: { x: x2, y },
//     thickness: epaisseur,
//     color: rgb(0.8, 0.8, 0.8),
//   });
// };

// /**
//  * Dessine un rectangle de fond coloré (pour l'en-tête de tableau)
//  */
// const dessinerRectangle = (
//   page: PDFPage,
//   x: number,
//   y: number,
//   largeur: number,
//   hauteur: number,
//   couleur: [number, number, number]
// ): void => {
//   page.drawRectangle({
//     x,
//     y,
//     width: largeur,
//     height: hauteur,
//     color: rgb(...couleur),
//   });
// };

// // ─── Génération principale du PDF ─────────────────────────────────────────────

// /**
//  * Génère une facture PDF professionnelle et retourne un Buffer.
//  * Utilisé côté backend uniquement (pdf-lib).
//  * Format A4, orientation portrait.
//  */
// export const genererFacturePDF = async (donnees: DonneesFacture): Promise<Buffer> => {
//   const pdfDoc = await PDFDocument.create();

//   // Métadonnées du document
//   pdfDoc.setTitle(`Facture ${donnees.numeroFacture}`);
//   pdfDoc.setAuthor(donnees.nomCabinet);
//   pdfDoc.setCreationDate(new Date());

//   const page = pdfDoc.addPage([595, 842]); // Format A4 en points

//   // Chargement des polices standard (pas de dépendance externe)
//   const policeNormale: PDFFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
//   const policeBold: PDFFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

//   const { width, height } = page.getSize();
//   const margeGauche = 50;
//   const margeDroite = width - 50;
//   let curseurY = height - 50; // Curseur vertical (de haut en bas)

//   // ── Bande d'en-tête ─────────────────────────────────────────────────────────
//   dessinerRectangle(page, 0, height - 100, width, 100, [0.13, 0.24, 0.44]);

//   // Nom du cabinet en blanc
//   page.drawText(donnees.nomCabinet.toUpperCase(), {
//     x: margeGauche,
//     y: height - 45,
//     size: 16,
//     font: policeBold,
//     color: rgb(1, 1, 1),
//   });

//   // Sous-titre cabinet
//   page.drawText("Cabinet d'Avocat", {
//     x: margeGauche,
//     y: height - 65,
//     size: 10,
//     font: policeNormale,
//     color: rgb(0.8, 0.9, 1),
//   });

//   // Numéro de facture (aligné à droite) dans la bande
//   page.drawText(`FACTURE N° ${donnees.numeroFacture}`, {
//     x: margeDroite - 180,
//     y: height - 45,
//     size: 14,
//     font: policeBold,
//     color: rgb(1, 1, 1),
//   });

//   page.drawText(`Date : ${formaterDate(donnees.dateEmission)}`, {
//     x: margeDroite - 180,
//     y: height - 65,
//     size: 10,
//     font: policeNormale,
//     color: rgb(0.8, 0.9, 1),
//   });

//   curseurY = height - 120;

//   // ── Bloc cabinet + client côte à côte ─────────────────────────────────────
//   // Colonne gauche — infos cabinet
//   page.drawText('DE :', {
//     x: margeGauche,
//     y: curseurY,
//     size: 9,
//     font: policeBold,
//     color: rgb(0.5, 0.5, 0.5),
//   });

//   curseurY -= 15;
//   page.drawText(donnees.nomCabinet, {
//     x: margeGauche,
//     y: curseurY,
//     size: 10,
//     font: policeBold,
//     color: rgb(0.1, 0.1, 0.1),
//   });

//   curseurY -= 14;
//   page.drawText(donnees.adresseCabinet, {
//     x: margeGauche,
//     y: curseurY,
//     size: 9,
//     font: policeNormale,
//     color: rgb(0.3, 0.3, 0.3),
//   });

//   curseurY -= 14;
//   page.drawText(`Tél : ${donnees.telephoneCabinet}`, {
//     x: margeGauche,
//     y: curseurY,
//     size: 9,
//     font: policeNormale,
//     color: rgb(0.3, 0.3, 0.3),
//   });

//   curseurY -= 14;
//   page.drawText(donnees.emailCabinet, {
//     x: margeGauche,
//     y: curseurY,
//     size: 9,
//     font: policeNormale,
//     color: rgb(0.3, 0.3, 0.3),
//   });

//   // Colonne droite — infos client
//   const colonneClient = 320;
//   let curseurYClient = height - 120;

//   page.drawText('FACTURÉ À :', {
//     x: colonneClient,
//     y: curseurYClient,
//     size: 9,
//     font: policeBold,
//     color: rgb(0.5, 0.5, 0.5),
//   });

//   curseurYClient -= 15;
//   page.drawText(donnees.nomClient, {
//     x: colonneClient,
//     y: curseurYClient,
//     size: 10,
//     font: policeBold,
//     color: rgb(0.1, 0.1, 0.1),
//   });

//   curseurYClient -= 14;
//   page.drawText(`Tél : ${donnees.telephoneClient}`, {
//     x: colonneClient,
//     y: curseurYClient,
//     size: 9,
//     font: policeNormale,
//     color: rgb(0.3, 0.3, 0.3),
//   });

//   if (donnees.adresseClient) {
//     curseurYClient -= 14;
//     page.drawText(donnees.adresseClient, {
//       x: colonneClient,
//       y: curseurYClient,
//       size: 9,
//       font: policeNormale,
//       color: rgb(0.3, 0.3, 0.3),
//     });
//   }

//   // Référence dossier sous le bloc client
//   curseurYClient -= 14;
//   page.drawText(`Dossier : ${donnees.referenceDossier} — ${donnees.typeDossier}`, {
//     x: colonneClient,
//     y: curseurYClient,
//     size: 9,
//     font: policeNormale,
//     color: rgb(0.3, 0.3, 0.3),
//   });

//   // Descendre le curseur au plus bas des deux colonnes
//   curseurY = Math.min(curseurY, curseurYClient) - 25;
//   dessinerLigne(page, margeGauche, curseurY, margeDroite, 1);
//   curseurY -= 20;

//   // ── En-tête du tableau des prestations ────────────────────────────────────
//   dessinerRectangle(
//     page,
//     margeGauche,
//     curseurY - 6,
//     margeDroite - margeGauche,
//     22,
//     [0.13, 0.24, 0.44]
//   );

//   page.drawText('DESCRIPTION DES PRESTATIONS', {
//     x: margeGauche + 10,
//     y: curseurY,
//     size: 9,
//     font: policeBold,
//     color: rgb(1, 1, 1),
//   });

//   page.drawText('MONTANT', {
//     x: margeDroite - 80,
//     y: curseurY,
//     size: 9,
//     font: policeBold,
//     color: rgb(1, 1, 1),
//   });

//   curseurY -= 25;

//   // ── Lignes du tableau ──────────────────────────────────────────────────────
//   donnees.lignes.forEach((ligne, index) => {
//     // Fond alterné pour la lisibilité
//     if (index % 2 === 0) {
//       dessinerRectangle(
//         page,
//         margeGauche,
//         curseurY - 6,
//         margeDroite - margeGauche,
//         20,
//         [0.96, 0.97, 0.99]
//       );
//     }

//     page.drawText(ligne.description, {
//       x: margeGauche + 10,
//       y: curseurY,
//       size: 9,
//       font: policeNormale,
//       color: rgb(0.2, 0.2, 0.2),
//     });

//     const montantTexte = formaterMontant(ligne.montant);
//     const largeurMontant = policeNormale.widthOfTextAtSize(montantTexte, 9);

//     page.drawText(montantTexte, {
//       x: margeDroite - largeurMontant - 5,
//       y: curseurY,
//       size: 9,
//       font: policeNormale,
//       color: rgb(0.2, 0.2, 0.2),
//     });

//     curseurY -= 22;
//     dessinerLigne(page, margeGauche, curseurY + 8, margeDroite);
//   });

//   curseurY -= 20;

//   // ── Bloc récapitulatif financier ───────────────────────────────────────────
//   const xRecap = 380;
//   const largeurRecap = margeDroite - xRecap;

//   // Fond du bloc récap
//   dessinerRectangle(page, xRecap - 10, curseurY - 80, largeurRecap + 10, 95, [0.95, 0.97, 1]);

//   // Total honoraires
//   page.drawText('Total honoraires :', {
//     x: xRecap,
//     y: curseurY,
//     size: 9,
//     font: policeNormale,
//     color: rgb(0.3, 0.3, 0.3),
//   });
//   const txtTotal = formaterMontant(donnees.montantTotal);
//   page.drawText(txtTotal, {
//     x: margeDroite - policeNormale.widthOfTextAtSize(txtTotal, 9) - 5,
//     y: curseurY,
//     size: 9,
//     font: policeNormale,
//     color: rgb(0.2, 0.2, 0.2),
//   });

//   curseurY -= 18;

//   // Total payé
//   page.drawText('Déjà réglé :', {
//     x: xRecap,
//     y: curseurY,
//     size: 9,
//     font: policeNormale,
//     color: rgb(0.3, 0.3, 0.3),
//   });
//   const txtPaye = formaterMontant(donnees.totalPaye);
//   page.drawText(txtPaye, {
//     x: margeDroite - policeNormale.widthOfTextAtSize(txtPaye, 9) - 5,
//     y: curseurY,
//     size: 9,
//     font: policeNormale,
//     color: rgb(0.1, 0.6, 0.1),
//   });

//   curseurY -= 3;
//   dessinerLigne(page, xRecap - 10, curseurY, margeDroite, 1);
//   curseurY -= 15;

//   // Reste à payer (mis en valeur)
//   dessinerRectangle(page, xRecap - 10, curseurY - 8, largeurRecap + 10, 24, [0.13, 0.24, 0.44]);

//   page.drawText('RESTE À PAYER :', {
//     x: xRecap,
//     y: curseurY,
//     size: 10,
//     font: policeBold,
//     color: rgb(1, 1, 1),
//   });
//   const txtReste = formaterMontant(donnees.resteAPayer);
//   page.drawText(txtReste, {
//     x: margeDroite - policeBold.widthOfTextAtSize(txtReste, 10) - 5,
//     y: curseurY,
//     size: 10,
//     font: policeBold,
//     color: rgb(1, 1, 1),
//   });

//   curseurY -= 35;

//   // Badge statut de paiement
//   const badgeTextes = {
//     non_paye: 'NON RÉGLÉE',
//     partiel: 'PARTIELLEMENT RÉGLÉE',
//     paye: 'ENTIÈREMENT RÉGLÉE',
//   };
//   const badgeCouleurs: Record<string, [number, number, number]> = {
//     non_paye: [0.9, 0.2, 0.2],
//     partiel: [0.9, 0.6, 0.1],
//     paye: [0.1, 0.6, 0.2],
//   };

//   const badgeTexte = badgeTextes[donnees.statutPaiement];
//   const badgeCouleur = badgeCouleurs[donnees.statutPaiement];
//   dessinerRectangle(page, xRecap - 10, curseurY - 8, largeurRecap + 10, 22, badgeCouleur);

//   const largeurBadge = policeBold.widthOfTextAtSize(badgeTexte, 9);
//   page.drawText(badgeTexte, {
//     x: xRecap + (largeurRecap - largeurBadge) / 2,
//     y: curseurY,
//     size: 9,
//     font: policeBold,
//     color: rgb(1, 1, 1),
//   });

//   // ── Modes de paiement acceptés ─────────────────────────────────────────────
//   curseurY -= 60;
//   dessinerLigne(page, margeGauche, curseurY + 10, margeDroite, 1);

//   page.drawText('Modes de règlement acceptés :', {
//     x: margeGauche,
//     y: curseurY,
//     size: 9,
//     font: policeBold,
//     color: rgb(0.3, 0.3, 0.3),
//   });

//   curseurY -= 14;
//   page.drawText('• Espèces (Cash)   • Virement bancaire   • CCP', {
//     x: margeGauche,
//     y: curseurY,
//     size: 9,
//     font: policeNormale,
//     color: rgb(0.4, 0.4, 0.4),
//   });

//   // ── Pied de page ───────────────────────────────────────────────────────────
//   dessinerLigne(page, margeGauche, 60, margeDroite, 1);
//   page.drawText(
//     `${donnees.nomCabinet}  —  ${donnees.adresseCabinet}  —  ${donnees.telephoneCabinet}`,
//     {
//       x: margeGauche,
//       y: 45,
//       size: 7,
//       font: policeNormale,
//       color: rgb(0.6, 0.6, 0.6),
//     }
//   );

//   page.drawText(`Document généré le ${formaterDate(new Date())} — ERP Cabinet Avocat`, {
//     x: margeGauche,
//     y: 32,
//     size: 7,
//     font: policeNormale,
//     color: rgb(0.7, 0.7, 0.7),
//   });

//   // Numéro de page
//   page.drawText('Page 1 / 1', {
//     x: margeDroite - 40,
//     y: 32,
//     size: 7,
//     font: policeNormale,
//     color: rgb(0.7, 0.7, 0.7),
//   });

//   // Sérialisation et retour Buffer
//   const pdfBytes = await pdfDoc.save();
//   return Buffer.from(pdfBytes);
// };

// // Export du type pour le contrôleur
// export type { DonneesFacture };
