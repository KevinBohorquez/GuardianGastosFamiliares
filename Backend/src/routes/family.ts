import { Router } from "express";
import { z } from "zod";
import { requireAuth, AuthedRequest } from "../middleware/auth.js";
import { supabaseAdmin } from "../supabase.js";

export const familyRouter = Router();
familyRouter.use(requireAuth);

// Helper: fetch profiles map for a list of user_ids
async function getProfilesMap(userIds: string[]): Promise<Record<string, { name: string; color: string; monthly_income: number }>> {
  if (!userIds.length) return {};
  const { data } = await supabaseAdmin
    .from("profiles")
    .select("id, name, color, monthly_income")
    .in("id", userIds);
  const map: Record<string, any> = {};
  (data || []).forEach((p: any) => { map[p.id] = p; });
  return map;
}

// GET /api/family/me — Solo la familia donde soy LÍDER
familyRouter.get("/me", async (req: AuthedRequest, res) => {
  const { data: leadFamily } = await req.supabase!
    .from("families")
    .select("*")
    .eq("leader_id", req.user!.id)
    .maybeSingle();

  if (leadFamily) return res.json({ ...leadFamily, role: "leader" });
  res.json(null);
});

// GET /api/family/memberships — Todas las familias donde soy miembro aceptado (no líder)
familyRouter.get("/memberships", async (req: AuthedRequest, res) => {
  const { data: rels } = await supabaseAdmin
    .from("family_members")
    .select("id, family_id, families(*)")
    .eq("user_id", req.user!.id)
    .eq("status", "accepted");

  if (!rels || rels.length === 0) return res.json([]);

  const result = rels
    .filter((r: any) => {
      const fam = r.families as any;
      // Exclude families where user is also the leader
      return fam && fam.leader_id !== req.user!.id;
    })
    .map((r: any) => ({
      membershipId: r.id,
      ...(r.families as any),
      role: "member",
    }));

  res.json(result);
});

// GET /api/family/check-email
familyRouter.get("/check-email", async (req: AuthedRequest, res) => {
  const email = req.query.email as string;
  if (!email) return res.status(400).json({ error: "Email requerido." });
  const { data: usersData, error } = await supabaseAdmin.auth.admin.listUsers();
  if (error) return res.status(500).json({ error: "Error interno." });
  const found = usersData.users.some((u) => u.email === email.toLowerCase());
  res.json({ registered: found });
});

// POST /api/family — Crear familia (solo si no es líder ya)
const CreateFamilySchema = z.object({ familyName: z.string().min(1).max(100) });
familyRouter.post("/", async (req: AuthedRequest, res) => {
  const p = CreateFamilySchema.safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: p.error.flatten().fieldErrors });

  const { data: existing } = await req.supabase!
    .from("families").select("id").eq("leader_id", req.user!.id).maybeSingle();
  if (existing) return res.status(400).json({ error: "Ya tienes una familia creada." });

  const { data, error } = await req.supabase!
    .from("families")
    .insert({ leader_id: req.user!.id, family_name: p.data.familyName })
    .select("*").single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json({ ...data, role: "leader" });
});

// GET /api/family/members — Miembros de MI familia (como líder o miembro)
familyRouter.get("/members", async (req: AuthedRequest, res) => {
  // Buscar la familia donde es líder
  const { data: leaderFamily } = await req.supabase!
    .from("families").select("id").eq("leader_id", req.user!.id).maybeSingle();

  let familyId = leaderFamily?.id;

  // Si no es líder, buscar como miembro aceptado
  if (!familyId) {
    const { data: mem } = await supabaseAdmin
      .from("family_members")
      .select("family_id")
      .eq("user_id", req.user!.id)
      .eq("status", "accepted")
      .maybeSingle();
    familyId = mem?.family_id;
  }

  if (!familyId) return res.json([]);

  // Consultar miembros con supabaseAdmin (evita restricciones RLS en profiles)
  const { data: members, error } = await supabaseAdmin
    .from("family_members")
    .select("id, user_id, status, created_at")
    .eq("family_id", familyId);

  if (error) return res.status(500).json({ error: error.message });
  if (!members || members.length === 0) return res.json([]);

  // Obtener perfiles por separado (sin depender de FK join)
  const profilesMap = await getProfilesMap(members.map((m: any) => m.user_id));

  const formatted = members.map((m: any) => ({
    id: m.id,
    userId: m.user_id,
    status: m.status,
    createdAt: m.created_at,
    name: profilesMap[m.user_id]?.name ?? "Desconocido",
    color: profilesMap[m.user_id]?.color ?? "hsl(270 85% 60%)",
    monthlyIncome: profilesMap[m.user_id]?.monthly_income ?? 0,
  }));

  res.json(formatted);
});

// POST /api/family/invite
const InviteSchema = z.object({ email: z.string().email() });
familyRouter.post("/invite", async (req: AuthedRequest, res) => {
  const p = InviteSchema.safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: p.error.flatten().fieldErrors });

  const { data: family } = await req.supabase!
    .from("families").select("id, family_name").eq("leader_id", req.user!.id).maybeSingle();
  if (!family) return res.status(403).json({ error: "No eres líder de ninguna familia." });

  const { data: usersData, error: usersErr } = await supabaseAdmin.auth.admin.listUsers();
  if (usersErr) return res.status(500).json({ error: "Error interno al buscar usuario." });

  const targetUser = usersData.users.find((u) => u.email === p.data.email);
  if (!targetUser) return res.status(404).json({ error: "No existe ningún usuario registrado con ese correo." });
  if (targetUser.id === req.user!.id) return res.status(400).json({ error: "No puedes invitarte a ti mismo." });

  const { data: existing } = await supabaseAdmin
    .from("family_members")
    .select("id, status")
    .eq("family_id", family.id)
    .eq("user_id", targetUser.id)
    .maybeSingle();

  if (existing?.status === "accepted") return res.status(400).json({ error: "Este usuario ya es miembro de tu familia." });
  if (existing?.status === "pending") return res.status(400).json({ error: "Ya existe una invitación pendiente para este usuario." });

  const { data: invite, error: inviteErr } = await supabaseAdmin
    .from("family_members")
    .insert({ family_id: family.id, user_id: targetUser.id, status: "pending" })
    .select("*").single();

  if (inviteErr) return res.status(400).json({ error: inviteErr.message });

  // Obtener nombre del líder para la notificación
  const { data: leaderProfile } = await supabaseAdmin
    .from("profiles").select("name").eq("id", req.user!.id).maybeSingle();
  const leaderName = leaderProfile?.name || req.user!.email;

  await supabaseAdmin.from("notifications").insert({
    user_id: targetUser.id,
    type: "family_invite",
    message: `${leaderName} te ha invitado a unirte a la familia "${family.family_name}".`,
    related_entity_id: invite.id,
  });

  res.status(201).json({ ok: true, invite });
});

// PATCH /api/family/invite/:id/accept
familyRouter.patch("/invite/:id/accept", async (req: AuthedRequest, res) => {
  const { error } = await supabaseAdmin
    .from("family_members")
    .update({ status: "accepted" })
    .eq("id", req.params.id)
    .eq("user_id", req.user!.id);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ ok: true });
});

// DELETE /api/family/invite/:id — Rechazar / eliminar miembro
familyRouter.delete("/invite/:id", async (req: AuthedRequest, res) => {
  const { error } = await supabaseAdmin
    .from("family_members")
    .delete()
    .eq("id", req.params.id);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ ok: true });
});

// PATCH /api/family/members/:userId/income — Líder edita ingreso de miembro
const IncomeSchema = z.object({ monthlyIncome: z.number().min(0) });
familyRouter.patch("/members/:userId/income", async (req: AuthedRequest, res) => {
  const p = IncomeSchema.safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: p.error.flatten().fieldErrors });

  const { data: family } = await req.supabase!
    .from("families").select("id").eq("leader_id", req.user!.id).maybeSingle();
  if (!family) return res.status(403).json({ error: "Solo el líder puede modificar esto." });

  const { data: member } = await supabaseAdmin
    .from("family_members")
    .select("id")
    .eq("family_id", family.id)
    .eq("user_id", req.params.userId)
    .eq("status", "accepted")
    .maybeSingle();
  if (!member) return res.status(404).json({ error: "El usuario no es miembro de tu familia." });

  const { error } = await supabaseAdmin
    .from("profiles").update({ monthly_income: p.data.monthlyIncome }).eq("id", req.params.userId);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

// DELETE /api/family/expenses/:id — Líder elimina gasto de miembro
familyRouter.delete("/expenses/:id", async (req: AuthedRequest, res) => {
  const { data: family } = await req.supabase!
    .from("families").select("id").eq("leader_id", req.user!.id).maybeSingle();
  if (!family) return res.status(403).json({ error: "Solo el líder puede hacer esto." });

  const { data: expense } = await supabaseAdmin
    .from("expenses").select("id, user_id").eq("id", req.params.id).maybeSingle();
  if (!expense) return res.status(404).json({ error: "Gasto no encontrado." });

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