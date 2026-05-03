import { Router } from "express";
import { z } from "zod";
import { requireAuth, AuthedRequest } from "../middleware/auth.js";
import { supabaseAdmin } from "../supabase.js"; // for admin tasks like fetching users by email

export const familyRouter = Router();
familyRouter.use(requireAuth);

familyRouter.get("/me", async (req: AuthedRequest, res) => {
  // Familia de la que soy líder
  const { data: leadFamily } = await req.supabase!
    .from("families")
    .select("*")
    .eq("leader_id", req.user!.id)
    .maybeSingle();

  if (leadFamily) {
    return res.json({ ...leadFamily, role: "leader" });
  }

  // Familia de la que soy miembro aceptado
  const { data: memberRel } = await req.supabase!
    .from("family_members")
    .select("family_id, families(*)")
    .eq("user_id", req.user!.id)
    .eq("status", "accepted")
    .maybeSingle();

  if (memberRel && memberRel.families) {
    return res.json({ ...(memberRel.families as any), role: "member" });
  }

  res.json(null); // No tiene familia
});

const CreateFamilySchema = z.object({
  familyName: z.string().min(1).max(100),
});

familyRouter.post("/", async (req: AuthedRequest, res) => {
  const p = CreateFamilySchema.safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: p.error.flatten().fieldErrors });

  const { data, error } = await req.supabase!
    .from("families")
    .insert({
      leader_id: req.user!.id,
      family_name: p.data.familyName,
    })
    .select("*")
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json({ ...data, role: "leader" });
});

familyRouter.get("/members", async (req: AuthedRequest, res) => {
  // Profiles that are in my family. Handled by RLS: I can see my profile + accepted members of my family.
  // We can just query `profiles`. But wait, if I am a leader, I want to see `family_members` to see pending too.
  const { data, error } = await req.supabase!
    .from("family_members")
    .select(`
      id,
      user_id,
      status,
      created_at,
      profiles ( name, color, monthly_income )
    `);

  if (error) return res.status(500).json({ error: error.message });
  
  // Transform to flat object
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

const InviteSchema = z.object({
  email: z.string().email(),
});

familyRouter.post("/invite", async (req: AuthedRequest, res) => {
  const p = InviteSchema.safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: p.error.flatten().fieldErrors });

  // Necesitamos obtener el family_id del líder
  const { data: family } = await req.supabase!
    .from("families")
    .select("id, family_name")
    .eq("leader_id", req.user!.id)
    .maybeSingle();

  if (!family) return res.status(403).json({ error: "No eres líder de ninguna familia." });

  // Buscar el user_id por email usando admin
  const { data: usersData, error: usersErr } = await supabaseAdmin.auth.admin.listUsers();
  if (usersErr) return res.status(500).json({ error: "Error interno al buscar usuario." });

  const targetUser = usersData.users.find((u) => u.email === p.data.email);
  if (!targetUser) return res.status(404).json({ error: "Usuario no registrado." });

  // Insertar en family_members
  const { data: invite, error: inviteErr } = await req.supabase!
    .from("family_members")
    .insert({
      family_id: family.id,
      user_id: targetUser.id,
      status: "pending",
    })
    .select("*")
    .single();

  if (inviteErr) return res.status(400).json({ error: inviteErr.message });

  // Crear notificación
  await req.supabase!
    .from("notifications")
    .insert({
      user_id: targetUser.id,
      type: "family_invite",
      message: `Has sido invitado a la familia "${family.family_name}".`,
      related_entity_id: invite.id,
    });

  res.status(201).json({ ok: true, invite });
});

familyRouter.patch("/invite/:id/accept", async (req: AuthedRequest, res) => {
  const { error } = await req.supabase!
    .from("family_members")
    .update({ status: "accepted" })
    .eq("id", req.params.id)
    .eq("user_id", req.user!.id); // RLS enforces this too
  
  if (error) return res.status(400).json({ error: error.message });
  res.json({ ok: true });
});

familyRouter.delete("/invite/:id", async (req: AuthedRequest, res) => {
  // Se usa tanto para rechazar/cancelar invitación como para eliminar miembro
  const { error } = await req.supabase!
    .from("family_members")
    .delete()
    .eq("id", req.params.id);
  
  if (error) return res.status(400).json({ error: error.message });
  res.json({ ok: true });
});