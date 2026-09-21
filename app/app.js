import { supabase, isConfigured, loadError } from "./supabaseClient.js";
import { computeAssessment, MOOD_TAGS } from "./needsEngine.js";
import { NEED_LABELS, HYPNOSIS_CATEGORY_LABELS, EXTERNAL_RESOURCES } from "./config.js";

const el = document.getElementById("app");

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
  if (!isConfigured || loadError) {
    render();
    return;
  }
  const { data } = await supabase.auth.getSession();
  state.session = data.session;
  supabase.auth.onAuthStateChange((_event, session) => {
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
  const { data: entries } = await supabase
    .from("daily_entries")
    .select("*")
    .eq("user_id", userId)
    .order("entry_date", { ascending: false })
    .limit(14);

  state.recentEntries = entries || [];
  state.todayEntry = state.recentEntries.find((e) => e.entry_date === todayStr()) || null;

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
  state.authError = "";
  state.authMessage = "";
  state.busy = true;
  render();

  if (state.authMode === "signup") {
    const { error } = await supabase.auth.signUp({ email, password });
    state.busy = false;
    if (error) {
      state.authError = translateAuthError(error.message);
    } else {
      state.authMessage = "Compte créé. Vérifie ta boîte mail si une confirmation est requise, puis connecte-toi.";
      state.authMode = "signin";
    }
  } else {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    state.busy = false;
    if (error) {
      state.authError = translateAuthError(error.message);
    }
  }
  render();
}

function translateAuthError(msg) {
  if (/invalid login credentials/i.test(msg)) return "Email ou mot de passe incorrect.";
  if (/already registered/i.test(msg)) return "Un compte existe déjà avec cet email.";
  if (/password/i.test(msg) && /least/i.test(msg)) return "Le mot de passe doit faire au moins 6 caractères.";
  return msg;
}

async function handleSignOut() {
  await supabase.auth.signOut();
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

  const { data, error } = await supabase
    .from("daily_entries")
    .upsert(payload, { onConflict: "user_id,entry_date" })
    .select()
    .single();

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
  const query = supabase.from("hypnosis_sessions").select("*");
  const { data } = category ? await query.eq("need_category", category) : await query;
  state.hypnosisSessions = data || [];
  state.view = "hypnosis";
  render();
}

async function logSession(sessionId, mode) {
  const userId = state.session.user.id;
  await supabase.from("session_logs").insert({
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
  await supabase.from("session_logs").insert({
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
  if (!isConfigured) {
    el.innerHTML = renderSetupWarning();
    return;
  }

  if (loadError) {
    el.innerHTML = `
      <div style="max-width:640px;margin:40px auto;padding:0 20px;">
        <div class="setup-warning">
          <h2 style="margin-bottom:10px;">Connexion impossible</h2>
          <p>Le service n'a pas pu être chargé (réseau coupé ou CDN inaccessible). Vérifie ta connexion et recharge la page.</p>
        </div>
      </div>
    `;
    return;
  }

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
      <h1>Dénoue ✨</h1>
      <div class="tagline">Ton rituel quotidien pour y voir plus clair</div>
    </div>
  `;
}

function renderSetupWarning() {
  return `
    <div id="app-inner" style="max-width:640px;margin:40px auto;padding:0 20px;">
      <div class="setup-warning">
        <h2 style="margin-bottom:10px;">Configuration requise</h2>
        <p>L'app a besoin d'un projet Supabase pour gérer les comptes et sauvegarder tes données entre tes appareils.</p>
        <p style="margin-top:10px;">Suis les étapes dans <code>/supabase/SETUP.md</code>, puis renseigne <code>SUPABASE_URL</code> et <code>SUPABASE_ANON_KEY</code> dans <code>/app/config.js</code>.</p>
      </div>
    </div>
  `;
}

function renderAuth() {
  const isSignup = state.authMode === "signup";
  return `
    <div style="max-width:420px;margin:60px auto 0;padding:0 20px;">
      ${renderBrand()}
      <div class="card">
        <h2>${isSignup ? "Créer ton espace" : "Content de te revoir"}</h2>
        <p class="muted" style="margin-bottom:16px;">${isSignup ? "Un compte pour retrouver ton suivi partout." : "Connecte-toi pour continuer ton rituel."}</p>
        <form id="auth-form">
          <label>Email</label>
          <input type="email" name="email" required autocomplete="email" />
          <label>Mot de passe</label>
          <input type="password" name="password" required minlength="6" autocomplete="${isSignup ? "new-password" : "current-password"}" />
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

function attachAuthListeners() {
  document.getElementById("auth-form")?.addEventListener("submit", handleAuthSubmit);
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
    { key: "hypnosis", label: "Hypnose" },
    { key: "history", label: "Historique" },
  ];
  return `
    <nav class="tabs">
      ${tabs
        .map(
          (t) =>
            `<button data-tab="${t.key}" class="${state.view === t.key ? "active" : ""}">${t.label}</button>`
        )
        .join("")}
      <button data-tab="signout">Déconnexion</button>
    </nav>
  `;
}

function attachGlobalListeners() {
  el.querySelectorAll("[data-tab]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const tab = btn.dataset.tab;
      if (tab === "signout") return handleSignOut();
      if (tab === "hypnosis") return loadHypnosisSessions(state.lastAssessment?.hypnosisCategory || null);
      if (tab === "history") return loadHistoryView();
      state.view = tab;
      render();
    });
  });
}

async function loadHistoryView() {
  state.view = "history";
  render();
}

function renderActiveView() {
  if (state.view === "hypnosis") return renderHypnosis();
  if (state.view === "history") return renderHistory();
  return renderCheckin();
}

// ---------------------------------------------------------------
// CHECK-IN VIEW
// ---------------------------------------------------------------
function renderCheckin() {
  const f = state.form;
  return `
    ${state.todayEntry ? renderAssessmentBanner() : ""}
    <div class="card">
      <h2>Check-in du jour</h2>
      <p class="muted">${new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}</p>
      <form id="checkin-form">
        <h3 style="margin-top:20px;">Humeur</h3>
        <label>Comment tu te sens, globalement <span class="range-value" id="mood-val">${f.mood_score}</span>/10</label>
        <input type="range" min="1" max="10" name="mood_score" value="${f.mood_score}" />

        <label>Ce que tu ressens (choisis ce qui résonne)</label>
        <div class="chips">
          ${MOOD_TAGS.map(
            (tag) =>
              `<div class="chip ${f.mood_tags.includes(tag) ? "selected" : ""}" data-tag="${tag}">${tag}</div>`
          ).join("")}
        </div>

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
}

// ---------------------------------------------------------------
// HYPNOSIS VIEW
// ---------------------------------------------------------------
function renderHypnosis() {
  const category = state.activeHypnosisCategory;
  const categoryLabel = category ? HYPNOSIS_CATEGORY_LABELS[category] : "Toutes catégories";
  const resources = EXTERNAL_RESOURCES.filter((r) => !category || r.category === category || r.category === "general");

  return `
    <div class="card">
      <span class="badge">${categoryLabel}</span>
      <h2 style="margin-top:10px;">Ta séance guidée</h2>
      <p class="muted">Trois façons de faire, choisis ce qui te convient maintenant.</p>
    </div>

    ${
      state.hypnosisSessions.length
        ? state.hypnosisSessions
            .map(
              (s) => `
      <div class="card">
        <h3>Script intégré — ${s.title} <span class="muted">(${s.duration_min} min)</span></h3>
        <div class="script-text">${s.script_text}</div>
        <button class="btn-primary btn-block" data-done="${s.id}">J'ai terminé la séance</button>
      </div>`
            )
            .join("")
        : `<div class="card"><p class="muted">Aucun script pour l'instant. Lance un check-in pour qu'une catégorie te soit proposée.</p></div>`
    }

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

function attachHypnosisListeners() {
  el.querySelectorAll("[data-done]").forEach((btn) => {
    btn.addEventListener("click", () => handleSessionDone(btn.dataset.done));
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

init();
