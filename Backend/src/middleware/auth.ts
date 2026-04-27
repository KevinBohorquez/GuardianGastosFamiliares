import { Request, Response, NextFunction } from "express";
import { supabaseAnon, supabaseAdmin } from "../supabase.js";

export interface AuthedRequest extends Request {
  user?: { id: string; email: string };
  familyId?: string;
}

/**
 * Valida el JWT de Supabase enviado en `Authorization: Bearer <token>`,
 * inyecta `req.user` y resuelve `req.familyId` desde la tabla `families`.
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

  // Resolver familia (1:1 con auth.users)
  const { data: fam, error: famErr } = await supabaseAdmin
    .from("families")
    .select("id")
    .eq("user_id", req.user.id)
    .maybeSingle();

  if (famErr) return res.status(500).json({ error: famErr.message });
  if (!fam) return res.status(404).json({ error: "Familia no encontrada para este usuario" });

  req.familyId = fam.id;
  next();
}