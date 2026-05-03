import { useEffect, useMemo, useState } from "react";
import { useApp } from "@/context/AppContext";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { CATEGORIES, CATEGORY_COLORS, Category, formatCurrency } from "@/types";
import { TrendingDown, TrendingUp, Users, Wallet, Plus, Mail, Check, X, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, LineChart, Line,
} from "recharts";
import { format, parseISO, startOfMonth } from "date-fns";
import { es } from "date-fns/locale";

const FamilyOverview = () => {
  const { profile, family, familyMembers, expenses, createFamily, inviteMember, rejectOrRemoveMember } = useApp();
  const navigate = useNavigate();
  const [newFamilyName, setNewFamilyName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");

  const handleCreateFamily = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFamilyName.trim()) return;
    await createFamily(newFamilyName);
    toast.success("Familia creada exitosamente");
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    const r = await inviteMember(inviteEmail);
    if (r.ok) {
      toast.success("Invitación enviada");
      setInviteEmail("");
    } else {
      toast.error(r.error);
    }
  };

  const monthStart = startOfMonth(new Date());
  const monthly = expenses.filter((e) => parseISO(e.date) >= monthStart);

  // Consideramos solo a los miembros aceptados y al líder
  const acceptedMembers = familyMembers.filter(m => m.status === 'accepted');
  const allFamilyProfiles = profile ? [profile, ...acceptedMembers.map(m => ({
    id: m.userId,
    name: m.name || "Desconocido",
    monthlyIncome: m.monthlyIncome || 0,
    color: m.color || "#000"
  }))] : [];

  const totalIncome = allFamilyProfiles.reduce((s, p) => s + p.monthlyIncome, 0);
  const totalSpent = monthly.reduce((s, e) => s + e.amount, 0);
  const balance = totalIncome - totalSpent;

  const byCategory = useMemo(() => {
    const map = new Map<Category, number>();
    monthly.forEach((e) => map.set(e.category, (map.get(e.category) || 0) + e.amount));
    return CATEGORIES.map((c) => ({ name: c, value: map.get(c) || 0, fill: CATEGORY_COLORS[c] })).filter((d) => d.value > 0);
  }, [monthly]);

  const byMember = useMemo(() => {
    return allFamilyProfiles.map((p) => {
      const spent = monthly.filter((e) => e.userId === p.id).reduce((s, e) => s + e.amount, 0);
      return { name: p.name, Ingreso: p.monthlyIncome, Gasto: spent, color: p.color };
    });
  }, [allFamilyProfiles, monthly]);

  const familyByDay = useMemo(() => {
    const map = new Map<string, number>();
    monthly.forEach((e) => {
      const d = e.date.slice(0, 10);
      map.set(d, (map.get(d) || 0) + e.amount);
    });
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, amount]) => ({ date: format(parseISO(date), "d MMM", { locale: es }), amount }));
  }, [monthly]);

  const distributionByMember = useMemo(() => {
    return allFamilyProfiles.map((p) => {
      const spent = monthly.filter((e) => e.userId === p.id).reduce((s, e) => s + e.amount, 0);
      return { name: p.name, value: spent, fill: p.color };
    }).filter((d) => d.value > 0);
  }, [allFamilyProfiles, monthly]);

  const recent = [...expenses]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 15);

  if (!profile) return null;

  if (!family) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="glass-strong p-10 rounded-3xl max-w-md w-full text-center">
            <div className="w-16 h-16 bg-gradient-hero rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-glow">
              <Users className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Aún no tienes familia</h2>
            <p className="text-muted-foreground mb-8 text-sm">Crea una familia para invitar a otras personas y consolidar los gastos del hogar.</p>
            
            <form onSubmit={handleCreateFamily} className="space-y-4 text-left">
              <div className="space-y-2">
                <Label>Nombre de la Familia</Label>
                <Input value={newFamilyName} onChange={(e) => setNewFamilyName(e.target.value)} placeholder="Ej: Los Increíbles" required />
              </div>
              <Button type="submit" className="w-full bg-primary text-white">
                <Plus className="w-4 h-4 mr-2" /> Crear Familia
              </Button>
            </form>
          </div>
        </div>
      </Layout>
    );
  }

  const isLeader = family.leader_id === profile.id;

  return (
    <Layout>
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-muted-foreground font-medium mb-1">Vista familiar</p>
          <h1 className="text-4xl font-bold text-gray-900 tracking-tight">Familia {family.family_name}</h1>
          <div className="flex items-center gap-2 mt-2">
            <span className={`px-2.5 py-1 rounded-md text-xs font-semibold ${isLeader ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'}`}>
              {isLeader ? 'Líder' : 'Miembro'}
            </span>
          </div>
        </div>

        {isLeader && (
          <form onSubmit={handleInvite} className="flex items-center gap-2 bg-white p-2 rounded-xl shadow-sm border border-gray-100">
            <div className="relative">
              <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input 
                type="email" 
                placeholder="Correo para invitar..." 
                value={inviteEmail} 
                onChange={(e) => setInviteEmail(e.target.value)}
                className="pl-9 border-none bg-transparent h-9 focus-visible:ring-0 focus-visible:ring-offset-0 w-64 text-sm"
              />
            </div>
            <Button type="submit" size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg h-9 px-4">
              Invitar
            </Button>
          </form>
        )}
      </div>

      {!isLeader ? (
        <div className="glass rounded-3xl p-8 max-w-2xl mx-auto text-center border border-indigo-50 shadow-lg mt-12">
          <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShieldAlert className="w-10 h-10 text-indigo-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Acceso Restringido</h2>
          <p className="text-gray-500 mb-8 max-w-md mx-auto leading-relaxed">
            Solo el líder de la familia puede ver el dashboard consolidado para proteger la privacidad financiera de los miembros.
          </p>
          <Button variant="destructive" onClick={() => {
            if (window.confirm("¿Estás seguro de abandonar esta familia?")) {
              // Buscar mi membership ID. 
              const myMem = familyMembers.find(m => m.userId === profile.id);
              if (myMem) rejectOrRemoveMember(myMem.id);
            }
          }} className="shadow-sm">
            Abandonar Familia
          </Button>
        </div>
      ) : (
        <>
          {/* Dashboard del Líder */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="glass rounded-2xl p-6 relative overflow-hidden">
              <div className="absolute right-0 top-0 w-20 h-20 bg-indigo-50 rounded-bl-full opacity-50" />
              <Users className="h-5 w-5 text-indigo-500 mb-2 relative z-10" />
              <p className="text-sm font-medium text-gray-500 relative z-10">Miembros Activos</p>
              <p className="text-3xl font-bold text-gray-900 mt-1 relative z-10">{allFamilyProfiles.length}</p>
            </div>
            <div className="glass rounded-2xl p-6 relative overflow-hidden">
              <div className="absolute right-0 top-0 w-20 h-20 bg-emerald-50 rounded-bl-full opacity-50" />
              <Wallet className="h-5 w-5 text-emerald-500 mb-2 relative z-10" />
              <p className="text-sm font-medium text-gray-500 relative z-10">Ingresos Totales</p>
              <p className="text-2xl font-bold text-gray-900 mt-1 relative z-10">{formatCurrency(totalIncome)}</p>
            </div>
            <div className="glass rounded-2xl p-6 relative overflow-hidden">
               <div className="absolute right-0 top-0 w-20 h-20 bg-red-50 rounded-bl-full opacity-50" />
              <TrendingDown className="h-5 w-5 text-red-500 mb-2 relative z-10" />
              <p className="text-sm font-medium text-gray-500 relative z-10">Gasto Familiar (Mes)</p>
              <p className="text-2xl font-bold text-gray-900 mt-1 relative z-10">{formatCurrency(totalSpent)}</p>
            </div>
            <div className="glass rounded-2xl p-6 relative overflow-hidden">
               <div className="absolute right-0 top-0 w-20 h-20 bg-blue-50 rounded-bl-full opacity-50" />
              <TrendingUp className={`h-5 w-5 mb-2 relative z-10 ${balance >= 0 ? "text-blue-500" : "text-red-500"}`} />
              <p className="text-sm font-medium text-gray-500 relative z-10">Balance Familiar</p>
              <p className={`text-2xl font-bold mt-1 relative z-10 ${balance >= 0 ? "text-blue-600" : "text-red-600"}`}>{formatCurrency(balance)}</p>
            </div>
          </div>

          {/* Miembros / Invitaciones */}
          <div className="glass rounded-2xl p-6 mb-8">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center"><Users className="w-4 h-4 mr-2" /> Gestión de Miembros</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl border border-indigo-100 bg-indigo-50/30 flex items-center gap-3">
                 <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shadow-sm" style={{ backgroundColor: profile.color }}>
                   {profile.name[0]?.toUpperCase()}
                 </div>
                 <div>
                   <p className="font-semibold text-gray-900 text-sm leading-tight">{profile.name} (Tú)</p>
                   <p className="text-xs text-indigo-600 font-medium mt-0.5">Líder</p>
                 </div>
              </div>

              {familyMembers.map((m) => (
                <div key={m.id} className="p-4 rounded-xl border border-gray-100 bg-white flex items-center justify-between gap-3 shadow-sm hover:border-gray-200 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shadow-sm" style={{ backgroundColor: m.color || '#ccc' }}>
                      {m.name?.[0]?.toUpperCase() || "?"}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm leading-tight">{m.name || m.userId.substring(0, 8)}</p>
                      <p className={`text-xs font-medium mt-0.5 ${m.status === 'accepted' ? 'text-emerald-600' : 'text-amber-500'}`}>
                        {m.status === 'accepted' ? 'Miembro' : 'Pendiente'}
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => rejectOrRemoveMember(m.id)} className="text-gray-400 hover:text-red-500 h-8 w-8">
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
            <div className="glass rounded-2xl p-6">
              <h3 className="font-semibold text-gray-900 mb-6">Gastos por categoría (mes)</h3>
              {byCategory.length === 0 ? (
                <div className="h-[260px] flex items-center justify-center border-2 border-dashed border-gray-100 rounded-xl">
                  <p className="text-sm text-gray-400 font-medium">Sin datos este mes</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={byCategory} dataKey="value" nameKey="name" innerRadius={70} outerRadius={110} paddingAngle={4} label={(d) => d.name} labelLine={false}>
                      {byCategory.map((d, i) => <Cell key={i} fill={d.fill} stroke="rgba(255,255,255,0.5)" strokeWidth={2}/>)}
                    </Pie>
                    <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 30px -10px rgba(0,0,0,0.1)' }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="glass rounded-2xl p-6">
              <h3 className="font-semibold text-gray-900 mb-6">Ingresos vs Gastos por miembro</h3>
              {byMember.length <= 1 ? (
                <div className="h-[260px] flex items-center justify-center border-2 border-dashed border-gray-100 rounded-xl flex-col gap-2">
                  <p className="text-sm text-gray-400 font-medium">Agrega miembros para comparar</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={byMember} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} tick={{ fill: '#6B7280' }} dy={10} />
                    <YAxis fontSize={11} tickLine={false} axisLine={false} tick={{ fill: '#6B7280' }} tickFormatter={(value) => `S/${value}`} />
                    <Tooltip formatter={(v: number) => formatCurrency(v)} cursor={{ fill: 'rgba(99, 102, 241, 0.05)' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 30px -10px rgba(0,0,0,0.1)' }} />
                    <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }} />
                    <Bar dataKey="Ingreso" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={30} />
                    <Bar dataKey="Gasto" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={30} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
            <div className="glass rounded-2xl p-6">
              <h3 className="font-semibold text-gray-900 mb-6">Tendencia de Gasto Diario</h3>
              {familyByDay.length === 0 ? (
                <div className="h-[260px] flex items-center justify-center border-2 border-dashed border-gray-100 rounded-xl">
                  <p className="text-sm text-gray-400 font-medium">Sin datos este mes</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={familyByDay} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis dataKey="date" fontSize={11} tickLine={false} axisLine={false} tick={{ fill: '#6B7280' }} dy={10} />
                    <YAxis fontSize={11} tickLine={false} axisLine={false} tick={{ fill: '#6B7280' }} tickFormatter={(value) => `S/${value}`} />
                    <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 30px -10px rgba(0,0,0,0.1)' }} />
                    <Line type="monotone" dataKey="amount" stroke="#6366f1" strokeWidth={3} dot={{ fill: "#6366f1", strokeWidth: 2, r: 4 }} activeDot={{ r: 6, fill: "#4f46e5" }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="glass rounded-2xl p-6">
              <h3 className="font-semibold text-gray-900 mb-6">Distribución del Gasto por Miembro</h3>
              {distributionByMember.length <= 1 ? (
                <div className="h-[260px] flex items-center justify-center border-2 border-dashed border-gray-100 rounded-xl">
                  <p className="text-sm text-gray-400 font-medium">Sin suficientes datos</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={distributionByMember} dataKey="value" nameKey="name" innerRadius={70} outerRadius={110} paddingAngle={4} label={(d) => d.name} labelLine={false}>
                      {distributionByMember.map((d, i) => <Cell key={i} fill={d.fill} stroke="rgba(255,255,255,0.5)" strokeWidth={2}/>)}
                    </Pie>
                    <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 30px -10px rgba(0,0,0,0.1)' }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="glass rounded-2xl p-6">
            <h3 className="font-semibold text-gray-900 mb-6">Historial consolidado (últimos 15)</h3>
            {recent.length === 0 ? (
               <div className="py-12 flex flex-col items-center justify-center bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
                 <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-sm mb-3">
                   <Wallet className="w-6 h-6 text-gray-300" />
                 </div>
                 <p className="text-sm font-medium text-gray-600">Sin registros aún</p>
               </div>
            ) : (
              <div className="space-y-3">
                {recent.map((e) => {
                  const p = allFamilyProfiles.find((x) => x.id === e.userId);
                  return (
                    <div key={e.id} className="flex items-center gap-4 p-4 rounded-xl bg-white border border-gray-100 hover:border-gray-200 hover:shadow-md transition-all duration-200">
                      <div className="h-10 w-10 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm" style={{ background: p?.color || "#ccc" }}>
                        {p?.name[0]?.toUpperCase() || "?"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-800 truncate text-sm">{e.description}</p>
                        <p className="text-xs font-medium text-gray-500 mt-0.5">{p?.name || "—"} <span className="mx-1.5 opacity-50">•</span> {e.category} <span className="mx-1.5 opacity-50">•</span> {format(parseISO(e.date), "d MMM", { locale: es })}</p>
                      </div>
                      <p className="font-bold text-gray-900 tracking-tight">{formatCurrency(e.amount)}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </Layout>
  );
};

export default FamilyOverview;
