/* =========================================================
   pdf-generator.js — jsPDF receipt generator
   Requires: jsPDF loaded globally via <script> tag
   ========================================================= */

function pad(n, len = 4) { return String(n).padStart(len, '0'); }

function generateRef() {
  const year = new Date().getFullYear();
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `NSB-${year}-${rand}`;
}

function formatDate(d = new Date()) {
  return d.toLocaleDateString('fr-BE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/* ── Color helpers ─────────────────────────────────────────── */
const GREEN  = [21, 69, 50];   // #154532
const CREAM  = [250, 248, 244];
const AMBER  = [184, 89, 0];
const BORDER = [224, 219, 208];
const DARK   = [26, 26, 26];
const LIGHT  = [102, 102, 102];

/* ── Main export ───────────────────────────────────────────── */
export function generatePDF(formData, stats = {}) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  const W = 210, H = 297;
  const margin = 22;
  const contentW = W - margin * 2;
  let y = 0;

  const ref = generateRef();
  const date = formatDate();

  /* ── Header band ─────────────────────────────────────────── */
  doc.setFillColor(...GREEN);
  doc.rect(0, 0, W, 44, 'F');

  // Logo text
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(255, 255, 255);
  doc.text('NEXTSTOP', margin, 19);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(22);
  doc.text(' BOOK', margin + 45.5, 19);

  // Tagline
  doc.setFontSize(8);
  doc.setTextColor(200, 230, 215);
  doc.text('Économie circulaire du livre · Bruxelles', margin, 26);

  // Reference badge (top right)
  doc.setFillColor(184, 89, 0);
  doc.roundedRect(W - margin - 44, 10, 44, 14, 3, 3, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text(ref, W - margin - 22, 18.5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(230, 230, 230);
  doc.text('Référence de précommande', W - margin - 22, 22, { align: 'center' });

  y = 56;

  /* ── Title ───────────────────────────────────────────────── */
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.setTextColor(...DARK);
  doc.text('Confirmation de Précommande', margin, y);
  y += 7;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...LIGHT);
  doc.text(`Date de la demande : ${date}`, margin, y);
  y += 10;

  // Divider
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.4);
  doc.line(margin, y, W - margin, y);
  y += 10;

  /* ── Section helper ─────────────────────────────────────── */
  function sectionTitle(label) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...AMBER);
    doc.text(label.toUpperCase(), margin, y);
    y += 5;
    doc.setDrawColor(...AMBER);
    doc.setLineWidth(0.6);
    doc.line(margin, y, margin + 60, y);
    doc.setLineWidth(0.4);
    doc.setDrawColor(...BORDER);
    y += 7;
  }

  function row(label, value, bold = false) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...LIGHT);
    doc.text(label, margin + 2, y);
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setTextColor(...DARK);
    doc.text(String(value || '—'), margin + 52, y);
    y += 7;
  }

  /* ── Client info ─────────────────────────────────────────── */
  sectionTitle('Informations client');
  row('Nom complet',  `${formData.prenom} ${formData.nom}`);
  row('Email',        formData.email);
  row('Téléphone',    formData.telephone);
  row('Localisation', `${formData.ville}${formData.codePostal ? ' ' + formData.codePostal : ''}`);
  y += 2;

  doc.setDrawColor(...BORDER);
  doc.line(margin, y, W - margin, y);
  y += 10;

  /* ── Demande ─────────────────────────────────────────────── */
  sectionTitle('Détails de la demande');
  row('Situation',       formData.situation, true);
  row('Volume estimé',   formData.volume, true);
  if (formData.message) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...LIGHT);
    doc.text('Message :', margin + 2, y);
    y += 5;
    const lines = doc.splitTextToSize(formData.message, contentW - 8);
    doc.setTextColor(...DARK);
    doc.text(lines, margin + 4, y);
    y += lines.length * 5 + 4;
  }
  y += 2;

  doc.setDrawColor(...BORDER);
  doc.line(margin, y, W - margin, y);
  y += 10;

  /* ── Impact estimé ───────────────────────────────────────── */
  sectionTitle('Votre impact estimé');

  const statItems = [
    { icon: '📚', label: 'Livres collectés',    value: (stats.livres_collectes || 0).toLocaleString('fr-BE'), color: GREEN  },
    { icon: '♻',  label: 'Kg de papier sauvés', value: (stats.kg_papier       || 0).toLocaleString('fr-BE') + ' kg', color: [30, 100, 60] },
    { icon: '🎓', label: 'Écoles aidées',        value: (stats.ecoles_aidees   || 0).toLocaleString('fr-BE'), color: AMBER  },
  ];

  const colW  = contentW / 3;
  const boxH  = 26;

  statItems.forEach((item, i) => {
    const bx = margin + i * colW + 2;
    doc.setFillColor(item.color[0], item.color[1], item.color[2]);
    doc.roundedRect(bx, y, colW - 4, boxH, 3, 3, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(255, 255, 255);
    doc.text(item.value, bx + (colW - 4) / 2, y + 12, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(220, 240, 230);
    doc.text(item.label, bx + (colW - 4) / 2, y + 19, { align: 'center' });
  });
  y += boxH + 14;

  /* ── Message ─────────────────────────────────────────────── */
  doc.setFillColor(...CREAM);
  doc.roundedRect(margin, y, contentW, 32, 4, 4, 'F');
  doc.setDrawColor(...BORDER);
  doc.roundedRect(margin, y, contentW, 32, 4, 4, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...GREEN);
  doc.text('Merci pour votre précommande !', W / 2, y + 10, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...DARK);
  doc.text(
    'Notre équipe vous contactera sous 48h pour organiser la collecte.',
    W / 2, y + 18, { align: 'center' }
  );
  doc.setTextColor(...LIGHT);
  doc.setFontSize(7.5);
  doc.text(
    'Ce document est votre preuve de précommande Nextstop Book.',
    W / 2, y + 25, { align: 'center' }
  );
  y += 44;

  /* ── Footer ──────────────────────────────────────────────── */
  const footerY = H - 22;
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.3);
  doc.line(margin, footerY - 4, W - margin, footerY - 4);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...LIGHT);
  doc.text('Nextstop Book ASBL · Association sans but lucratif · Bruxelles, Belgique', W / 2, footerY, { align: 'center' });
  doc.text(`Réf: ${ref} · Émis le ${date}`, W / 2, footerY + 5, { align: 'center' });

  /* ── Save ───────────────────────────────────────────────── */
  const fileName = `nextstop-book-precommande-${ref}.pdf`;
  doc.save(fileName);
  return ref;
}
