import { Router } from "express";
import { z } from "zod";
import { requireAuth, AuthedRequest } from "../middleware/auth.js";

export const profileRouter = Router();
profileRouter.use(requireAuth);

profileRouter.get("/me", async (req: AuthedRequest, res) => {
  const { data, error } = await req.supabase!
    .from("profiles")
    .select("*")
    .eq("id", req.user!.id)
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json({
    id: data.id,
    name: data.name,
    monthlyIncome: Number(data.monthly_income),
    expenseRatioThreshold: Number(data.expense_ratio_threshold),
    color: data.color,
  });
});

const UpdateProfileSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  monthlyIncome: z.number().min(0).optional(),
  expenseRatioThreshold: z.number().min(0).max(1).optional(),
  color: z.string().optional(),
});

profileRouter.patch("/me", async (req: AuthedRequest, res) => {
  const p = UpdateProfileSchema.safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: p.error.flatten().fieldErrors });

  const patch: Record<string, unknown> = {};
  if (p.data.name !== undefined) patch.name = p.data.name;
  if (p.data.monthlyIncome !== undefined) patch.monthly_income = p.data.monthlyIncome;
  if (p.data.expenseRatioThreshold !== undefined) patch.expense_ratio_threshold = p.data.expenseRatioThreshold;
  if (p.data.color !== undefined) patch.color = p.data.color;

  const { data, error } = await req.supabase!
    .from("profiles")
    .update(patch)
    .eq("id", req.user!.id)
    .select("*")
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json({
    id: data.id,
    name: data.name,
    monthlyIncome: Number(data.monthly_income),
    expenseRatioThreshold: Number(data.expense_ratio_threshold),
    color: data.color,
  });
});
