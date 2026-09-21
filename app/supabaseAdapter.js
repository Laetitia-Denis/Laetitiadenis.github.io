// ============================================================
// Adaptateur Supabase — même interface que localAdapter, branché
// sur le vrai backend (comptes + synchro multi-appareils).
// ============================================================

import { supabase } from "./supabaseClient.js";

export const supabaseAdapter = {
  mode: "supabase",

  async getSession() {
    const { data } = await supabase.auth.getSession();
    return data.session;
  },

  onAuthChange(cb) {
    supabase.auth.onAuthStateChange(cb);
  },

  async signUp(email, password) {
    return supabase.auth.signUp({ email, password });
  },

  async signInWithPassword(email, password) {
    return supabase.auth.signInWithPassword({ email, password });
  },

  async signOut() {
    return supabase.auth.signOut();
  },

  async fetchRecentEntries(userId, limit = 14) {
    const { data } = await supabase
      .from("daily_entries")
      .select("*")
      .eq("user_id", userId)
      .order("entry_date", { ascending: false })
      .limit(limit);
    return data || [];
  },

  async upsertEntry(payload) {
    return supabase
      .from("daily_entries")
      .upsert(payload, { onConflict: "user_id,entry_date" })
      .select()
      .single();
  },

  async fetchHypnosisSessions(category) {
    const query = supabase.from("hypnosis_sessions").select("*");
    const { data } = category ? await query.eq("need_category", category) : await query;
    return data || [];
  },

  async insertSessionLog(log) {
    return supabase.from("session_logs").insert(log);
  },
};
