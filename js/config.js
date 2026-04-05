// =========================================================
// DATABASE CHOICE: Supabase
// Setup instructions: see README.md
// =========================================================

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// ── Supabase ──────────────────────────────────────────────
const SUPABASE_URL      = 'https://zuodohzqvfnoilgebqww.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1b2RvaHpxdmZub2lsZ2VicXd3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4NzYzOTYsImV4cCI6MjA5MDQ1MjM5Nn0.SeDpX6MoxQbXPufDmaGlK-9VvFpAqNyWIBzdItyHb10';

export const DB_CONFIGURED =
  SUPABASE_URL !== 'YOUR_SUPABASE_URL' &&
  SUPABASE_ANON_KEY !== 'YOUR_SUPABASE_ANON_KEY';

export const supabaseClient = DB_CONFIGURED
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

// ── Telegram ──────────────────────────────────────────────
// Setup: see README.md → section "Setup Telegram"
export const TELEGRAM_BOT_TOKEN = '8639932050:AAGrDVW6ldVhzqRQc6Z1X-QT6rMZ3twd8Ho';
export const TELEGRAM_CHAT_ID   = '8798981098';

export const TELEGRAM_CONFIGURED =
  TELEGRAM_BOT_TOKEN !== 'TON_TOKEN_ICI' &&
  TELEGRAM_CHAT_ID   !== 'TON_CHAT_ID_ICI';

// ── Admin ─────────────────────────────────────────────────
// Mot de passe pour la page admin.html
export const ADMIN_PASSWORD = 'Alexis=dictateur';
