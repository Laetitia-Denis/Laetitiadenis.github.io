import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

export const isConfigured =
  SUPABASE_URL && !SUPABASE_URL.startsWith("REMPLACE_MOI") &&
  SUPABASE_ANON_KEY && !SUPABASE_ANON_KEY.startsWith("REMPLACE_MOI");

// On ne charge le SDK Supabase (dépendance CDN) que si l'app est
// réellement configurée : plus rapide, et rend l'écran de config
// utilisable même sans connexion au CDN.
export let supabase = null;
export let loadError = null;

if (isConfigured) {
  try {
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  } catch (err) {
    loadError = err;
  }
}
