import { Router } from "express";
import { z } from "zod";
import { supabaseAdmin, supabaseAnon } from "../supabase.js";

export const authRouter = Router();

const SignupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1).max(80),
});

authRouter.post("/signup", async (req, res) => {
  const parsed = SignupSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten().fieldErrors });
  }
  const { email, password, name } = parsed.data;

  // Crea el usuario y confirma el email automáticamente para que pueda loguearse al instante.
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name },
  });
  if (error) return res.status(400).json({ error: error.message });

  // Login inmediato para devolver el token
  const { data: session, error: loginErr } =
    await supabaseAnon.auth.signInWithPassword({ email, password });
  if (loginErr) return res.status(400).json({ error: loginErr.message });

  res.json({
    accessToken: session.session?.access_token,
    refreshToken: session.session?.refresh_token,
    user: { id: session.user!.id, email: session.user!.email },
  });
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

authRouter.post("/login", async (req, res) => {
  const parsed = LoginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Datos inválidos" });

  const { data, error } = await supabaseAnon.auth.signInWithPassword(parsed.data);
  if (error) return res.status(401).json({ error: "Credenciales incorrectas" });

  res.json({
    accessToken: data.session?.access_token,
    refreshToken: data.session?.refresh_token,
    user: { id: data.user!.id, email: data.user!.email },
  });
});

authRouter.post("/logout", async (_req, res) => {
  // Stateless JWT: el cliente solo descarta el token.
  res.json({ ok: true });
});