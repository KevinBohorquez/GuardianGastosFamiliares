import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config();

export const supabaseUrl = process.env.SUPABASE_URL;
export const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
export const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey || !supabaseAnonKey) {
  throw new Error("Faltan variables de entorno de Supabase (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY)");
}

// Cliente con permisos de administrador (service_role) - Para uso interno del backend (bypassea RLS)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

// Cliente anónimo - Para Auth general
export const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);

// Función para obtener un cliente que actúe en nombre del usuario, respetando RLS
export function getSupabaseForUser(token: string) {
  return createClient(supabaseUrl!, supabaseAnonKey!, {
    global: {
      headers: { Authorization: `Bearer ${token}` }
    }
  });
}
