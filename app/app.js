import { isConfigured, loadError } from "./supabaseClient.js";
import { localAdapter } from "./localAdapter.js";
import { supabaseAdapter } from "./supabaseAdapter.js";
import { computeAssessment, computeTensionStreak, MOOD_TAGS } from "./needsEngine.js";
import { NEED_LABELS, HYPNOSIS_CATEGORY_LABELS, EXTERNAL_RESOURCES, BOOKING_URL } from "./config.js";
import { pickMantra } from "./mantras.js";
import { boostFor } from "./boostContent.js";
import { wordFrequency } from "./insightsEngine.js";

const PREMIUM_NUDGE_STREAK = 3;
const INSIGHT_CATEGORIES = [
  { key: "stress", label: "Stress" },
  { key: "lacher_prise", label: "Lâcher-prise" },
  { key: "confiance", label: "Confiance" },
  { key: "sommeil", label: "Sommeil" },
  { key: "energie", label: "Énergie" },
];

const SUPPORT_MODES = [
  { key: "audio", icon: "🎧", label: "Audio guidé" },
  { key: "boost", icon: "⚡", label: "Coup de boost" },
  { key: "rdv", icon: "📅", label: "Entretien" },
];

const el = document.getElementById("app");

// Sans config Supabase valide, ou si le SDK n'a pas pu être chargé
// (réseau coupé), on bascule automatiquement en mode démo locale :
// l'app reste utilisable, les données vivent dans localStorage.
const useLocal = !isConfigured || !!loadError;
const adapter = useLocal ? localAdapter : supabaseAdapter;

const state = {
  session: null,
  view: "auth", // auth | checkin | hypnosis | history
  authMode: "signin", // signin | signup
  todayEntry: null,
  recentEntries: [],
  form: defaultForm(),
  lastAssessment: null,
  hypnosisSessions: [],
  activeHypnosisCategory: null,
  supportMode: "audio", // audio | boost | rdv
  newsPosts: [],
  newsLoaded: false,
  profile: null,
  tensionStreak: 0,
  insights: [],
  insightsLoaded: false,
  authError: "",
  authMessage: "",
  busy: false,
};

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function defaultForm() {
  return {
    mood_score: 6,
    mood_tags: [],
    energy_level: 6,
    stress_level: 4,
    sleep_hours: 7,
    sleep_quality: 3,
    moved: false,
    sport_type: "",
    sport_duration_min: 0,
    sport_intensity: "léger",
    nutrition_quality: 3,
    nutrition_notes: "",
    water_liters: 1.5,
    journal_text: "",
    tomorrow_intention: "",
  };
}

// ---------------------------------------------------------------
// BOOTSTRAP
// ---------------------------------------------------------------
async function init() {
  state.session = await adapter.getSession();
  adapter.onAuthChange((_event, session) => {
    state.session = session;
    if (session) {
      state.view = "checkin";
      loadData();
    } else {
      state.view = "auth";
      render();
    }
  });
  if (state.session) {
    state.view = "checkin";
    await loadData();
  } else {
    render();
  }
}

async function loadData() {
  const userId = state.session.user.id;
  const [entries, profile, news] = await Promise.all([
    adapter.fetchRecentEntries(userId, 14),
    adapter.fetchProfile(userId),
    adapter.fetchNews(),
  ]);

  state.recentEntries = entries || [];
  state.profile = profile || null;
  state.newsPosts = news || [];
  state.newsLoaded = true;
  state.todayEntry = state.recentEntries.find((e) => e.entry_date === todayStr()) || null;
  state.tensionStreak = computeTensionStreak(state.recentEntries);

  if (state.todayEntry) {
    state.form = { ...defaultForm(), ...state.todayEntry };
    state.lastAssessment = {
      tensionScore: state.todayEntry.tension_score,
      primaryNeed: state.todayEntry.primary_need,
      hypnosisCategory: state.todayEntry.hypnosis_category,
      reasons: [],
    };
  }
  render();
}

// ---------------------------------------------------------------
// AUTH ACTIONS
// ---------------------------------------------------------------
async function handleAuthSubmit(e) {
  e.preventDefault();
  const email = e.target.email.value.trim();
  const password = e.target.password.value;
  const contributesToImprovement = e.target.contributesToImprovement?.checked || false;
  state.authError = "";
  state.authMessage = "";
  state.busy = true;
  render();

  if (state.authMode === "signup") {
    const { error } = await adapter.signUp(email, password, { contributes_to_improvement: contributesToImprovement });
    state.busy = false;
    if (error) {
      state.authError = translateAuthError(error.message);
    } else {
      state.authMessage = "Compte créé. Vérifie ta boîte mail si une confirmation est requise, puis connecte-toi.";
      state.authMode = "signin";
    }
  } else {
    const { error } = await adapter.signInWithPassword(email, password);
    state.busy = false;
    if (error) {
      state.authError = translateAuthError(error.message);
    }
  }
  render();
}

async function handleDemoStart(e) {
  e.preventDefault();
  const displayName = e.target.displayName.value.trim();
  const contributesToImprovement = e.target.contributesToImprovement?.checked || false;
  await adapter.startDemo(displayName, contributesToImprovement);
}

function translateAuthError(msg) {
  if (/invalid login credentials/i.test(msg)) return "Email ou mot de passe incorrect.";
  if (/already registered/i.test(msg)) return "Un compte existe déjà avec cet email.";
  if (/password/i.test(msg) && /least/i.test(msg)) return "Le mot de passe doit faire au moins 6 caractères.";
  return msg;
}

async function handleSignOut() {
  await adapter.signOut();
}

// ---------------------------------------------------------------
// CHECK-IN
// ---------------------------------------------------------------
async function handleCheckinSubmit(e) {
  e.preventDefault();
  state.busy = true;
  render();

  const userId = state.session.user.id;
  const entryDraft = { ...state.form, user_id: userId, entry_date: todayStr() };

  const recentExcludingToday = state.recentEntries.filter((e) => e.entry_date !== todayStr());
  const assessment = computeAssessment(entryDraft, recentExcludingToday);

  const payload = {
    ...entryDraft,
    tension_score: assessment.tensionScore,
    primary_need: assessment.primaryNeed,
    hypnosis_category: assessment.hypnosisCategory,
  };

  const { data, error } = await adapter.upsertEntry(payload);

  state.busy = false;

  if (error) {
    alert("Erreur d'enregistrement : " + error.message);
    render();
    return;
  }

  state.todayEntry = data;
  state.lastAssessment = assessment;
  const others = state.recentEntries.filter((e) => e.entry_date !== todayStr());
  state.recentEntries = [data, ...others];
  state.tensionStreak = computeTensionStreak(state.recentEntries);
  render();
}

function updateForm(key, value) {
  state.form[key] = value;
}

function toggleMoodTag(tag) {
  const tags = state.form.mood_tags || [];
  state.form.mood_tags = tags.includes(tag) ? tags.filter((t) => t !== tag) : [...tags, tag];
  render();
}

// ---------------------------------------------------------------
// HYPNOSIS
// ---------------------------------------------------------------
async function loadHypnosisSessions(category) {
  state.activeHypnosisCategory = category;
  state.hypnosisSessions = await adapter.fetchHypnosisSessions(category);
  state.view = "hypnosis";
  render();
}

async function logSession(sessionId, mode) {
  const userId = state.session.user.id;
  await adapter.insertSessionLog({
    user_id: userId,
    hypnosis_session_id: sessionId || null,
    entry_date: todayStr(),
    mode,
  });
}

async function handleSessionDone(sessionId) {
  const before = prompt("Comment te sentais-tu avant, de 1 (très mal) à 10 (très bien) ?", "4");
  const after = prompt("Et maintenant, après la séance, de 1 à 10 ?", "7");
  const userId = state.session.user.id;
  await adapter.insertSessionLog({
    user_id: userId,
    hypnosis_session_id: sessionId,
    entry_date: todayStr(),
    mode: "script",
    feeling_before: before ? parseInt(before, 10) : null,
    feeling_after: after ? parseInt(after, 10) : null,
  });
  alert("Séance enregistrée. Prends soin de toi. 🤍");
  render();
}

async function handleSnooze() {
  await logSession(null, "rappel");
  alert("D'accord, on se le redit plus tard aujourd'hui.");
}

// ---------------------------------------------------------------
// RENDER
// ---------------------------------------------------------------
function render() {
  if (!state.session) {
    el.innerHTML = renderAuth();
    attachAuthListeners();
    return;
  }

  el.innerHTML = `
    ${renderBrand()}
    ${renderTabs()}
    <div id="view-container">${renderActiveView()}</div>
  `;
  attachGlobalListeners();
  if (state.view === "checkin") attachCheckinListeners();
  if (state.view === "hypnosis") attachHypnosisListeners();
}

function renderBrand() {
  return `
    <div class="brand">
      <h1>Dénoue <span class="sparkle">✨</span></h1>
      <div class="tagline">Ton rituel quotidien pour y voir plus clair</div>
      <div class="divider"></div>
      ${useLocal ? `<div><span class="badge">Mode démo locale — données sur cet appareil</span></div>` : ""}
    </div>
  `;
}

function renderAuth() {
  return useLocal ? renderAuthLocal() : renderAuthSupabase();
}

function renderAuthLocal() {
  const reasonNote =
    isConfigured && loadError
      ? "Le service en ligne n'a pas pu être joint (réseau coupé) — tu continues en local en attendant."
      : "Teste tout le rituel sans créer de compte. Tes données restent uniquement dans ce navigateur.";
  return `
    <div style="max-width:420px;margin:60px auto 0;padding:0 20px;">
      ${renderBrand()}
      <div class="card">
        <span class="badge">Mode démo locale</span>
        <h2 style="margin-top:10px;">Essaie l'app tout de suite</h2>
        <div class="divider-left"></div>
        <p class="muted" style="margin-bottom:16px;">${reasonNote}</p>
        <form id="demo-form">
          <label>Ton prénom (facultatif)</label>
          <input type="text" name="displayName" placeholder="Laëtitia" />
          ${renderConsentCheckbox()}
          <button type="submit" class="btn-primary btn-block">Commencer en local</button>
        </form>
      </div>
      <p class="muted center" style="margin-top:14px;">Pour activer les comptes et la synchro multi-appareils : <code>/supabase/SETUP.md</code>.</p>
    </div>
  `;
}

function renderAuthSupabase() {
  const isSignup = state.authMode === "signup";
  return `
    <div style="max-width:420px;margin:60px auto 0;padding:0 20px;">
      ${renderBrand()}
      <div class="card">
        <h2>${isSignup ? "Créer ton espace" : "Content de te revoir"}</h2>
        <div class="divider-left"></div>
        <p class="muted" style="margin-bottom:16px;">${isSignup ? "Un compte pour retrouver ton suivi partout." : "Connecte-toi pour continuer ton rituel."}</p>
        <form id="auth-form">
          <label>Email</label>
          <input type="email" name="email" required autocomplete="email" />
          <label>Mot de passe</label>
          <input type="password" name="password" required minlength="6" autocomplete="${isSignup ? "new-password" : "current-password"}" />
          ${isSignup ? renderConsentCheckbox() : ""}
          ${state.authError ? `<div class="error-text">${state.authError}</div>` : ""}
          ${state.authMessage ? `<div class="success-text">${state.authMessage}</div>` : ""}
          <button type="submit" class="btn-primary btn-block" ${state.busy ? "disabled" : ""}>
            ${state.busy ? "..." : isSignup ? "Créer mon compte" : "Se connecter"}
          </button>
        </form>
        <div class="center" style="margin-top:14px;">
          <button class="btn-link" id="toggle-auth-mode">
            ${isSignup ? "J'ai déjà un compte" : "Pas encore de compte ? Créer un espace"}
          </button>
        </div>
      </div>
    </div>
  `;
}

function renderConsentCheckbox() {
  return `
    <label style="display:flex;align-items:flex-start;gap:10px;font-weight:400;font-size:13px;margin-top:16px;cursor:pointer;">
      <input type="checkbox" name="contributesToImprovement" style="width:auto;margin-top:3px;accent-color:var(--gold);" />
      <span>J'accepte de participer à l'amélioration de l'application : mes mots (journal), une fois anonymisés, pourront aider à créer de nouveaux contenus (scripts, coups de boost). Facultatif, modifiable à tout moment.</span>
    </label>
  `;
}

function attachAuthListeners() {
  document.getElementById("auth-form")?.addEventListener("submit", handleAuthSubmit);
  document.getElementById("demo-form")?.addEventListener("submit", handleDemoStart);
  document.getElementById("toggle-auth-mode")?.addEventListener("click", () => {
    state.authMode = state.authMode === "signup" ? "signin" : "signup";
    state.authError = "";
    state.authMessage = "";
    render();
  });
}

function renderTabs() {
  const tabs = [
    { key: "checkin", label: "Aujourd'hui" },
    { key: "hypnosis", label: "Soutien" },
    { key: "news", label: "Actualités" },
    { key: "history", label: "Historique" },
  ];
  if (state.profile?.is_admin) tabs.push({ key: "insights", label: "Insights" });
  return `
    <nav class="tabs">
      ${tabs
        .map(
          (t) =>
            `<button data-tab="${t.key}" class="${state.view === t.key ? "active" : ""}">${t.label}</button>`
        )
        .join("")}
      <button data-tab="signout">${useLocal ? "Quitter" : "Déconnexion"}</button>
    </nav>
  `;
}

function attachGlobalListeners() {
  el.querySelectorAll("[data-tab]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const tab = btn.dataset.tab;
      if (tab === "signout") return handleSignOut();
      if (tab === "hypnosis") return loadHypnosisSessions(state.lastAssessment?.hypnosisCategory || "confiance");
      if (tab === "history") return loadHistoryView();
      if (tab === "news") return loadNewsView();
      if (tab === "insights") return loadInsightsView();
      state.view = tab;
      render();
    });
  });
}

async function loadHistoryView() {
  state.view = "history";
  render();
}

async function loadNewsView() {
  state.view = "news";
  if (!state.newsLoaded) {
    state.newsPosts = await adapter.fetchNews();
    state.newsLoaded = true;
  }
  render();
}

async function loadInsightsView() {
  state.view = "insights";
  if (!state.insightsLoaded) {
    state.insights = await adapter.fetchInsights();
    state.insightsLoaded = true;
  }
  render();
}

function renderActiveView() {
  if (state.view === "hypnosis") return renderHypnosis();
  if (state.view === "history") return renderHistory();
  if (state.view === "news") return renderNews();
  if (state.view === "insights") return renderInsights();
  return renderCheckin();
}

// ---------------------------------------------------------------
// CHECK-IN VIEW
// ---------------------------------------------------------------
function renderMantraCard(moodTags) {
  if (!moodTags || !moodTags.length) return "";
  const { text } = pickMantra(moodTags, todayStr());
  return `
    <div class="mantra-card" style="border-radius:12px;padding:16px;margin-top:14px;">
      <div class="mantra-label">Ton mantra du jour</div>
      <div class="mantra-text">"${text}"</div>
    </div>
  `;
}

function renderNextLiveBanner() {
  const upcoming = (state.newsPosts || [])
    .filter((n) => n.event_date && n.event_date >= todayStr())
    .sort((a, b) => (a.event_date < b.event_date ? -1 : 1))[0];
  if (!upcoming) return "";
  const daysLeft = Math.round((new Date(upcoming.event_date) - new Date(todayStr())) / 86400000);
  const when = daysLeft <= 0 ? "aujourd'hui" : daysLeft === 1 ? "demain" : `dans ${daysLeft} jours`;
  return `
    <div class="card" style="border-color:rgba(207,164,90,0.4);">
      <span class="badge">Prochain live — ${when}</span>
      <h2 style="margin-top:10px;">${upcoming.title}</h2>
      <p class="muted">${new Date(upcoming.event_date).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}</p>
      ${upcoming.link_url ? `<a class="resource-link" href="${upcoming.link_url}" target="_blank" rel="noopener" style="margin-top:10px;">En savoir plus →</a>` : ""}
    </div>
  `;
}

function renderPremiumNudge() {
  if (state.tensionStreak < PREMIUM_NUDGE_STREAK) return "";
  return `
    <div class="card need-banner">
      <span class="badge">${state.tensionStreak} jours de tension forte</span>
      <h2 style="margin-top:10px;">Peut-être temps d'aller plus loin</h2>
      <div class="divider-left"></div>
      <p>Une séance ponctuelle aide sur le moment. Mais ${state.tensionStreak} jours de suite à ce niveau, ça mérite un vrai accompagnement — pas juste un audio.</p>
      <button class="btn-primary btn-block" id="goto-rdv" style="margin-top:14px;">Réserver un temps avec moi</button>
    </div>
  `;
}

function renderCheckin() {
  const f = state.form;
  return `
    ${renderNextLiveBanner()}
    ${renderPremiumNudge()}
    ${state.todayEntry ? renderAssessmentBanner() : ""}
    <div class="card">
      <h2>Check-in du jour</h2>
      <p class="muted">${new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}</p>
      <div class="divider-left"></div>
      <form id="checkin-form">
        <h3>Humeur</h3>
        <label>Comment tu te sens, globalement <span class="range-value" id="mood-val">${f.mood_score}</span>/10</label>
        <input type="range" min="1" max="10" name="mood_score" value="${f.mood_score}" />

        <label>Ce que tu ressens (choisis ce qui résonne)</label>
        <div class="chips">
          ${MOOD_TAGS.map(
            (tag) =>
              `<div class="chip ${f.mood_tags.includes(tag) ? "selected" : ""}" data-tag="${tag}">${tag}</div>`
          ).join("")}
        </div>
        ${renderMantraCard(f.mood_tags)}

        <label>Niveau d'énergie <span class="range-value" id="energy-val">${f.energy_level}</span>/10</label>
        <input type="range" min="1" max="10" name="energy_level" value="${f.energy_level}" />

        <label>Niveau de stress <span class="range-value" id="stress-val">${f.stress_level}</span>/10</label>
        <input type="range" min="1" max="10" name="stress_level" value="${f.stress_level}" />

        <h3 style="margin-top:24px;">Sommeil</h3>
        <div class="row">
          <div>
            <label>Heures dormies</label>
            <input type="number" step="0.5" min="0" max="14" name="sleep_hours" value="${f.sleep_hours}" />
          </div>
          <div>
            <label>Qualité <span class="range-value" id="sleepq-val">${f.sleep_quality}</span>/5</label>
            <input type="range" min="1" max="5" name="sleep_quality" value="${f.sleep_quality}" />
          </div>
        </div>

        <h3 style="margin-top:24px;">Activité physique</h3>
        <label>As-tu bougé aujourd'hui ?</label>
        <div class="pill-group">
          <button type="button" data-bool="moved" data-val="true" class="btn-secondary ${f.moved ? "active" : ""}">Oui</button>
          <button type="button" data-bool="moved" data-val="false" class="btn-secondary ${!f.moved ? "active" : ""}">Non</button>
        </div>
        <div id="sport-details" style="${f.moved ? "" : "display:none;"}">
          <label>Type d'activité</label>
          <input type="text" name="sport_type" value="${f.sport_type || ""}" placeholder="marche, yoga, muscu..." />
          <div class="row">
            <div>
              <label>Durée (minutes)</label>
              <input type="number" name="sport_duration_min" value="${f.sport_duration_min || 0}" />
            </div>
            <div>
              <label>Intensité</label>
              <select name="sport_intensity">
                ${["léger", "modéré", "intense"]
                  .map((i) => `<option value="${i}" ${f.sport_intensity === i ? "selected" : ""}>${i}</option>`)
                  .join("")}
              </select>
            </div>
          </div>
        </div>

        <h3 style="margin-top:24px;">Alimentation</h3>
        <label>Qualité globale <span class="range-value" id="nutq-val">${f.nutrition_quality}</span>/5</label>
        <input type="range" min="1" max="5" name="nutrition_quality" value="${f.nutrition_quality}" />
        <label>Notes (facultatif)</label>
        <input type="text" name="nutrition_notes" value="${f.nutrition_notes || ""}" placeholder="repas sautés, sucre, bien équilibré..." />
        <label>Eau bue (litres)</label>
        <input type="number" step="0.25" name="water_liters" value="${f.water_liters}" />

        <h3 style="margin-top:24px;">Ce qui a besoin d'être dénoué</h3>
        <label>Ton journal du jour</label>
        <textarea name="journal_text" placeholder="Qu'est-ce qui te traverse aujourd'hui ?">${f.journal_text || ""}</textarea>
        <label>Une intention pour demain</label>
        <input type="text" name="tomorrow_intention" value="${f.tomorrow_intention || ""}" />

        <button type="submit" class="btn-primary btn-block" style="margin-top:24px;" ${state.busy ? "disabled" : ""}>
          ${state.busy ? "Enregistrement..." : state.todayEntry ? "Mettre à jour mon check-in" : "Valider mon check-in"}
        </button>
      </form>
    </div>
  `;
}

function renderAssessmentBanner() {
  const a = state.lastAssessment;
  if (!a) return "";
  const label = NEED_LABELS[a.primaryNeed] || a.primaryNeed;
  return `
    <div class="card need-banner">
      <span class="badge">Besoin détecté aujourd'hui</span>
      <h2 style="margin-top:10px;">${label}</h2>
      ${a.reasons?.length ? `<p class="muted" style="margin-top:4px;">${a.reasons.join(" ")}</p>` : ""}
      ${
        a.primaryNeed === "hypnose"
          ? `<button class="btn-primary btn-block" id="goto-hypnosis" style="margin-top:14px;">Faire ma séance maintenant</button>`
          : `<p style="margin-top:10px;">${suggestionFor(a.primaryNeed)}</p>`
      }
    </div>
  `;
}

function suggestionFor(need) {
  const map = {
    mouvement: "Même 10 minutes de marche suffisent à relancer ton énergie aujourd'hui.",
    nutrition: "Un repas équilibré et un grand verre d'eau : un petit geste, un vrai effet.",
    sommeil: "Ce soir, essaie de te coucher 30 minutes plus tôt que d'habitude.",
    ancrage: "Prends 2 minutes pour noter une chose dont tu es fière aujourd'hui.",
  };
  return map[need] || "";
}

function attachCheckinListeners() {
  const form = document.getElementById("checkin-form");
  if (!form) return;

  form.addEventListener("submit", handleCheckinSubmit);

  form.querySelectorAll('input[type="range"]').forEach((input) => {
    input.addEventListener("input", () => {
      updateForm(input.name, Number(input.value));
      const map = { mood_score: "mood-val", energy_level: "energy-val", stress_level: "stress-val", sleep_quality: "sleepq-val", nutrition_quality: "nutq-val" };
      const target = document.getElementById(map[input.name]);
      if (target) target.textContent = input.value;
    });
  });

  form.querySelectorAll('input[type="text"], input[type="number"], textarea, select').forEach((input) => {
    input.addEventListener("change", () => updateForm(input.name, input.value));
  });

  el.querySelectorAll(".chip").forEach((chip) => {
    chip.addEventListener("click", () => toggleMoodTag(chip.dataset.tag));
  });

  el.querySelectorAll("[data-bool]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const val = btn.dataset.val === "true";
      updateForm(btn.dataset.bool, val);
      render();
    });
  });

  document.getElementById("goto-hypnosis")?.addEventListener("click", () => {
    loadHypnosisSessions(state.lastAssessment.hypnosisCategory);
  });

  document.getElementById("goto-rdv")?.addEventListener("click", () => {
    state.supportMode = "rdv";
    loadHypnosisSessions(state.lastAssessment?.hypnosisCategory || "confiance");
  });
}

// ---------------------------------------------------------------
// HYPNOSIS VIEW
// ---------------------------------------------------------------
function renderHypnosis() {
  const category = state.activeHypnosisCategory || "confiance";
  const categoryLabel = HYPNOSIS_CATEGORY_LABELS[category] || "Ancrage général";
  const resources = EXTERNAL_RESOURCES.filter((r) => !category || r.category === category || r.category === "general");

  return `
    <div class="card">
      <span class="badge">${categoryLabel}</span>
      <h2 style="margin-top:10px;">De quoi as-tu besoin maintenant ?</h2>
      <div class="divider-left"></div>
      <div class="mode-cards">
        ${SUPPORT_MODES.map(
          (m) => `
          <div class="mode-card ${state.supportMode === m.key ? "active" : ""}" data-mode="${m.key}">
            <span class="mode-icon">${m.icon}</span>
            <span class="mode-label">${m.label}</span>
          </div>`
        ).join("")}
      </div>
    </div>

    ${renderSupportModeContent(category)}

    <div class="card">
      <h3>Tes ressources existantes</h3>
      ${resources.map((r) => `<a class="resource-link" href="${r.url}" target="_blank" rel="noopener">${r.title} →</a>`).join("") || `<p class="muted">Aucune ressource configurée.</p>`}
    </div>

    <div class="card">
      <h3>Pas maintenant</h3>
      <p class="muted">Reçois juste le rappel, tu t'en occuperas plus tard aujourd'hui.</p>
      <button class="btn-secondary btn-block" id="snooze-btn">Me le rappeler plus tard</button>
    </div>
  `;
}

function renderSupportModeContent(category) {
  if (state.supportMode === "boost") {
    const b = boostFor(category);
    return `
      <div class="card">
        <h3>${b.title} <span class="muted">(${b.duration_min} min)</span></h3>
        <div class="script-text">${b.text}</div>
        <button class="btn-primary btn-block" id="boost-done">C'est fait, merci</button>
      </div>
    `;
  }

  if (state.supportMode === "rdv") {
    const bookingReady = BOOKING_URL && !BOOKING_URL.startsWith("REMPLACE_MOI");
    return `
      <div class="card">
        <h3>Un vrai échange, en visio</h3>
        <p>Parfois, la meilleure séance, c'est d'en parler directement. Réserve un rendez-vous de coaching en visio avec moi.</p>
        ${
          bookingReady
            ? `<a class="btn-primary btn-block" id="booking-link" href="${BOOKING_URL}" target="_blank" rel="noopener" style="display:block;text-align:center;text-decoration:none;margin-top:14px;">Réserver un rendez-vous</a>`
            : `<p class="muted" style="margin-top:10px;">Lien de réservation à configurer dans <code>app/config.js</code> (BOOKING_URL).</p>`
        }
      </div>
    `;
  }

  // mode "audio" par défaut
  return state.hypnosisSessions.length
    ? state.hypnosisSessions
        .map(
          (s) => `
      <div class="card">
        <h3>${s.title} <span class="muted">(${s.duration_min} min)</span></h3>
        <div class="script-text">${s.script_text}</div>
        <button class="btn-primary btn-block" data-done="${s.id}">J'ai terminé la séance</button>
      </div>`
        )
        .join("")
    : `<div class="card"><p class="muted">Aucun script pour l'instant. Lance un check-in pour qu'une catégorie te soit proposée.</p></div>`;
}

function attachHypnosisListeners() {
  el.querySelectorAll("[data-done]").forEach((btn) => {
    btn.addEventListener("click", () => handleSessionDone(btn.dataset.done));
  });
  el.querySelectorAll("[data-mode]").forEach((card) => {
    card.addEventListener("click", () => {
      state.supportMode = card.dataset.mode;
      render();
    });
  });
  document.getElementById("boost-done")?.addEventListener("click", async () => {
    await logSession(null, "boost");
    alert("Bravo, un petit geste qui compte. 🤍");
  });
  document.getElementById("booking-link")?.addEventListener("click", () => {
    logSession(null, "rdv");
  });
  document.getElementById("snooze-btn")?.addEventListener("click", handleSnooze);
}

// ---------------------------------------------------------------
// HISTORY VIEW
// ---------------------------------------------------------------
function renderHistory() {
  if (!state.recentEntries.length) {
    return `<div class="card"><p class="muted">Pas encore d'historique — reviens après ton premier check-in.</p></div>`;
  }
  return `
    <div class="card">
      <h2>Tes 14 derniers jours</h2>
      <div class="divider-left"></div>
      ${state.recentEntries
        .map(
          (e) => `
        <div class="history-item">
          <div>
            <div class="history-date">${new Date(e.entry_date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}</div>
            <div class="history-need">${NEED_LABELS[e.primary_need] || e.primary_need || ""}</div>
          </div>
          <div class="badge">Tension ${e.tension_score ?? "-"}/10</div>
        </div>
      `
        )
        .join("")}
    </div>
  `;
}

// ---------------------------------------------------------------
// NEWS VIEW
// ---------------------------------------------------------------
function renderNews() {
  return `
    <div class="card">
      <h2>Actualités</h2>
      <p class="muted">Retraites, ateliers, lives — ce qui se prépare.</p>
      <div class="divider-left"></div>
      ${
        state.newsPosts.length
          ? state.newsPosts
              .map(
                (n) => `
        <div class="news-item">
          ${n.event_date ? `<div class="news-date">${new Date(n.event_date).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}</div>` : ""}
          <h3>${n.title}</h3>
          <p style="margin-top:6px;">${n.body}</p>
          ${n.link_url ? `<a class="resource-link" href="${n.link_url}" target="_blank" rel="noopener" style="margin-top:10px;">En savoir plus →</a>` : ""}
        </div>`
              )
              .join("")
          : `<p class="muted">Aucune actualité pour le moment.</p>`
      }
    </div>
  `;
}

// ---------------------------------------------------------------
// INSIGHTS VIEW (admin uniquement)
// ---------------------------------------------------------------
function renderInsights() {
  if (!state.insights.length) {
    return `
      <div class="card">
        <h2>Insights</h2>
        <div class="divider-left"></div>
        <p class="muted">Aucun journal exploitable pour l'instant — soit personne n'a encore donné son accord ("participer à l'amélioration"), soit aucun journal n'a encore été rempli.</p>
      </div>
    `;
  }

  const wordsCard = `
    <div class="card">
      <h2>Mots récurrents par besoin</h2>
      <p class="muted">Basé sur ${state.insights.length} entrées de journal, utilisatrices ayant donné leur accord uniquement.</p>
      <div class="divider-left"></div>
      ${INSIGHT_CATEGORIES.map((cat) => {
        const words = wordFrequency(state.insights, cat.key);
        if (!words.length) return "";
        return `
          <h3 style="margin-top:14px;">${cat.label}</h3>
          <div class="chips" style="margin-top:6px;">
            ${words.map(([w, count]) => `<div class="chip">${w} <span class="muted">${count}</span></div>`).join("")}
          </div>
        `;
      }).join("")}
    </div>
  `;

  const excerptsCard = `
    <div class="card">
      <h2>Derniers mots, tels quels</h2>
      <p class="muted">Pour puiser directement dans leurs mots plutôt que les reformuler.</p>
      <div class="divider-left"></div>
      ${state.insights
        .slice(0, 20)
        .map(
          (e) => `
        <div class="history-item" style="align-items:flex-start;">
          <div style="flex:1;">
            <div class="history-date">${new Date(e.entry_date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })} — ${NEED_LABELS[e.primary_need] || e.primary_need || ""}</div>
            <p style="margin-top:4px;font-size:14px;">"${e.journal_text}"</p>
          </div>
        </div>
      `
        )
        .join("")}
    </div>
  `;

  return wordsCard + excerptsCard;
}

init();
