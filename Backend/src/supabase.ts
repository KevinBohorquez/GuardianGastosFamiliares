import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey || !supabaseAnonKey) {
  throw new Error("Faltan variables de entorno de Supabase (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY)");
}

// Cliente con permisos de administrador (service_role) - Para uso interno del backend (bypassea RLS)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

// Cliente anónimo - Para validar sesiones y acciones permitidas
export const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);
