import { Router } from "express";
import { z } from "zod";
import { requireAuth, AuthedRequest } from "../middleware/auth.js";
import { supabaseAdmin } from "../supabase.js";

export const familyRouter = Router();
familyRouter.use(requireAuth);

// GET /api/family/me — Mi familia (como líder o miembro)
familyRouter.get("/me", async (req: AuthedRequest, res) => {
  const { data: leadFamily } = await req.supabase!
    .from("families")
    .select("*")
    .eq("leader_id", req.user!.id)
    .maybeSingle();

  if (leadFamily) return res.json({ ...leadFamily, role: "leader" });

  const { data: memberRel } = await req.supabase!
    .from("family_members")
    .select("family_id, families(*)")
    .eq("user_id", req.user!.id)
    .eq("status", "accepted")
    .maybeSingle();

  if (memberRel && memberRel.families) {
    return res.json({ ...(memberRel.families as any), role: "member" });
  }

  res.json(null);
});

// GET /api/family/check-email?email=... — Verificar si un correo está registrado
familyRouter.get("/check-email", async (req: AuthedRequest, res) => {
  const email = req.query.email as string;
  if (!email) return res.status(400).json({ error: "Email requerido." });

  const { data: usersData, error } = await supabaseAdmin.auth.admin.listUsers();
  if (error) return res.status(500).json({ error: "Error interno." });

  const found = usersData.users.some((u) => u.email === email.toLowerCase());
  res.json({ registered: found });
});

// POST /api/family — Crear familia
const CreateFamilySchema = z.object({ familyName: z.string().min(1).max(100) });
familyRouter.post("/", async (req: AuthedRequest, res) => {
  const p = CreateFamilySchema.safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: p.error.flatten().fieldErrors });

  // Verificar que no tenga ya familia creada
  const { data: existing } = await req.supabase!
    .from("families")
    .select("id")
    .eq("leader_id", req.user!.id)
    .maybeSingle();
  if (existing) return res.status(400).json({ error: "Ya tienes una familia creada." });

  const { data, error } = await req.supabase!
    .from("families")
    .insert({ leader_id: req.user!.id, family_name: p.data.familyName })
    .select("*")
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json({ ...data, role: "leader" });
});

// GET /api/family/members
familyRouter.get("/members", async (req: AuthedRequest, res) => {
  // Primero obtenemos el family_id de la familia del líder (o donde el usuario es miembro)
  const { data: family } = await req.supabase!
    .from("families")
    .select("id")
    .eq("leader_id", req.user!.id)
    .maybeSingle();

  let familyId = family?.id;

  // Si no es líder, buscar la familia donde es miembro aceptado
  if (!familyId) {
    const { data: mem } = await req.supabase!
      .from("family_members")
      .select("family_id")
      .eq("user_id", req.user!.id)
      .eq("status", "accepted")
      .maybeSingle();
    familyId = mem?.family_id;
  }

  if (!familyId) return res.json([]);

  // Usar supabaseAdmin para saltarnos RLS en profiles (el líder debe ver todos los miembros)
  const { data, error } = await supabaseAdmin
    .from("family_members")
    .select(`id, user_id, status, created_at, profiles ( name, color, monthly_income )`)
    .eq("family_id", familyId);

  if (error) return res.status(500).json({ error: error.message });

  const formatted = data.map((m: any) => ({
    id: m.id,
    userId: m.user_id,
    status: m.status,
    createdAt: m.created_at,
    name: m.profiles?.name,
    color: m.profiles?.color,
    monthlyIncome: m.profiles?.monthly_income,
  }));
  res.json(formatted);
});

// POST /api/family/invite
const InviteSchema = z.object({ email: z.string().email() });
familyRouter.post("/invite", async (req: AuthedRequest, res) => {
  const p = InviteSchema.safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: p.error.flatten().fieldErrors });

  const { data: family } = await req.supabase!
    .from("families")
    .select("id, family_name")
    .eq("leader_id", req.user!.id)
    .maybeSingle();

  if (!family) return res.status(403).json({ error: "No eres líder de ninguna familia." });

  const { data: usersData, error: usersErr } = await supabaseAdmin.auth.admin.listUsers();
  if (usersErr) return res.status(500).json({ error: "Error interno al buscar usuario." });

  const targetUser = usersData.users.find((u) => u.email === p.data.email);
  if (!targetUser) return res.status(404).json({ error: "No existe ningún usuario registrado con ese correo." });

  // No invitar al propio líder
  if (targetUser.id === req.user!.id) return res.status(400).json({ error: "No puedes invitarte a ti mismo." });

  // Verificar si ya es miembro o tiene invitación pendiente
  const { data: existing } = await req.supabase!
    .from("family_members")
    .select("id, status")
    .eq("family_id", family.id)
    .eq("user_id", targetUser.id)
    .maybeSingle();

  if (existing?.status === "accepted") return res.status(400).json({ error: "Este usuario ya es miembro de tu familia." });
  if (existing?.status === "pending") return res.status(400).json({ error: "Ya existe una invitación pendiente para este usuario." });

  const { data: invite, error: inviteErr } = await req.supabase!
    .from("family_members")
    .insert({ family_id: family.id, user_id: targetUser.id, status: "pending" })
    .select("*")
    .single();

  if (inviteErr) return res.status(400).json({ error: inviteErr.message });

  await supabaseAdmin
    .from("notifications")
    .insert({
      user_id: targetUser.id,
      type: "family_invite",
      message: `${req.user!.email} te ha invitado a unirte a la familia "${family.family_name}".`,
      related_entity_id: invite.id,
    });

  res.status(201).json({ ok: true, invite });
});

// PATCH /api/family/invite/:id/accept
familyRouter.patch("/invite/:id/accept", async (req: AuthedRequest, res) => {
  const { error } = await req.supabase!
    .from("family_members")
    .update({ status: "accepted" })
    .eq("id", req.params.id)
    .eq("user_id", req.user!.id);

  if (error) return res.status(400).json({ error: error.message });
  res.json({ ok: true });
});

// DELETE /api/family/invite/:id — Rechazar invitación / eliminar miembro
familyRouter.delete("/invite/:id", async (req: AuthedRequest, res) => {
  const { error } = await req.supabase!
    .from("family_members")
    .delete()
    .eq("id", req.params.id);

  if (error) return res.status(400).json({ error: error.message });
  res.json({ ok: true });
});

// PATCH /api/family/members/:userId/income — Líder puede editar ingreso mensual de un miembro
const IncomeSchema = z.object({ monthlyIncome: z.number().min(0) });
familyRouter.patch("/members/:userId/income", async (req: AuthedRequest, res) => {
  const p = IncomeSchema.safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: p.error.flatten().fieldErrors });

  // Verificar que sea líder
  const { data: family } = await req.supabase!
    .from("families")
    .select("id")
    .eq("leader_id", req.user!.id)
    .maybeSingle();

  if (!family) return res.status(403).json({ error: "Solo el líder puede modificar esto." });

  // Verificar que el userId es miembro de su familia
  const { data: member } = await req.supabase!
    .from("family_members")
    .select("id")
    .eq("family_id", family.id)
    .eq("user_id", req.params.userId)
    .eq("status", "accepted")
    .maybeSingle();

  if (!member) return res.status(404).json({ error: "El usuario no es miembro de tu familia." });

  // Actualizar el perfil (usando supabaseAdmin para saltarse RLS del otro usuario)
  const { error } = await supabaseAdmin
    .from("profiles")
    .update({ monthly_income: p.data.monthlyIncome })
    .eq("id", req.params.userId);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

// DELETE /api/family/expenses/:id — Líder puede eliminar gastos de miembros
familyRouter.delete("/expenses/:id", async (req: AuthedRequest, res) => {
  // RLS on expenses allows leader to see members' expenses via get_my_family_members()
  // But the delete policy only allows the expense owner. We use supabaseAdmin here.
  // First verify the expense belongs to a member of the leader's family.
  const { data: family } = await req.supabase!
    .from("families")
    .select("id")
    .eq("leader_id", req.user!.id)
    .maybeSingle();

  if (!family) return res.status(403).json({ error: "Solo el líder puede hacer esto." });

  const { data: expense } = await supabaseAdmin
    .from("expenses")
    .select("id, user_id")
    .eq("id", req.params.id)
    .maybeSingle();

  if (!expense) return res.status(404).json({ error: "Gasto no encontrado." });

  // Check the expense owner is a member of leader's family (or the leader themselves)
  if (expense.user_id !== req.user!.id) {
    const { data: isMember } = await supabaseAdmin
      .from("family_members")
      .select("id")
      .eq("family_id", family.id)
      .eq("user_id", expense.user_id)
      .eq("status", "accepted")
      .maybeSingle();

    if (!isMember) return res.status(403).json({ error: "No puedes eliminar este gasto." });
  }

  const { error } = await supabaseAdmin.from("expenses").delete().eq("id", req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});