import { Router } from "express";
import { z } from "zod";
import { requireAuth, AuthedRequest } from "../middleware/auth.js";
import { supabaseAdmin } from "../supabase.js";

export const membersRouter = Router();
membersRouter.use(requireAuth);

const mapRow = (r: any) => ({
  id: r.id,
  familyId: r.family_id,
  name: r.name,
  monthlyIncome: Number(r.monthly_income),
  color: r.color,
  createdAt: r.created_at,
});

membersRouter.get("/", async (req: AuthedRequest, res) => {
  const { data, error } = await supabaseAdmin
    .from("members")
    .select("*")
    .eq("family_id", req.familyId!)
    .order("created_at", { ascending: true });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data.map(mapRow));
});

const CreateSchema = z.object({
  name: z.string().min(1).max(40),
  monthlyIncome: z.number().min(0),
  color: z.string().min(1),
});

membersRouter.post("/", async (req: AuthedRequest, res) => {
  const p = CreateSchema.safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: p.error.flatten().fieldErrors });
  const { data, error } = await supabaseAdmin
    .from("members")
    .insert({
      family_id: req.familyId!,
      name: p.data.name,
      monthly_income: p.data.monthlyIncome,
      color: p.data.color,
    })
    .select("*")
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(mapRow(data));
});

const UpdateSchema = z.object({
  name: z.string().min(1).max(40).optional(),
  monthlyIncome: z.number().min(0).optional(),
});

membersRouter.patch("/:id", async (req: AuthedRequest, res) => {
  const p = UpdateSchema.safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: p.error.flatten().fieldErrors });
  const patch: Record<string, unknown> = {};
  if (p.data.name !== undefined) patch.name = p.data.name;
  if (p.data.monthlyIncome !== undefined) patch.monthly_income = p.data.monthlyIncome;

  const { data, error } = await supabaseAdmin
    .from("members")
    .update(patch)
    .eq("id", req.params.id)
    .eq("family_id", req.familyId!)
    .select("*")
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(mapRow(data));
});

membersRouter.delete("/:id", async (req: AuthedRequest, res) => {
  const { error } = await supabaseAdmin
    .from("members")
    .delete()
    .eq("id", req.params.id)
    .eq("family_id", req.familyId!);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});