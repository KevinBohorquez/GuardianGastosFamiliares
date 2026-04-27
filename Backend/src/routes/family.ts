import { Router } from "express";
import { requireAuth, AuthedRequest } from "../middleware/auth.js";
import { supabaseAdmin } from "../supabase.js";

export const familyRouter = Router();

familyRouter.get("/me", requireAuth, async (req: AuthedRequest, res) => {
  const { data, error } = await supabaseAdmin
    .from("families")
    .select("id, family_name, created_at")
    .eq("id", req.familyId!)
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.json({
    id: data.id,
    familyName: data.family_name,
    email: req.user!.email,
    createdAt: data.created_at,
  });
});