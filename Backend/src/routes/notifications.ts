import { Router } from "express";
import { requireAuth, AuthedRequest } from "../middleware/auth.js";

export const notificationsRouter = Router();
notificationsRouter.use(requireAuth);

notificationsRouter.get("/", async (req: AuthedRequest, res) => {
  const { data, error } = await req.supabase!
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data.map((n: any) => ({
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
