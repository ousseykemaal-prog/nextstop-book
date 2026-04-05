/* =========================================================
   main.js — Entry point for index.html

   Stats logic :
   - livres_collectes → SUM depuis table "certificats"
   - kg_papier_collecté        → SUM depuis table "certificats"
   - associations_aidees → lecture depuis table "stats" (manuel)
   ========================================================= */

import { supabaseClient, DB_CONFIGURED } from './config.js';
import {
  initHeroCanvas,
  initScrollReveal,
  initCounters,
  initCarousel,
  initNav,
  initPageTransition,
  initProgressBar,
} from './animations.js';

/* ── Fetch live stats ───────────────────────────────────── */
async function loadStats() {
  const demo = { livres_collectes: 1234, kg_papier_collecté: 567, associations_aidees: 12 };

  if (!DB_CONFIGURED || !supabaseClient) {
    injectStats(demo);
    return;
  }

  // Run both queries in parallel
  const [certRes, statsRes] = await Promise.all([
    supabaseClient
      .from('certificats')
      .select('livres_collectes, kg_papier_collecté'),
    supabaseClient
      .from('stats')
      .select('associations_aidees')
      .eq('id', 3)
      .maybeSingle(),
  ]);

  // SUM from certificats
  const livres = (certRes.data || []).reduce((acc, r) => acc + (r.livres_collectes || 0), 0);
  const kg     = (certRes.data || []).reduce((acc, r) => acc + parseFloat(r.kg_papier_collecté || 0), 0);

  // associations_aidees stays manual in stats table
  const ecoles = statsRes.data?.associations_aidees ?? 0;

  injectStats({ livres_collectes: livres, kg_papier_collecté: Math.round(kg), associations_aidees: ecoles });
}

function injectStats({ livres_collectes, kg_papier_collecté, associations_aidees }) {
  const map = {
    'stat-livres': livres_collectes,
    'stat-kg':     kg_papier_collecté,
    'stat-ecoles': associations_aidees,
  };
  Object.entries(map).forEach(([id, val]) => {
    const el = document.getElementById(id);
    if (el) {
      el.dataset.target = val;
      el.textContent    = val.toLocaleString('fr-BE');
    }
  });
}

/* ── Fetch précommandes count ───────────────────────────── */
async function loadPrecomCount() {
  const el = document.getElementById('precom-count');
  if (!el) return;

  if (!DB_CONFIGURED || !supabaseClient) {
    el.dataset.target = '47';
    el.textContent = '47';
    return;
  }

  const { count } = await supabaseClient
    .from('precommandes')
    .select('*', { count: 'exact', head: true });

  const n = count ?? 0;
  el.dataset.target = String(n);
  el.textContent = n.toLocaleString('fr-BE');
}

/* ── DOM ready ──────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', async () => {
  initNav();
  initProgressBar();
  initPageTransition();
  initHeroCanvas();
  initScrollReveal();
  initCounters();
  initCarousel();
  await Promise.all([loadStats(), loadPrecomCount()]);
  initCounters(); // re-run now that data-target is populated
});
