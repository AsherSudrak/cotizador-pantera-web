import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error("Falta SUPABASE_URL en variables de entorno.");
}

if (!serviceRoleKey) {
  throw new Error("Falta SUPABASE_SERVICE_ROLE_KEY en variables de entorno.");
}

export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});
