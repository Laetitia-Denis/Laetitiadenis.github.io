// ============================================================
// Adaptateur "mode démo locale" — même interface que supabaseAdapter,
// mais tout est stocké dans localStorage. Zéro backend, zéro réseau.
// Un seul utilisateur local, pas de vraie authentification.
// ============================================================

import { HYPNOSIS_CATALOG } from "./hypnosisContent.js";
import { NEWS_SEED } from "./newsContent.js";

const ENTRIES_KEY = "denoue_local_entries";
const LOGS_KEY = "denoue_local_logs";
const SESSION_KEY = "denoue_local_session";
const LOCAL_USER_ID = "local-demo";

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // stockage plein ou indisponible (navigation privée) : on ignore silencieusement
  }
}

const authListeners = [];

export const localAdapter = {
  mode: "local",

  async getSession() {
    return read(SESSION_KEY, null);
  },

  onAuthChange(cb) {
    authListeners.push(cb);
  },

  async startDemo(displayName, contributesToImprovement = false) {
    const session = {
      user: {
        id: LOCAL_USER_ID,
        email: displayName ? `${displayName} (local)` : "démo locale",
        contributes_to_improvement: contributesToImprovement,
      },
    };
    write(SESSION_KEY, session);
    authListeners.forEach((cb) => cb("SIGNED_IN", session));
    return session;
  },

  async signOut() {
    localStorage.removeItem(SESSION_KEY);
    authListeners.forEach((cb) => cb("SIGNED_OUT", null));
  },

  async fetchRecentEntries(userId, limit = 14) {
    const all = read(ENTRIES_KEY, []);
    return all
      .filter((e) => e.user_id === userId)
      .sort((a, b) => (a.entry_date < b.entry_date ? 1 : -1))
      .slice(0, limit);
  },

  async upsertEntry(payload) {
    const all = read(ENTRIES_KEY, []);
    const idx = all.findIndex((e) => e.user_id === payload.user_id && e.entry_date === payload.entry_date);
    const record = {
      id: idx >= 0 ? all[idx].id : crypto.randomUUID(),
      created_at: idx >= 0 ? all[idx].created_at : new Date().toISOString(),
      ...payload,
    };
    if (idx >= 0) all[idx] = record;
    else all.push(record);
    write(ENTRIES_KEY, all);
    return { data: record, error: null };
  },

  async fetchHypnosisSessions(category) {
    return category ? HYPNOSIS_CATALOG.filter((s) => s.need_category === category) : HYPNOSIS_CATALOG;
  },

  async insertSessionLog(log) {
    const all = read(LOGS_KEY, []);
    all.push({ id: crypto.randomUUID(), completed_at: new Date().toISOString(), ...log });
    write(LOGS_KEY, all);
    return { error: null };
  },

  async fetchNews() {
    return NEWS_SEED;
  },

  async fetchProfile(userId) {
    const session = read(SESSION_KEY, null);
    return {
      id: userId,
      display_name: session?.user?.email || "démo",
      is_admin: true, // seule utilisatrice en mode démo : toujours admin pour prévisualiser Insights
      contributes_to_improvement: !!session?.user?.contributes_to_improvement,
    };
  },

  async fetchInsights() {
    const session = read(SESSION_KEY, null);
    if (!session?.user?.contributes_to_improvement) return [];
    const all = read(ENTRIES_KEY, []);
    return all
      .filter((e) => e.user_id === LOCAL_USER_ID && e.journal_text)
      .sort((a, b) => (a.entry_date < b.entry_date ? 1 : -1))
      .slice(0, 100)
      .map((e) => ({
        journal_text: e.journal_text,
        primary_need: e.primary_need,
        hypnosis_category: e.hypnosis_category,
        entry_date: e.entry_date,
      }));
  },
};
