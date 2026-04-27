import { Router } from "express";
import { z } from "zod";
import { requireAuth, AuthedRequest } from "../middleware/auth.js";
import { supabaseAdmin } from "../supabase.js";

export const expensesRouter = Router();
expensesRouter.use(requireAuth);

const CATEGORIES = [
  "Alimentación",
  "Transporte",
  "Entretenimiento",
  "Salud",
  "Vivienda",
  "Otros",
] as const;

const mapRow = (r: any) => ({
  id: r.id,
  familyId: r.family_id,
  memberId: r.member_id,
  description: r.description,
  amount: Number(r.amount),
  date: r.date,
  category: r.category,
  createdAt: r.created_at,
});

expensesRouter.get("/", async (req: AuthedRequest, res) => {
  const { data, error } = await supabaseAdmin
    .from("expenses")
    .select("*")
    .eq("family_id", req.familyId!)
    .order("date", { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data.map(mapRow));
});

expensesRouter.get("/paginated", async (req: AuthedRequest, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 15;
  const memberId = req.query.memberId as string;
  const category = req.query.category as string;
  const fromDate = req.query.from as string;
  const toDate = req.query.to as string;

  let query = supabaseAdmin
    .from("expenses")
    .select("*", { count: "exact" })
    .eq("family_id", req.familyId!);

  if (memberId && memberId !== "all") query = query.eq("member_id", memberId);
  if (category && category !== "all") query = query.eq("category", category);
  if (fromDate) query = query.gte("date", fromDate);
  if (toDate) query = query.lte("date", toDate + " 23:59:59");

  const fromIdx = (page - 1) * limit;
  const toIdx = fromIdx + limit - 1;

  const { data, count, error } = await query
    .order("date", { ascending: false })
    .range(fromIdx, toIdx);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ data: data.map(mapRow), total: count || 0 });
});

expensesRouter.get("/export", async (req: AuthedRequest, res) => {
  const memberId = req.query.memberId as string;
  const category = req.query.category as string;
  const fromDate = req.query.from as string;
  const toDate = req.query.to as string;

  let query = supabaseAdmin
    .from("expenses")
    .select("*")
    .eq("family_id", req.familyId!);

  if (memberId && memberId !== "all") query = query.eq("member_id", memberId);
  if (category && category !== "all") query = query.eq("category", category);
  if (fromDate) query = query.gte("date", fromDate);
  if (toDate) query = query.lte("date", toDate + " 23:59:59");

  const { data, error } = await query.order("date", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data.map(mapRow));
});

const CreateSchema = z.object({
  memberId: z.string().uuid(),
  description: z.string().min(1).max(120),
  amount: z.number().positive(),
  date: z.string().min(8),
  category: z.enum(CATEGORIES),
});

expensesRouter.post("/", async (req: AuthedRequest, res) => {
  const p = CreateSchema.safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: p.error.flatten().fieldErrors });

  // Verifica que el member pertenezca a la familia
  const { data: m } = await supabaseAdmin
    .from("members")
    .select("id")
    .eq("id", p.data.memberId)
    .eq("family_id", req.familyId!)
    .maybeSingle();
  if (!m) return res.status(403).json({ error: "Miembro no pertenece a la familia" });

  const { data, error } = await supabaseAdmin
    .from("expenses")
    .insert({
      family_id: req.familyId!,
      member_id: p.data.memberId,
      description: p.data.description,
      amount: p.data.amount,
      date: p.data.date.slice(0, 10),
      category: p.data.category,
    })
    .select("*")
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(mapRow(data));
});

const UpdateSchema = z.object({
  description: z.string().min(1).max(120).optional(),
  amount: z.number().positive().optional(),
  date: z.string().min(8).optional(),
  category: z.enum(CATEGORIES).optional(),
});

expensesRouter.patch("/:id", async (req: AuthedRequest, res) => {
  const p = UpdateSchema.safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: p.error.flatten().fieldErrors });
  const patch: Record<string, unknown> = { ...p.data };
  if (typeof patch.date === "string") patch.date = (patch.date as string).slice(0, 10);

  const { data, error } = await supabaseAdmin
    .from("expenses")
    .update(patch)
    .eq("id", req.params.id)
    .eq("family_id", req.familyId!)
    .select("*")
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(mapRow(data));
});

expensesRouter.delete("/:id", async (req: AuthedRequest, res) => {
  const { error } = await supabaseAdmin
    .from("expenses")
    .delete()
    .eq("id", req.params.id)
    .eq("family_id", req.familyId!);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});