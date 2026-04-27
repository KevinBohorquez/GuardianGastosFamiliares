import "dotenv/config";
import express from "express";
import cors from "cors";
import { authRouter } from "./routes/auth.js";
import { familyRouter } from "./routes/family.js";
import { membersRouter } from "./routes/members.js";
import { expensesRouter } from "./routes/expenses.js";

const app = express();
const PORT = Number(process.env.PORT ?? 4000);
const ORIGIN = process.env.CORS_ORIGIN ?? "*";

app.use(cors({ origin: ORIGIN, credentials: false }));
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => res.json({ ok: true, service: "guardian-backend" }));

app.use("/api/auth", authRouter);
app.use("/api/family", familyRouter);
app.use("/api/members", membersRouter);
app.use("/api/expenses", expensesRouter);

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("[error]", err);
  res.status(500).json({ error: err?.message ?? "Internal error" });
});

app.listen(PORT, () => {
  console.log(`🛡️  Guardián backend escuchando en http://localhost:${PORT}`);
});