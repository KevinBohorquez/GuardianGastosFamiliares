import { useState } from "react";
import { useApp } from "@/context/AppContext";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { CATEGORIES, CATEGORY_COLORS, Category, formatCurrency } from "@/types";
import { TrendingDown, TrendingUp, Users, Wallet, Plus, Mail, X, ShieldAlert, Pencil, Check, Loader2, UserCheck, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import * as api from "@/lib/api";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, LineChart, Line,
} from "recharts";
import { startOfMonth } from "date-fns";
import { safeParseDate, safeFormatDate } from "@/lib/utils";

import { ExpenseForm } from "@/components/ExpenseForm";
import { Expense } from "@/types";

// ── Avatar pill ────────────────────────────────────────────────────────
const Avatar = ({ name, color, size = "md" }: { name: string; color?: string; size?: "sm" | "md" | "lg" }) => {
  const sz = { sm: "w-8 h-8 text-xs", md: "w-12 h-12 text-base", lg: "w-16 h-16 text-2xl" }[size];
  return (
    <div className={`${sz} rounded-full flex items-center justify-center font-bold text-white shrink-0`} style={{ background: color || "#6366f1" }}>
      {name[0]?.toUpperCase()}
    </div>
  );
};

// ── Member card for the management modal ──────────────────────────────
const MemberCard = ({
  name, color, monthlyIncome, status, isLeader, onRemove, onEditIncome,
}: {
  name: string; color?: string; monthlyIncome?: number; status: string;
  isLeader?: boolean; onRemove?: () => void; onEditIncome?: (v: number) => void;
}) => {
  const [editing, setEditing] = useState(false);
  const [income, setIncome] = useState(monthlyIncome?.toString() || "0");

  const save = () => {
    onEditIncome?.(Number(income));
    setEditing(false);
  };

  return (
    <div className="flex flex-col items-center gap-2 bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-shadow relative group">
      {onRemove && (
        <button onClick={onRemove} className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6 rounded-full bg-red-50 flex items-center justify-center text-red-500 hover:bg-red-100">
          <X className="w-3 h-3" />
        </button>
      )}
      <Avatar name={name} color={color} size="lg" />
      <p className="font-semibold text-gray-900 text-sm text-center leading-tight">{name}</p>
      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${isLeader ? 'bg-indigo-100 text-indigo-700' : status === 'accepted' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-600'}`}>
        {isLeader ? "Líder" : status === "accepted" ? "Miembro" : "Pendiente"}
      </span>
      {onEditIncome && status === "accepted" && (
        <div className="w-full mt-1">
          {editing ? (
            <div className="flex items-center gap-1">
              <Input type="number" min="0" value={income} onChange={e => setIncome(e.target.value)} className="h-7 text-xs text-center px-1" />
              <button onClick={save} className="w-7 h-7 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600 hover:bg-indigo-200"><Check className="w-3 h-3" /></button>
            </div>
          ) : (
            <button onClick={() => setEditing(true)} className="w-full flex items-center justify-center gap-1 text-xs text-gray-400 hover:text-indigo-600 transition-colors">
              <Pencil className="w-3 h-3" /> S/ {Number(monthlyIncome || 0).toFixed(2)} / mes
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// ── Main page ──────────────────────────────────────────────────────────
const FamilyOverview = () => {
  const { profile, family, memberFamilies, familyMembers, expenses, createFamily, inviteMember, rejectOrRemoveMember, updateMemberIncome, leaderDeleteExpense, deleteExpense, updateExpense, refreshAll } = useApp();
  const navigate = useNavigate();

  const [newFamilyName, setNewFamilyName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [emailStatus, setEmailStatus] = useState<"idle" | "checking" | "found" | "notfound">("idle");
  const [showMembers, setShowMembers] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [activeTab, setActiveTab] = useState<"family" | "personal">("family");
  const [familyContext, setFamilyContext] = useState<"leader" | string>("leader");
  const [inviteResult, setInviteResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [inviting, setInviting] = useState(false);

  const isLeader = !!family; // family en contexto = familia donde soy líder
  // allProfiles incluye al líder + miembros aceptados (con sus nombres del backend)
  const acceptedMembers = familyMembers.filter(m => m.status === "accepted");
  const allProfiles = profile
    ? [{ id: profile.id, name: profile.name, color: profile.color, monthlyIncome: profile.monthlyIncome, isMe: true },
       ...acceptedMembers.map(m => ({ id: m.userId, name: m.name || "Desconocido", color: m.color || "hsl(270 85% 60%)", monthlyIncome: m.monthlyIncome || 0, isMe: false }))]
    : [];

  // Mapa rápido para lookup por userId → nombre
  const profileNameMap = Object.fromEntries(allProfiles.map(p => [p.id, p.name]));
  const profileColorMap = Object.fromEntries(allProfiles.map(p => [p.id, p.color]));

  const monthStart = startOfMonth(new Date());
  const monthly = expenses.filter(e => safeParseDate(e.date) >= monthStart);
  const myMonthly = monthly.filter(e => e.userId === profile?.id);

  const totalIncome = isLeader ? allProfiles.reduce((s, p) => s + p.monthlyIncome, 0) : profile?.monthlyIncome || 0;
  const totalSpent = isLeader ? monthly.reduce((s, e) => s + e.amount, 0) : myMonthly.reduce((s, e) => s + e.amount, 0);
  const balance = totalIncome - totalSpent;

  // ── Check email ─────────────────────────────────────────────────────
  const checkEmail = async (email: string) => {
    if (!email || !email.includes("@")) { setEmailStatus("idle"); return; }
    setEmailStatus("checking");
    try {
      const r = await api.apiCheckEmail(email);
      setEmailStatus(r.registered ? "found" : "notfound");
    } catch { setEmailStatus("idle"); }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (emailStatus === "notfound") {
      setInviteResult({ ok: false, message: "No existe ningún usuario registrado con ese correo." });
      setTimeout(() => setInviteResult(null), 4000);
      return;
    }
    if (!inviteEmail.trim()) return;
    setInviting(true);
    setInviteResult(null);
    const r = await inviteMember(inviteEmail);
    setInviting(false);
    if (r.ok) {
      setInviteResult({ ok: true, message: `¡Invitación enviada a ${inviteEmail}!` });
      setInviteEmail("");
      setEmailStatus("idle");
    } else {
      setInviteResult({ ok: false, message: r.error || "Error al enviar la invitación." });
    }
    setTimeout(() => setInviteResult(null), 5000);
  };

  const handleCreateFamily = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFamilyName.trim()) return;
    await createFamily(newFamilyName);
    toast.success("¡Familia creada exitosamente!");
  };

  // ── Charts data ──────────────────────────────────────────────────────
  const expensesForView = activeTab === "personal" ? myMonthly : (isLeader ? monthly : myMonthly);

  const byCategory = (() => {
    const map = new Map<Category, number>();
    expensesForView.forEach(e => map.set(e.category, (map.get(e.category) || 0) + e.amount));
    return CATEGORIES.map(c => ({ name: c, value: map.get(c) || 0, fill: CATEGORY_COLORS[c] })).filter(d => d.value > 0);
  })();

  const byDay = (() => {
    const map = new Map<string, number>();
    expensesForView.forEach(e => { const d = e.date.slice(0, 10); map.set(d, (map.get(d) || 0) + e.amount); });
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([date, amount]) => ({ date: safeFormatDate(date, "d MMM"), amount }));
  })();

  const byMember = isLeader ? allProfiles.map(p => {
    const spent = monthly.filter(e => e.userId === p.id).reduce((s, e) => s + e.amount, 0);
    return { name: p.name, Ingreso: p.monthlyIncome, Gasto: spent };
  }) : [];

  const recentExpenses = [...(isLeader ? monthly : myMonthly)]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 15);

  if (!profile) return null;

  // ── No family as leader AND no member families: create screen ────────
  if (!family && memberFamilies.length === 0) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="glass-strong p-10 rounded-3xl max-w-md w-full text-center shadow-xl">
            <div className="w-16 h-16 bg-gradient-hero rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-glow">
              <Users className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Crea tu familia</h2>
            <p className="text-gray-500 mb-8 text-sm leading-relaxed">Forma un grupo familiar para consolidar gastos e ingresos, e invita a tus allegados.</p>
            <form onSubmit={handleCreateFamily} className="space-y-4 text-left">
              <div className="space-y-2">
                <Label>Nombre de la familia</Label>
                <Input value={newFamilyName} onChange={e => setNewFamilyName(e.target.value)} placeholder="Ej: Los García" required />
              </div>
              <Button type="submit" className="w-full bg-primary text-white shadow-sm">
                <Plus className="w-4 h-4 mr-2" /> Crear familia
              </Button>
            </form>
          </div>
        </div>
      </Layout>
    );
  }

  // ── Solo miembro (no líder): vista de familias donde participa ────────
  if (!isLeader) {
    return (
      <Layout>
        <div className="mb-8">
          <p className="text-gray-500 font-medium">Mis grupos familiares</p>
          <h1 className="text-4xl font-bold text-gray-900">Mi Familia</h1>
        </div>

        {/* Opción de crear su propia familia */}
        {!family && (
          <div className="glass rounded-2xl p-6 mb-6 border border-indigo-100">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-gray-900">Crea tu propia familia</h3>
                <p className="text-sm text-gray-500 mt-1">Puedes ser líder de tu familia e invitar a otros, mientras participas en otras familias.</p>
              </div>
              <Button onClick={() => {}} className="shrink-0 bg-primary text-white">
                <Plus className="w-4 h-4 mr-2" /> Crear
              </Button>
            </div>
            <form onSubmit={handleCreateFamily} className="mt-4 flex gap-2">
              <Input value={newFamilyName} onChange={e => setNewFamilyName(e.target.value)} placeholder="Nombre de tu familia..." className="flex-1" />
              <Button type="submit" disabled={!newFamilyName.trim()}>Crear</Button>
            </form>
          </div>
        )}

        {/* Familias donde es miembro */}
        <div className="space-y-4">
          {memberFamilies.map((mf: any) => (
            <div key={mf.id} className="glass rounded-2xl p-6 border border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-100 flex items-center justify-center">
                  <Users className="w-6 h-6 text-indigo-600" />
                </div>
                <div>
                  <p className="font-bold text-gray-900 text-lg">{mf.family_name}</p>
                  <span className="text-xs font-semibold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-md">Miembro</span>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="text-red-600 border-red-200 hover:bg-red-50"
                onClick={async () => {
                  if (!window.confirm(`¿Abandonar la familia "${mf.family_name}"?`)) return;
                  await rejectOrRemoveMember(mf.membershipId);
                  await refreshAll();
                  toast.success("Saliste de la familia");
                }}
              >
                Abandonar
              </Button>
            </div>
          ))}
        </div>
      </Layout>
    );
  }

  // ── Leader viewing another family as member (multi-tenant) ───────────
  if (isLeader && familyContext !== "leader") {
    const mf = memberFamilies.find((f) => f.id === familyContext);
    if (mf) {
      return (
        <Layout>
          <div className="mb-6 flex flex-wrap gap-2">
            <button
              onClick={() => setFamilyContext("leader")}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 text-white"
            >
              {family?.family_name} (Líder)
            </button>
            {memberFamilies.map((f) => (
              <button
                key={f.id}
                onClick={() => setFamilyContext(f.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  familyContext === f.id ? "bg-white shadow-sm text-indigo-700 border border-indigo-200" : "text-gray-500 hover:text-gray-700 bg-gray-100"
                }`}
              >
                {f.family_name} (Miembro)
              </button>
            ))}
          </div>
          <div className="glass rounded-2xl p-6 border border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-100 flex items-center justify-center">
                <Users className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <p className="font-bold text-gray-900 text-lg">{mf.family_name}</p>
                <span className="text-xs font-semibold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-md">Miembro</span>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="text-red-600 border-red-200 hover:bg-red-50"
              onClick={async () => {
                if (!window.confirm(`¿Abandonar la familia "${mf.family_name}"?`)) return;
                await rejectOrRemoveMember(mf.membershipId!);
                setFamilyContext("leader");
                await refreshAll();
                toast.success("Saliste de la familia");
              }}
            >
              Abandonar
            </Button>
          </div>
        </Layout>
      );
    }
  }

  // ── Leader view ──────────────────────────────────────────────────────
  return (
    <Layout>
      {/* Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-gray-500 font-medium">Vista familiar — Líder</p>
          <h1 className="text-4xl font-bold text-gray-900">Familia {family.family_name}</h1>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" onClick={() => setShowMembers(true)} className="bg-white border-gray-200">
            <Users className="w-4 h-4 mr-2" /> Gestionar miembros
          </Button>
          {/* Invite form */}
          <form onSubmit={handleInvite} className="flex items-center gap-2 bg-white p-1.5 rounded-xl shadow-sm border border-gray-100">
            <div className="relative">
              <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                type="email"
                placeholder="Invitar por correo..."
                value={inviteEmail}
                onChange={e => { setInviteEmail(e.target.value); setEmailStatus("idle"); }}
                onBlur={() => checkEmail(inviteEmail)}
                className="pl-9 border-none bg-transparent h-9 focus-visible:ring-0 w-56 text-sm"
              />
              {emailStatus === "checking" && <Loader2 className="w-3 h-3 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 animate-spin" />}
              {emailStatus === "found" && <Check className="w-3 h-3 text-emerald-500 absolute right-2 top-1/2 -translate-y-1/2" />}
              {emailStatus === "notfound" && <X className="w-3 h-3 text-red-500 absolute right-2 top-1/2 -translate-y-1/2" />}
            </div>
            <Button type="submit" size="sm" disabled={emailStatus === "notfound" || emailStatus === "checking" || inviting} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg h-9 px-4">
              {inviting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Invitar"}
            </Button>
          </form>
        </div>
      </div>

      {/* Email feedback banner */}
      {inviteResult && (
        <div className={`mb-6 flex items-start gap-3 p-4 rounded-2xl border animate-in fade-in slide-in-from-top-2 ${
          inviteResult.ok
            ? "bg-emerald-50 border-emerald-200 text-emerald-800"
            : "bg-red-50 border-red-200 text-red-800"
        }`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
            inviteResult.ok ? "bg-emerald-100" : "bg-red-100"
          }`}>
            {inviteResult.ok
              ? <Check className="w-4 h-4 text-emerald-600" />
              : <X className="w-4 h-4 text-red-600" />}
          </div>
          <div>
            <p className="font-semibold text-sm">{inviteResult.ok ? "Invitación enviada" : "No se pudo enviar"}</p>
            <p className="text-xs mt-0.5 opacity-80">{inviteResult.message}</p>
          </div>
          <button onClick={() => setInviteResult(null)} className="ml-auto opacity-50 hover:opacity-100 transition-opacity">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Tab: Personal / Familiar */}
      <div className="flex gap-2 mb-8 bg-gray-100/60 p-1 rounded-xl w-fit">
        {(["family", "personal"] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === tab ? "bg-white shadow-sm text-indigo-700" : "text-gray-500 hover:text-gray-700"}`}>
            {tab === "family" ? "Vista familiar" : "Mi vista personal"}
          </button>
        ))}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { icon: <Users className="h-5 w-5 text-indigo-500" />, label: "Miembros activos", value: allProfiles.length, color: "bg-indigo-50" },
          { icon: <Wallet className="h-5 w-5 text-emerald-500" />, label: activeTab === "family" ? "Ingresos totales" : "Mi ingreso", value: formatCurrency(totalIncome), color: "bg-emerald-50" },
          { icon: <TrendingDown className="h-5 w-5 text-red-500" />, label: activeTab === "family" ? "Gasto familiar (mes)" : "Mi gasto (mes)", value: formatCurrency(totalSpent), color: "bg-red-50" },
          { icon: <TrendingUp className={`h-5 w-5 ${balance >= 0 ? "text-blue-500" : "text-red-500"}`} />, label: "Balance", value: formatCurrency(balance), color: "bg-blue-50" },
        ].map((kpi, i) => (
          <div key={i} className="glass rounded-2xl p-5 relative overflow-hidden">
            <div className={`absolute right-0 top-0 w-20 h-20 ${kpi.color} rounded-bl-full opacity-60`} />
            <div className="relative z-10">{kpi.icon}<p className="text-xs font-medium text-gray-500 mt-2">{kpi.label}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{kpi.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
        <div className="glass rounded-2xl p-6">
          <h3 className="font-semibold text-gray-800 mb-5">Por categoría (mes)</h3>
          {byCategory.length === 0
            ? <div className="h-[240px] flex items-center justify-center border-2 border-dashed border-gray-100 rounded-xl"><p className="text-sm text-gray-400">Sin datos</p></div>
            : <ResponsiveContainer width="100%" height={240}><PieChart><Pie data={byCategory} dataKey="value" nameKey="name" innerRadius={60} outerRadius={100} paddingAngle={4}>
                {byCategory.map((d, i) => <Cell key={i} fill={d.fill} />)}
              </Pie><Tooltip formatter={(v: number) => formatCurrency(v)} /></PieChart></ResponsiveContainer>}
        </div>
        <div className="glass rounded-2xl p-6">
          <h3 className="font-semibold text-gray-800 mb-5">Tendencia diaria</h3>
          {byDay.length === 0
            ? <div className="h-[240px] flex items-center justify-center border-2 border-dashed border-gray-100 rounded-xl"><p className="text-sm text-gray-400">Sin datos</p></div>
            : <ResponsiveContainer width="100%" height={240}><LineChart data={byDay} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="date" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Line type="monotone" dataKey="amount" stroke="#6366f1" strokeWidth={3} dot={false} />
              </LineChart></ResponsiveContainer>}
        </div>
      </div>

      {/* Ingresos vs Gastos por miembro (solo vista familiar) */}
      {activeTab === "family" && byMember.length > 1 && (
        <div className="glass rounded-2xl p-6 mb-8">
          <h3 className="font-semibold text-gray-800 mb-5">Ingresos vs Gastos por miembro</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={byMember} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
              <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Ingreso" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={30} />
              <Bar dataKey="Gasto" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={30} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Recent expenses list */}
      <div className="glass rounded-2xl p-6">
        <h3 className="font-semibold text-gray-800 mb-5">
          {activeTab === "family" ? "Gastos recientes (familia)" : "Mis gastos recientes"}
        </h3>
        {recentExpenses.length === 0
          ? <div className="py-12 flex flex-col items-center gap-2 text-gray-400 border-2 border-dashed border-gray-100 rounded-xl"><Wallet className="w-8 h-8 opacity-50" /><p className="text-sm">Sin registros</p></div>
          : <div className="space-y-3">
              {recentExpenses.map(e => {
                const ownerName = profileNameMap[e.userId] || "Desconocido";
                const ownerColor = profileColorMap[e.userId] || "hsl(270 85% 60%)";
                const isMine = e.userId === profile.id;
                return (
                  <div key={e.id} className="flex items-center gap-3 p-4 rounded-xl bg-white border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all group">
                    <div className="h-10 w-10 rounded-xl flex items-center justify-center text-white text-sm font-bold" style={{ background: CATEGORY_COLORS[e.category] }}>{e.category[0]}</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800 text-sm truncate">{e.description}</p>
                      <p className="text-xs text-gray-500 flex items-center gap-1.5">
                        <span className="w-4 h-4 rounded-full flex items-center justify-center text-white text-[9px] font-bold shrink-0" style={{ background: ownerColor }}>{ownerName[0]?.toUpperCase()}</span>
                        {ownerName} · {e.category} · {safeFormatDate(e.date, "d MMM")}
                      </p>
                    </div>
                    <p className="font-bold text-gray-900">{formatCurrency(e.amount)}</p>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {isMine && <Button size="icon" variant="ghost" className="h-8 w-8 text-gray-400 hover:text-indigo-600" onClick={() => setEditingExpense(e)}><Pencil className="h-3.5 w-3.5" /></Button>}
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-gray-400 hover:text-red-600" onClick={async () => {
                        if (isMine) { await deleteExpense(e.id); } else { await leaderDeleteExpense(e.id); }
                        toast.success("Eliminado");
                      }}><X className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>
                );
              })}
            </div>
        }
      </div>

      {/* Sección: Familias donde participo como Miembro (solo si existen) */}
      {memberFamilies.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center gap-2 mb-4">
            <UserCheck className="w-5 h-5 text-emerald-600" />
            <h2 className="text-lg font-bold text-gray-800">Familias en las que participo</h2>
            <span className="text-xs font-semibold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">como Miembro</span>
          </div>
          <div className="space-y-3">
            {memberFamilies.map((mf: any) => {
              const confirmMsg = '¿Abandonar ' + mf.family_name + '?\n\nSeguirás siendo Líder de ' + family.family_name + '.';
              const successMsg = 'Saliste de ' + mf.family_name + '. Sigues siendo Líder de ' + family.family_name + '.';
              return (
                <div key={mf.id} className="glass rounded-2xl p-5 border border-emerald-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                      <Users className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{mf.family_name}</p>
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md">
                        <UserCheck className="w-3 h-3" /> Miembro
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600 border-red-200 hover:bg-red-50 gap-1.5"
                    onClick={async () => {
                      if (!window.confirm(confirmMsg)) return;
                      await rejectOrRemoveMember(mf.membershipId!);
                      await refreshAll();
                      toast.success(successMsg);
                    }}
                  >
                    <LogOut className="w-3.5 h-3.5" /> Abandonar
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Members modal */}
      {showMembers && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) setShowMembers(false); }}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-auto">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex justify-between items-center rounded-t-3xl">
              <h2 className="text-lg font-bold text-gray-900">Miembros de la familia</h2>
              <button onClick={() => setShowMembers(false)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-6 grid grid-cols-2 sm:grid-cols-3 gap-4">
              {/* Leader card */}
              <MemberCard name={profile.name} color={profile.color} monthlyIncome={profile.monthlyIncome} status="accepted" isLeader />
              {/* Members */}
              {familyMembers.map(m => (
                <MemberCard
                  key={m.id}
                  name={m.name || "Desconocido"}
                  color={m.color}
                  monthlyIncome={m.monthlyIncome}
                  status={m.status}
                  onRemove={async () => {
                    if (!window.confirm(`¿Eliminar a ${m.name} de la familia?`)) return;
                    await rejectOrRemoveMember(m.id);
                    toast.success(`${m.name} eliminado`);
                  }}
                  onEditIncome={m.status === "accepted" ? async (v) => {
                    await updateMemberIncome(m.userId, v);
                    toast.success("Ingreso actualizado");
                  } : undefined}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {editingExpense && (
        <ExpenseForm open onOpenChange={o => !o && setEditingExpense(null)} initial={editingExpense}
          onSubmit={async d => { if (editingExpense) { await updateExpense(editingExpense.id, d); toast.success("Actualizado"); setEditingExpense(null); } }}
        />
      )}
    </Layout>
  );
};

export default FamilyOverview;
