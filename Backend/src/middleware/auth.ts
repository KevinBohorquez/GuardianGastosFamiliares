import { Request, Response, NextFunction } from "express";
import { supabaseAnon, getSupabaseForUser } from "../supabase.js";
import { SupabaseClient } from "@supabase/supabase-js";

export interface AuthedRequest extends Request {
  user?: { id: string; email: string };
  supabase?: SupabaseClient;
}

/**
 * Valida el JWT de Supabase enviado en `Authorization: Bearer <token>`,
 * inyecta `req.user` y un cliente `req.supabase` que respeta RLS.
 */
export async function requireAuth(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Falta token" });

  const { data, error } = await supabaseAnon.auth.getUser(token);
  if (error || !data.user) return res.status(401).json({ error: "Token inválido" });

  req.user = { id: data.user.id, email: data.user.email ?? "" };
  req.supabase = getSupabaseForUser(token);
  next();
}