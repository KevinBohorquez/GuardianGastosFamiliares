/**
 * Seed de datos de prueba — Autenticación, Gastos y Familia
 * Ejecutar: npx tsx scripts/seed-auth-test-data.ts
 */
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !serviceKey) {
  console.error("Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env");
  process.exit(1);
}

const admin = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const PASSWORD = "Passw0rd!23";

const USERS = [
  { email: "ana.g4.leader1@testmail.com", name: "Ana Líder", key: "AUT-DS-01", monthlyIncome: 1500 },
  { email: "bruno.g4.member1@testmail.com", name: "Bruno Miembro", key: "AUT-DS-02", monthlyIncome: 1500 },
  { email: "carla.g4.outside@testmail.com", name: "Carla Externa", key: "AUT-DS-03", monthlyIncome: 0 },
  { email: "elena.g4.empty@testmail.com", name: "Elena Vacía", key: "EXP-DS-12", monthlyIncome: 0 },
] as const;

async function findUserByEmail(email: string) {
  const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw error;
  return data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase()) ?? null;
}

async function ensureUser(email: string, name: string, key: string) {
  const existing = await findUserByEmail(email);
  if (existing) {
    console.log(`✓ ${key} ya existe: ${email} (${existing.id})`);
    return existing.id;
  }

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { name },
  });
  if (error) throw new Error(`${key}: ${error.message}`);
  console.log(`+ ${key} creado: ${email} (${data.user!.id})`);
  return data.user!.id;
}

async function ensureProfile(userId: string, monthlyIncome: number, threshold = 0.8) {
  const { error } = await admin
    .from("profiles")
    .update({ monthly_income: monthlyIncome, expense_ratio_threshold: threshold })
    .eq("id", userId);
  if (error) throw error;
}

async function ensureFamily(leaderId: string, familyName: string) {
  const { data: existing } = await admin
    .from("families")
    .select("id")
    .eq("leader_id", leaderId)
    .maybeSingle();

  if (existing) {
    console.log(`✓ Familia "${familyName}" ya existe (${existing.id})`);
    return existing.id;
  }

  const { data, error } = await admin
    .from("families")
    .insert({ leader_id: leaderId, family_name: familyName })
    .select("id")
    .single();
  if (error) throw error;
  console.log(`+ Familia "${familyName}" creada (${data.id})`);
  return data.id;
}

async function ensureFamilyMember(familyId: string, userId: string, status: "accepted" | "pending") {
  const { data: existing } = await admin
    .from("family_members")
    .select("id, status")
    .eq("family_id", familyId)
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) {
    if (existing.status !== status) {
      await admin.from("family_members").update({ status }).eq("id", existing.id);
      console.log(`~ Miembro actualizado a status=${status}`);
    } else {
      console.log(`✓ Miembro ya vinculado (status=${status})`);
    }
    return existing.id;
  }

  const { data, error } = await admin
    .from("family_members")
    .insert({ family_id: familyId, user_id: userId, status })
    .select("id")
    .single();
  if (error) throw error;
  console.log(`+ Miembro añadido a familia (status=${status})`);
  return data.id;
}

async function ensureExpense(
  userId: string,
  description: string,
  amount: number,
  category: string,
  date: string
) {
  const { data: existing } = await admin
    .from("expenses")
    .select("id")
    .eq("user_id", userId)
    .eq("description", description)
    .maybeSingle();

  if (existing) {
    await admin.from("expenses").update({ amount, category, date }).eq("id", existing.id);
    console.log(`~ Gasto "${description}" actualizado`);
    return;
  }

  const { error } = await admin.from("expenses").insert({
    user_id: userId,
    description,
    amount,
    category,
    date,
  });
  if (error) throw error;
  console.log(`+ Gasto "${description}" creado`);
}

async function ensureNoFamilyLink(userId: string, label: string) {
  const { data: links } = await admin
    .from("family_members")
    .select("id, family_id, status")
    .eq("user_id", userId);

  if (!links?.length) {
    console.log(`✓ ${label} sin vínculo familiar`);
    return;
  }

  for (const link of links) {
    await admin.from("family_members").delete().eq("id", link.id);
    console.log(`- ${label}: eliminado vínculo familiar (status=${link.status})`);
  }
}

async function ensureUserAbsent(email: string, key: string) {
  const existing = await findUserByEmail(email);
  if (!existing) {
    console.log(`✓ ${key} no existe (listo para prueba de registro)`);
    return;
  }
  const { error } = await admin.auth.admin.deleteUser(existing.id);
  if (error) throw new Error(`No se pudo eliminar ${key}: ${error.message}`);
  console.log(`- ${key} eliminado: ${email}`);
}

async function main() {
  console.log("=== Seed — Autenticación, Gastos y Familia ===\n");

  const userIds: Record<string, string> = {};
  for (const u of USERS) {
    userIds[u.key] = await ensureUser(u.email, u.name, u.key);
    await ensureProfile(userIds[u.key], u.monthlyIncome);
  }

  const anaId = userIds["AUT-DS-01"];
  const brunoId = userIds["AUT-DS-02"];
  const carlaId = userIds["AUT-DS-03"];
  const elenaId = userIds["EXP-DS-12"];

  const familyId = await ensureFamily(anaId, "Familia A");
  await ensureFamilyMember(familyId, brunoId, "accepted");
  await ensureNoFamilyLink(carlaId, "AUT-DS-03");
  await ensureNoFamilyLink(elenaId, "EXP-DS-12");

  await ensureUserAbsent("nuevo.registro@testmail.com", "AUT-DS-09");

  // Gastos AUT — cada usuario con gasto propio; Bruno con gasto visible para líder
  await ensureExpense(anaId, "Gasto prueba Ana — AUT", 50.0, "Otros", "2026-06-15");
  await ensureExpense(brunoId, "Gasto prueba Bruno — AUT", 75.0, "Transporte", "2026-06-14");
  await ensureExpense(carlaId, "Gasto prueba Carla — AUT", 50.0, "Otros", "2026-06-15");

  // Gastos EXP-DS-09 / EXP-CP-010, 013, 015 — Bruno con 3 gastos del mes
  await ensureExpense(brunoId, "Gasto A — Transporte", 10.0, "Transporte", "2026-06-01");
  await ensureExpense(brunoId, "Gasto B — Salud", 20.0, "Salud", "2026-06-02");
  await ensureExpense(brunoId, "Gasto C — Alimentación", 30.0, "Alimentación", "2026-06-03");

  console.log("\n=== Resumen ===");
  console.log("  AUT-DS-01 ana.g4.leader1@testmail.com  → Líder Familia A (Bruno como miembro)");
  console.log("  AUT-DS-02 bruno.g4.member1@testmail.com → Miembro aceptado + 3 gastos EXP");
  console.log("  AUT-DS-03 carla.g4.outside@testmail.com → Sin familia");
  console.log("  EXP-DS-12 elena.g4.empty@testmail.com → Sin gastos ni familia");
  console.log("\nContraseña común: Passw0rd!23");
}

main().catch((err) => {
  console.error("Error:", err.message ?? err);
  process.exit(1);
});
