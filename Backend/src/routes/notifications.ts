import { Router } from "express";
import { requireAuth, AuthedRequest } from "../middleware/auth.js";
import { supabaseAdmin } from "../supabase.js";

export const notificationsRouter = Router();
notificationsRouter.use(requireAuth);

notificationsRouter.get("/", async (req: AuthedRequest, res) => {
  const { data, error } = await req.supabase!
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });

  const rows = data || [];
  const inviteIds = rows
    .filter((n: any) => n.type === "family_invite" && n.related_entity_id)
    .map((n: any) => n.related_entity_id);

  let pendingInviteIds = new Set<string>();
  if (inviteIds.length > 0) {
    const { data: memberships } = await supabaseAdmin
      .from("family_members")
      .select("id")
      .in("id", inviteIds)
      .eq("status", "pending");
    pendingInviteIds = new Set((memberships || []).map((m: any) => m.id));
  }

  const filtered = rows.filter((n: any) => {
    if (n.type !== "family_invite" || !n.related_entity_id) return true;
    return pendingInviteIds.has(n.related_entity_id);
  });

  res.json(filtered.map((n: any) => ({
    id: n.id,
    type: n.type,
    message: n.message,
    relatedEntityId: n.related_entity_id,
    isRead: n.is_read,
    createdAt: n.created_at,
  })));
});

notificationsRouter.patch("/:id/read", async (req: AuthedRequest, res) => {
  const { error } = await req.supabase!
    .from("notifications")
    .update({ is_read: true })
    .eq("id", req.params.id);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});
