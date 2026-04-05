/* =========================================================
   certificat.js — 4 états d'affichage selon données Supabase

   État 0 — email non trouvé
   État 1 — trouvé mais livres_collectes = 0 (précommande enregistrée)
   État 2 — livres > 0 mais tous les % = 0 (collecte faite, tri en cours)
   État 3 — au moins un % > 0 (certificat complet + PDF)
   ========================================================= */

import { supabaseClient, DB_CONFIGURED } from './config.js';

/* ── Lookup certificats ──────────────────────────────────── */
export async function lookupCertificat(email) {
  // Demo mode shortcuts (no DB needed)
  if (!DB_CONFIGURED || !supabaseClient) {
    const e = email.toLowerCase();
    if (e.includes('demo1')) return { prenom: 'Marie', nom: 'Dupont', livres_collectes: 0, kg_papier_collecté: 0, pct_associations: 0, pct_revente: 0, pct_recyclage: 0 };
    if (e.includes('demo2')) return { prenom: 'Thomas', nom: 'Leroy', date_collecte: '2025-03-20', livres_collectes: 147, kg_papier_collecté: 62.5, pct_associations: 0, pct_revente: 0, pct_recyclage: 0 };
    if (e.includes('demo'))  return { prenom: 'Sophie', nom: 'Martin', date_collecte: '2025-03-15', livres_collectes: 247, kg_papier_collecté: 98.5, pct_associations: 45, pct_revente: 35, pct_recyclage: 20 };
    return null;
  }

  const emailNormalise = email.trim().toLowerCase();

  const { data, error } = await supabaseClient
    .from('certificats')
    .select('*')
    .eq('email', emailNormalise)
    .maybeSingle();

  console.log('[lookupCertificat] email:', emailNormalise);
  console.log('[lookupCertificat] data:', data, '| error:', error?.message);

  if (error || !data) return null;
  return data;
}

/* ── Lookup precommandes ─────────────────────────────────── */
export async function lookupPrecommande(email) {
  if (!DB_CONFIGURED || !supabaseClient) {
    // Demo: "precom@" simulates found in precommandes only
    if (email.toLowerCase().includes('precom')) return { prenom: 'Julie', email };
    return null;
  }

  const emailNormalise = email.trim().toLowerCase();

  const { data, error } = await supabaseClient
    .from('precommandes')
    .select('prenom, email')
    .eq('email', emailNormalise)
    .limit(1);

  console.log('[lookupPrecommande] email:', emailNormalise);
  console.log('[lookupPrecommande] data:', data, '| error:', error);

  if (error || !data || data.length === 0) return null;
  return data[0];
}

/* ── State detection ─────────────────────────────────────── */
function getState(cert) {
  if (!cert) return 0;
  const hasCollect = (cert.livres_collectes || 0) > 0 && (cert.kg_papier_collecté || 0) > 0;
  const hasPct     = (cert.pct_associations || 0) > 0 || (cert.pct_revente || 0) > 0 || (cert.pct_recyclage || 0) > 0;
  if (hasPct)     return 3;
  if (hasCollect) return 2;
  return 1;
}

/* ── Main render dispatcher ──────────────────────────────── */
export function renderCertificat(cert) {
  const state = getState(cert);
  switch (state) {
    case 1: return renderState1(cert);
    case 2: return renderState2(cert);
    case 3: return renderState3(cert);
  }
}

/* ── CAS 2 — trouvé dans precommandes, pas dans certificats ── */
export function renderFoundInPrecommandes(data) {
  const container = document.getElementById('cert-display');
  if (!container) return;
  const prenom = data?.prenom ? `, ${data.prenom}` : '';
  container.innerHTML = `
    <div class="cert-state-card cert-state-pending" data-reveal>
      <div class="cert-state-icon">📚</div>
      <h3>Merci pour votre précommande${prenom}&nbsp;!</h3>
      <p>
        Votre certificat d'impact sera généré dès que nos équipes seront venues
        récupérer vos livres.<br><br>
        Nous vous contacterons très prochainement pour organiser la collecte.
        Merci de votre confiance&nbsp;!
      </p>
      <div class="cert-pending-steps" style="margin-top:28px;">
        <div class="cert-step cert-step-done">
          <span class="cert-step-dot">✓</span>
          <span>Précommande enregistrée</span>
        </div>
        <div class="cert-step cert-step-waiting">
          <span class="cert-step-dot cert-step-dot-pulse"></span>
          <span>Collecte à domicile</span>
        </div>
        <div class="cert-step cert-step-waiting">
          <span class="cert-step-dot cert-step-dot-empty"></span>
          <span>Certificat d'impact disponible</span>
        </div>
      </div>
    </div>
  `;
  animateIn(container.querySelector('.cert-state-card'));
}

/* ── CAS 3 — email non trouvé nulle part ─────────────────── */
export function renderNotFound() {
  const container = document.getElementById('cert-display');
  if (!container) return;
  container.innerHTML = `
    <div class="cert-state-card cert-state-notfound" data-reveal style="max-width:600px;">
      <div class="cert-state-icon">🌱</div>
      <h3>Adresse email non reconnue</h3>
      <p>
        Votre adresse email n'est liée à aucune intervention de notre part.
      </p>

      <!-- CTA précommande -->
      <div class="cert-notfound-block cert-notfound-cta">
        <p>
          Vous souhaitez donner une seconde vie à vos livres ?<br>
          Nous serions ravis de vous aider&nbsp;!
        </p>
        <a href="precommande.html" class="btn btn-primary btn-lg" style="margin-top:8px;">
          📦 Faire une précommande
        </a>
      </div>

      <!-- Contact support -->
      <div class="cert-notfound-block cert-notfound-support">
        <p style="font-size:.88rem;">
          Si nous sommes déjà intervenus chez vous et que vous voyez ce message,
          un problème d'enregistrement a pu survenir.<br>
          N'hésitez pas à nous contacter directement&nbsp;:
        </p>
        <p style="margin-top:10px; font-size:.9rem;">
          📧 <a href="mailto:nextstopbook@gmail.com" style="color:var(--green); font-weight:600;">nextstopbook@gmail.com</a>
        </p>
      </div>
    </div>
  `;
  animateIn(container.querySelector('.cert-state-card'));
}

/* ── État 1 — précommande enregistrée, pas encore collecté ── */
function renderState1(cert) {
  const container = document.getElementById('cert-display');
  if (!container) return;
  const prenom = cert.prenom || 'cher client';
  container.innerHTML = `
    <div class="cert-state-card cert-state-pending">
      <div class="cert-state-icon">📚</div>
      <h3>Votre précommande est bien enregistrée${prenom ? ', ' + prenom : ''}&nbsp;!</h3>
      <p>
        Nous vous indiquerons comment vos livres ont été utilisés
        dès que nous viendrons les chercher.
      </p>
      <div class="cert-pending-steps">
        <div class="cert-step cert-step-done">
          <span class="cert-step-dot">✓</span>
          <span>Précommande enregistrée</span>
        </div>
        <div class="cert-step cert-step-waiting">
          <span class="cert-step-dot cert-step-dot-pulse"></span>
          <span>Collecte à domicile</span>
        </div>
        <div class="cert-step cert-step-waiting">
          <span class="cert-step-dot cert-step-dot-empty"></span>
          <span>Certificat d'impact disponible</span>
        </div>
      </div>
    </div>
  `;
  animateIn(container.querySelector('.cert-state-card'));
}

/* ── État 2 — collecte faite, répartition en cours ──────── */
function renderState2(cert) {
  const container = document.getElementById('cert-display');
  if (!container) return;
  const prenom  = cert.prenom || 'cher client';
  const livres  = (cert.livres_collectes || 0).toLocaleString('fr-BE');
  const kg      = parseFloat(cert.kg_papier_collecté || 0).toFixed(1).replace('.', ',');
  const dateStr = cert.date_collecte
    ? new Date(cert.date_collecte).toLocaleDateString('fr-BE', { day: '2-digit', month: 'long', year: 'numeric' })
    : null;

  container.innerHTML = `
    <div class="cert-state-card cert-state-processing">
      <div class="cert-state-icon">🎉</div>
      <h3>Merci d'avoir utilisé notre service, ${prenom}&nbsp;!</h3>
      <p>
        Nous avons bien récupéré vos livres.
        Les informations concernant leur utilisation seront disponibles dans les prochains jours.
      </p>

      <!-- Partial stats already available -->
      <div class="cert-partial-stats">
        <div class="cert-partial-stat cert-partial-green">
          <div class="cert-partial-num">${livres}</div>
          <div class="cert-partial-lbl">📚 livres collectés</div>
        </div>
        <div class="cert-partial-stat cert-partial-amber">
          <div class="cert-partial-num">${kg} kg</div>
          <div class="cert-partial-lbl">♻️ papier sauvé</div>
        </div>
      </div>
      ${dateStr ? `<p class="cert-partial-date">Collecte du <strong>${dateStr}</strong></p>` : ''}

      <!-- Animated progress placeholder -->
      <div class="cert-processing-bar-wrap">
        <div class="cert-processing-label">Tri et répartition en cours…</div>
        <div class="cert-processing-bar">
          <div class="cert-processing-fill"></div>
        </div>
      </div>

      <div class="cert-pending-steps" style="margin-top:20px;">
        <div class="cert-step cert-step-done">
          <span class="cert-step-dot">✓</span>
          <span>Précommande enregistrée</span>
        </div>
        <div class="cert-step cert-step-done">
          <span class="cert-step-dot">✓</span>
          <span>Collecte effectuée</span>
        </div>
        <div class="cert-step cert-step-waiting">
          <span class="cert-step-dot cert-step-dot-pulse"></span>
          <span>Certificat d'impact en préparation</span>
        </div>
      </div>
    </div>
  `;
  animateIn(container.querySelector('.cert-state-card'));
}

/* ── État 3 — certificat complet ────────────────────────── */
function renderState3(cert) {
  const container = document.getElementById('cert-display');
  if (!container) return;

  const dateStr = cert.date_collecte
    ? new Date(cert.date_collecte).toLocaleDateString('fr-BE', { day: '2-digit', month: 'long', year: 'numeric' })
    : '—';
  const assoc     = cert.pct_associations || 0;
  const revente   = cert.pct_revente      || 0;
  const recyclage = cert.pct_recyclage    || 0;
  const kg        = parseFloat(cert.kg_papier_collecté || 0).toFixed(1).replace('.', ',');

  container.innerHTML = `
    <div class="certificate" id="certificate-doc">
      <div class="cert-corner cert-corner-tl"></div>
      <div class="cert-corner cert-corner-tr"></div>
      <div class="cert-corner cert-corner-bl"></div>
      <div class="cert-corner cert-corner-br"></div>

      <div class="cert-header">
        <div class="cert-logo-line">
          <span class="cert-ornament">❧</span>
          <span class="cert-logo-text">Nextstop Book</span>
          <span class="cert-ornament">❧</span>
        </div>
        <div class="cert-logo-sub">Économie circulaire du livre · ASBL · Bruxelles</div>
        <div class="cert-header-rule"><span class="cert-rule-diamond">◆</span></div>
        <h1 class="cert-title">Certificat d'Impact</h1>
      </div>

      <div class="cert-body">
        <p class="cert-bestowed">Ce certificat est décerné à</p>
        <h2 class="cert-name">${cert.prenom} ${cert.nom}</h2>
        <p class="cert-date-line">pour la collecte effectuée le <strong>${dateStr}</strong></p>

        <div class="cert-stats-row">
          <div class="cert-stat-box cert-stat-green">
            <div class="cert-stat-num">${(cert.livres_collectes || 0).toLocaleString('fr-BE')}</div>
            <div class="cert-stat-label">📚 livres collectés</div>
          </div>
          <div class="cert-stat-sep">×</div>
          <div class="cert-stat-box cert-stat-amber">
            <div class="cert-stat-num">${kg}</div>
            <div class="cert-stat-label">♻️ kg de papier sauvés</div>
          </div>
        </div>

        ${cert.photo_url ? `
        <div class="cert-photo-section">
          <div class="cert-photo-polaroid">
            <img src="${cert.photo_url}" alt="Photo de la collecte" class="cert-photo-img">
            <p class="cert-photo-caption">📸 Votre collecte${cert.date_collecte ? ' — ' + new Date(cert.date_collecte).toLocaleDateString('fr-BE', { day: '2-digit', month: 'long', year: 'numeric' }) : ''}</p>
          </div>
        </div>` : ''}

        ${cert.associations_aidees > 0 ? `
        <p class="cert-assoc-impact">🤝 <strong>${cert.associations_aidees}</strong> association${cert.associations_aidees > 1 ? 's' : ''} aidée${cert.associations_aidees > 1 ? 's' : ''} grâce à votre collecte</p>` : ''}

        <div class="cert-dist-section">
          <p class="cert-dist-title">Répartition de vos livres</p>
          <div class="cert-bar-track">
            <div class="cert-bar-assoc"     style="width:0%" data-width="${assoc}%"     title="Associations: ${assoc}%"></div>
            <div class="cert-bar-revente"   style="width:0%" data-width="${revente}%"   title="Revente: ${revente}%"></div>
            <div class="cert-bar-recyclage" style="width:0%" data-width="${recyclage}%" title="Recyclage: ${recyclage}%"></div>
          </div>
          <div class="cert-dist-blocks">
            <div class="cert-dist-block cert-dist-block-assoc">
              <div class="cert-dist-pct">${assoc}%</div>
              <div class="cert-dist-icon">🤝</div>
              <div class="cert-dist-lbl">Donnés aux<br>associations</div>
            </div>
            <div class="cert-dist-block cert-dist-block-revente">
              <div class="cert-dist-pct">${revente}%</div>
              <div class="cert-dist-icon">💶</div>
              <div class="cert-dist-lbl">Revendus en<br>seconde main</div>
            </div>
            <div class="cert-dist-block cert-dist-block-recyclage">
              <div class="cert-dist-pct">${recyclage}%</div>
              <div class="cert-dist-icon">♻️</div>
              <div class="cert-dist-lbl">Recyclés<br>responsablement</div>
            </div>
          </div>
        </div>

        <div class="cert-co2-note">
          🌱 CO₂ évité estimé : <strong>${((cert.livres_collectes || 0) * 1.8).toFixed(0)} kg</strong>
          — soit l'équivalent de ${Math.round((cert.livres_collectes || 0) * 1.8 / 4.6)} km en voiture
        </div>
      </div>

      <div class="cert-footer">
        <div class="cert-footer-rule"><span class="cert-rule-diamond">◆</span></div>
        <div class="cert-seal">✦</div>
        <p class="cert-footer-text">
          Nextstop Book ASBL · Bruxelles, Belgique<br>
          <span>Ce certificat atteste de l'impact environnemental et social de votre collecte</span>
        </p>
      </div>
    </div>

    <div class="cert-download-area">
      <button class="btn btn-primary btn-lg" onclick="downloadCertPDF()">
        ⬇ Télécharger en PDF
      </button>
      <p style="font-size:.82rem; color:var(--text-light); margin-top:10px;">
        Format A4 · Qualité impression
      </p>
    </div>
  `;

  // Store for PDF
  window._certData = { ...cert, dateStr, kg };

  // Animate certificate in, then trigger bar animation
  requestAnimationFrame(() => {
    const doc = container.querySelector('.certificate');
    if (doc) doc.classList.add('cert-visible');
    setTimeout(() => {
      container.querySelectorAll('[data-width]').forEach(el => {
        el.style.width = el.dataset.width;
      });
    }, 400);
  });
}

/* ── Shared fade-in helper ───────────────────────────────── */
function animateIn(el) {
  if (!el) return;
  el.style.opacity = '0';
  el.style.transform = 'translateY(20px)';
  requestAnimationFrame(() => {
    el.style.transition = 'opacity .5s ease, transform .5s ease';
    el.style.opacity    = '1';
    el.style.transform  = 'translateY(0)';
  });
}

/* ── PDF export (état 3 only) ────────────────────────────── */
window.downloadCertPDF = async function () {
  const cert = window._certData;
  if (!cert || !window.jspdf) { alert('Erreur PDF. Veuillez réessayer.'); return; }

  const btn = document.querySelector('.cert-download-area .btn');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Génération…'; }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = 210, H = 297;

  const GREEN    = [44, 74, 53];   // #2C4A35
  const AMBER    = [160, 82, 45];  // #A0522D
  const CREAM    = [250, 248, 244];
  const BORDER   = [200, 192, 176];
  const DARK     = [30, 30, 30];
  const LIGHT    = [110, 110, 110];
  const GREEN_LT = [238, 245, 240];

  // ── Fond crème + double bordure ──────────────────────────
  doc.setFillColor(...CREAM);
  doc.rect(0, 0, W, H, 'F');
  doc.setDrawColor(...AMBER);
  doc.setLineWidth(1.4);
  doc.rect(8, 8, W - 16, H - 16);
  doc.setLineWidth(0.4);
  doc.setDrawColor(...BORDER);
  doc.rect(12, 12, W - 24, H - 24);

  // ── 1. HEADER — fond vert ────────────────────────────────
  doc.setFillColor(...GREEN);
  doc.rect(12, 12, W - 24, 48, 'F');

  doc.setFont('times', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(255, 255, 255);
  doc.text('NEXTSTOP BOOK', W / 2, 30, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(180, 215, 195);
  doc.text('Economie circulaire du livre  ·  ASBL  ·  Bruxelles', W / 2, 37, { align: 'center' });

  doc.setDrawColor(...AMBER);
  doc.setLineWidth(0.7);
  doc.line(35, 41, W - 35, 41);

  doc.setFont('times', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text("Certificat d'Impact Environnemental", W / 2, 54, { align: 'center' });

  // ── 2. DESTINATAIRE ──────────────────────────────────────
  let y = 74;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(9.5);
  doc.setTextColor(...LIGHT);
  doc.text('Ce certificat est decerne a', W / 2, y, { align: 'center' });
  y += 11;

  doc.setFont('times', 'bold');
  doc.setFontSize(28);
  doc.setTextColor(...GREEN);
  doc.text(`${cert.prenom} ${cert.nom}`, W / 2, y, { align: 'center' });
  y += 8;

  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.3);
  doc.line(45, y, W - 45, y);
  y += 8;

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(9);
  doc.setTextColor(...LIGHT);
  doc.text(`Collecte effectuee le ${cert.dateStr}`, W / 2, y, { align: 'center' });
  y += 16;

  // ── 3. STATS — 2 blocs ──────────────────────────────────
  const boxW = 72, boxH = 26, gap = 8;
  const bx1 = W / 2 - boxW - gap / 2;
  const bx2 = W / 2 + gap / 2;

  doc.setFillColor(...GREEN);
  doc.roundedRect(bx1, y, boxW, boxH, 3, 3, 'F');
  doc.setFillColor(...AMBER);
  doc.roundedRect(bx2, y, boxW, boxH, 3, 3, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.text((cert.livres_collectes || 0).toLocaleString('fr-BE'), bx1 + boxW / 2, y + 13, { align: 'center' });
  doc.text(`${cert.kg} kg`, bx2 + boxW / 2, y + 13, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(210, 235, 220);
  doc.text('livres collectes', bx1 + boxW / 2, y + 21, { align: 'center' });
  doc.setTextColor(255, 225, 200);
  doc.text('kg de papier sauves', bx2 + boxW / 2, y + 21, { align: 'center' });
  y += boxH + 14;

  // ── 4. PHOTO (async) ────────────────────────────────────
  if (cert.photo_url) {
    try {
      const base64 = await new Promise((resolve, reject) => {
        fetch(cert.photo_url)
          .then(r => { if (!r.ok) throw new Error('fetch'); return r.blob(); })
          .then(blob => {
            const reader = new FileReader();
            reader.onload  = e => resolve(e.target.result);
            reader.onerror = () => reject(new Error('reader'));
            reader.readAsDataURL(blob);
          })
          .catch(reject);
      });

      // Dimensions : largeur max 120mm, hauteur max 70mm
      const imgMaxW = 120, imgMaxH = 70;
      const polaroidPad = 4, captionH = 12;
      const frameW = imgMaxW + polaroidPad * 2;
      const frameH = imgMaxH + polaroidPad + captionH + 4;
      const fx = (W - frameW) / 2;

      // Fond blanc polaroïd
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.3);
      doc.roundedRect(fx, y, frameW, frameH, 2, 2, 'FD');

      // Image
      doc.addImage(base64, 'JPEG', fx + polaroidPad, y + polaroidPad, imgMaxW, imgMaxH, undefined, 'MEDIUM');

      // Légende
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(...LIGHT);
      const legend = cert.dateStr !== '—' ? `Votre collecte  -  ${cert.dateStr}` : 'Votre collecte';
      doc.text(legend, W / 2, y + polaroidPad + imgMaxH + 8, { align: 'center' });

      y += frameH + 12;
    } catch (_) {
      // CORS ou erreur réseau : on skip la photo silencieusement
    }
  }

  // ── 5. RÉPARTITION ──────────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...DARK);
  doc.text('Repartition de vos livres', W / 2, y, { align: 'center' });
  y += 9;

  const barX = 28, barW = W - 56, barH = 9;
  const assocW    = barW * (cert.pct_associations || 0) / 100;
  const reventeW  = barW * (cert.pct_revente      || 0) / 100;
  const recyclageW = barW - assocW - reventeW;

  // Fond gris léger
  doc.setFillColor(230, 230, 230);
  doc.roundedRect(barX, y, barW, barH, 2, 2, 'F');
  // Segments
  if (assocW > 0)    { doc.setFillColor(...GREEN);  doc.roundedRect(barX,                      y, assocW,    barH, 2, 2, 'F'); }
  if (reventeW > 0)  { doc.setFillColor(...AMBER);  doc.rect(barX + assocW,                    y, reventeW,  barH, 'F'); }
  if (recyclageW > 0){ doc.setFillColor(82,183,136);doc.roundedRect(barX + assocW + reventeW,  y, recyclageW,barH, 2, 2, 'F'); }
  y += barH + 7;

  // Légende des 3 segments
  const legendItems = [
    { color: GREEN,       pct: cert.pct_associations, label: 'Associations' },
    { color: AMBER,       pct: cert.pct_revente,      label: 'Revente'      },
    { color: [82,183,136],pct: cert.pct_recyclage,    label: 'Recyclage'    },
  ];
  const colW = barW / 3;
  legendItems.forEach(({ color, pct, label }, i) => {
    const lx = barX + colW * i + 4;
    doc.setFillColor(...color);
    doc.roundedRect(lx, y, 3.5, 3.5, 0.5, 0.5, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...DARK);
    doc.text(`${pct}%  ${label}`, lx + 5.5, y + 3.2);
  });
  y += 14;

  // ── 6. ASSOCIATIONS AIDÉES ───────────────────────────────
  if ((cert.associations_aidees || 0) > 0) {
    const n   = cert.associations_aidees;
    const txt = `${n} association${n > 1 ? 's' : ''} aidee${n > 1 ? 's' : ''} grace a votre collecte`;
    doc.setFillColor(...GREEN_LT);
    doc.roundedRect(barX, y, barW, 12, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...GREEN);
    doc.text(`${n > 1 ? n + ' associations' : '1 association'} aidee${n > 1 ? 's' : ''} grace a votre collecte`, W / 2, y + 8, { align: 'center' });
    y += 20;
  }

  // ── CO₂ ─────────────────────────────────────────────────
  const co2 = ((cert.livres_collectes || 0) * 1.8).toFixed(0);
  const km  = Math.round((cert.livres_collectes || 0) * 1.8 / 4.6);
  doc.setFillColor(...GREEN_LT);
  doc.roundedRect(barX, y, barW, 12, 2, 2, 'F');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...GREEN);
  doc.text(`CO2 evite estime : ${co2} kg  -  equivalent de ${km} km en voiture`, W / 2, y + 8, { align: 'center' });

  // ── 7. FOOTER ────────────────────────────────────────────
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.4);
  doc.line(28, H - 32, W - 28, H - 32);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...DARK);
  doc.text('Nextstop Book ASBL  -  Bruxelles, Belgique', W / 2, H - 25, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...LIGHT);
  doc.text("Ce certificat atteste de l'impact environnemental et social de votre collecte.", W / 2, H - 19, { align: 'center' });

  const genDate = new Date().toLocaleDateString('fr-BE', { day: '2-digit', month: 'long', year: 'numeric' });
  doc.setFontSize(7);
  doc.text(`Genere le ${genDate}`, W / 2, H - 14, { align: 'center' });

  // Coins décoratifs
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...AMBER);
  [[14,16],[W-14,16],[14,H-13],[W-14,H-13]].forEach(([x,yy]) => doc.text('◆', x, yy, { align: 'center' }));

  if (btn) { btn.disabled = false; btn.innerHTML = '⬇ Télécharger en PDF'; }
  doc.save(`nextstop-book-certificat-${cert.prenom}-${cert.nom}.pdf`);
};
