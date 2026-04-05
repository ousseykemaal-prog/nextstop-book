/* =========================================================
   form.js — Precommande form: validation, DB save, Telegram
   ========================================================= */

import { supabaseClient, DB_CONFIGURED,
         TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, TELEGRAM_CONFIGURED } from './config.js';

/* ── Ref generator ──────────────────────────────────────── */
function generateRef() {
  return `NSB-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
}

/* ── Validation rules ───────────────────────────────────── */
const RULES = {
  prenom:    v => v.trim().length >= 2,
  nom:       v => v.trim().length >= 2,
  email:     v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()),
  telephone: v => v.trim() === '' || /^[\d\s\+\-\(\)]{6,}$/.test(v.trim()),
  rue:       v => v.trim().length >= 2,
  numero:    v => v.trim().length >= 1,
  ville:     v => v.trim().length >= 2,
  situation: v => v !== '',
  volume:    v => v !== '',
  rgpd:      v => v === true,
};

/* ── Field highlight ────────────────────────────────────── */
function setFieldState(field, valid) {
  const group = field.closest('.form-group');
  if (!group) return;
  group.classList.toggle('field-valid',   valid);
  group.classList.toggle('field-invalid', !valid);
  const err = group.querySelector('.field-error');
  if (err) err.style.display = valid ? 'none' : 'block';
}

function validateField(name, value) {
  return RULES[name] ? RULES[name](value) : true;
}

/* ── Real-time validation ────────────────────────────────── */
function attachLiveValidation(form) {
  ['prenom','nom','email','telephone','rue','numero','ville'].forEach(name => {
    const el = form.querySelector(`[name="${name}"]`);
    if (!el) return;
    el.addEventListener('blur', () => setFieldState(el, validateField(name, el.value)));
    el.addEventListener('input', () => {
      if (el.closest('.form-group').classList.contains('field-invalid'))
        setFieldState(el, validateField(name, el.value));
    });
  });
  ['situation','volume'].forEach(name => {
    const el = form.querySelector(`[name="${name}"]`);
    el?.addEventListener('change', () => setFieldState(el, validateField(name, el.value)));
  });
}

/* ── Full form validation ────────────────────────────────── */
function validateAll(form) {
  let ok = true;
  Object.keys(RULES).forEach(name => {
    if (name === 'rgpd') {
      const el  = form.querySelector('[name="rgpd"]');
      const val = el?.checked === true;
      if (!RULES.rgpd(val)) { setFieldState(el, false); ok = false; }
      return;
    }
    const el = form.querySelector(`[name="${name}"]`);
    if (!el) return;
    const valid = validateField(name, el.value);
    setFieldState(el, valid);
    if (!valid) ok = false;
  });
  return ok;
}

/* ── Collect form data ───────────────────────────────────── */
function collectData(form) {
  const g = name => form.querySelector(`[name="${name}"]`)?.value?.trim() || '';
  return {
    prenom:     g('prenom'),
    nom:        g('nom'),
    email:      g('email').toLowerCase(),
    telephone:  g('telephone'),
    rue:        g('rue'),
    numero:     g('numero'),
    ville:      g('ville'),
    codePostal: g('code_postal'),
    situation:  g('situation'),
    volume:     g('volume'),
    message:    g('message'),
  };
}

/* ── Save to Supabase ────────────────────────────────────── */
async function saveToDB(data, ref) {
  if (!DB_CONFIGURED || !supabaseClient) {
    console.info('Supabase not configured — skipping DB save (see config.js)');
    return;
  }
  const adresseLine = data.rue ? `${data.numero} ${data.rue}` : '';
  const fullMessage = [adresseLine, data.message].filter(Boolean).join('\n');
  const { error } = await supabaseClient.from('precommandes').insert([{
    reference:   ref,
    prenom:      data.prenom,
    nom:         data.nom,
    email:       data.email,
    telephone:   data.telephone,
    ville:       data.ville,
    code_postal: data.codePostal,
    situation:   data.situation,
    volume:      data.volume,
    message:     fullMessage,
    created_at:  new Date().toISOString(),
  }]);
  if (error) console.error('DB insert error:', error.message);
}

/* ── Telegram notification ───────────────────────────────── */
async function sendTelegram(data) {
  if (!TELEGRAM_CONFIGURED) return;
  const date = new Date().toLocaleString('fr-BE', { dateStyle: 'short', timeStyle: 'short' });
  const text = [
    `🔔 <b>Nouvelle précommande Nextstop Book !</b>`,
    ``,
    `👤 ${data.prenom} ${data.nom}`,
    `📧 ${data.email}`,
    `📍 ${data.rue ? data.numero + ' ' + data.rue + ', ' : ''}${data.ville}${data.codePostal ? ' ' + data.codePostal : ''}`,
    `📦 Volume : ${data.volume}`,
    `🏷️ Situation : ${data.situation}`,
    `💬 Message : ${data.message || 'Aucun message ajouté'}`,
    `🕐 ${date}`,
  ].join('\n');

  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text, parse_mode: 'HTML' }),
    });
  } catch (err) {
    // Non-blocking — don't break the UX if Telegram is down
    console.warn('Telegram notification failed:', err.message);
  }
}

/* ── Success screen ──────────────────────────────────────── */
function showSuccess(prenom) {
  const screen   = document.getElementById('success-screen');
  const prenomEl = document.getElementById('success-prenom');
  if (prenomEl) prenomEl.textContent = prenom;
  if (screen)   screen.classList.add('visible');
  launchConfetti();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ── Confetti ─────────────────────────────────────────────── */
function launchConfetti() {
  const canvas = document.getElementById('confetti-canvas');
  if (!canvas) return;
  canvas.style.display = 'block';
  const ctx = canvas.getContext('2d');
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;

  const colors = ['#154532','#2d8a60','#b85900','#e8943d','#f5f0e8','#95d5b2'];
  const pieces = Array.from({ length: 120 }, () => ({
    x:    Math.random() * canvas.width,
    y:    Math.random() * -canvas.height,
    w:    6 + Math.random() * 8,
    h:    3 + Math.random() * 5,
    rot:  Math.random() * Math.PI * 2,
    dRot: (Math.random() - 0.5) * 0.15,
    vy:   3 + Math.random() * 4,
    vx:   (Math.random() - 0.5) * 2,
    color: colors[Math.floor(Math.random() * colors.length)],
  }));

  let done = false;
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let alive = 0;
    pieces.forEach(p => {
      p.y += p.vy; p.x += p.vx; p.rot += p.dRot;
      if (p.y < canvas.height) alive++;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    });
    if (alive > 0 && !done) requestAnimationFrame(draw);
    else { canvas.style.display = 'none'; }
  }
  draw();
  setTimeout(() => { done = true; }, 3500);
}

/* ── Main init ───────────────────────────────────────────── */
export function initForm() {
  const form      = document.getElementById('precommande-form');
  const submitBtn = document.getElementById('form-submit');
  if (!form) return;

  attachLiveValidation(form);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!validateAll(form)) {
      const firstErr = form.querySelector('.field-invalid input, .field-invalid select');
      firstErr?.focus();
      firstErr?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    submitBtn.disabled = true;
    submitBtn.classList.add('loading');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<span class="spinner"></span> Envoi en cours…';

    try {
      const data = collectData(form);
      const ref  = generateRef();

      await saveToDB(data, ref);
      sendTelegram(data); // fire-and-forget, don't await

      showSuccess(data.prenom);
    } catch (err) {
      console.error('Form submission error:', err);
      submitBtn.disabled = false;
      submitBtn.classList.remove('loading');
      submitBtn.innerHTML = originalText;
      alert('Une erreur est survenue. Veuillez réessayer ou nous contacter directement.');
    }
  });
}
