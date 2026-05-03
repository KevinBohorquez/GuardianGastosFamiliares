import { Router } from "express";
import { z } from "zod";
import { requireAuth, AuthedRequest } from "../middleware/auth.js";

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
  userId: r.user_id,
  description: r.description,
  amount: Number(r.amount),
  date: r.date,
  category: r.category,
  createdAt: r.created_at,
});

expensesRouter.get("/", async (req: AuthedRequest, res) => {
  // Gracias a RLS, req.supabase solo devolverá los gastos a los que el usuario tiene acceso
  // (los suyos, y los de los miembros aceptados si es líder)
  const { data, error } = await req.supabase!
    .from("expenses")
    .select("*")
    .order("date", { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data.map(mapRow));
});

expensesRouter.get("/paginated", async (req: AuthedRequest, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 15;
  const userId = req.query.userId as string;
  const category = req.query.category as string;
  const fromDate = req.query.from as string;
  const toDate = req.query.to as string;

  let query = req.supabase!
    .from("expenses")
    .select("*", { count: "exact" });

  if (userId && userId !== "all") query = query.eq("user_id", userId);
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
  const userId = req.query.userId as string;
  const category = req.query.category as string;
  const fromDate = req.query.from as string;
  const toDate = req.query.to as string;

  let query = req.supabase!
    .from("expenses")
    .select("*");

  if (userId && userId !== "all") query = query.eq("user_id", userId);
  if (category && category !== "all") query = query.eq("category", category);
  if (fromDate) query = query.gte("date", fromDate);
  if (toDate) query = query.lte("date", toDate + " 23:59:59");

  const { data, error } = await query.order("date", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data.map(mapRow));
});

const CreateSchema = z.object({
  description: z.string().min(1).max(120),
  amount: z.number().positive(),
  date: z.string().min(8),
  category: z.enum(CATEGORIES),
});

expensesRouter.post("/", async (req: AuthedRequest, res) => {
  const p = CreateSchema.safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: p.error.flatten().fieldErrors });

  // Por RLS, un usuario solo puede insertar gastos para sí mismo (user_id = auth.uid())
  const { data, error } = await req.supabase!
    .from("expenses")
    .insert({
      user_id: req.user!.id,
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

  const { data, error } = await req.supabase!
    .from("expenses")
    .update(patch)
    .eq("id", req.params.id)
    .select("*")
    .single();
    
  if (error) return res.status(500).json({ error: error.message });
  res.json(mapRow(data));
});

expensesRouter.delete("/:id", async (req: AuthedRequest, res) => {
  const { error } = await req.supabase!
    .from("expenses")
    .delete()
    .eq("id", req.params.id);
  
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});