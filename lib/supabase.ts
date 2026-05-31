import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// The service role key is a full-access password to the database. It lives
// ONLY here, on the server — it must never be shipped to the browser.
const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// `null` when the env vars aren't set. Callers fall back to the in-memory
// store, so the app still runs without a configured database.
export const supabase: SupabaseClient | null =
  url && serviceKey ? createClient(url, serviceKey) : null;
