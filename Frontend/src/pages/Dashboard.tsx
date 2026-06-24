import { useEffect, useMemo, useState } from "react";
import { useApp } from "@/context/AppContext";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CATEGORY_COLORS, CATEGORIES, Category, Expense, formatCurrency } from "@/types";
import { Plus, Pencil, Trash2, TrendingDown, TrendingUp, Wallet, Settings } from "lucide-react";
import { ExpenseForm } from "@/components/ExpenseForm";
import { DeleteExpenseDialog } from "@/components/DeleteExpenseDialog";
import { toast } from "sonner";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line,
} from "recharts";
import { startOfMonth } from "date-fns";
import { safeParseDate, safeFormatDate } from "@/lib/utils";


const Dashboard = () => {
  const { profile, expenses, updateProfile, addExpense, updateExpense, deleteExpense } = useApp();
  const navigate = useNavigate();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [deleting, setDeleting] = useState<Expense | null>(null);
  
  // Settings
  const [showSettings, setShowSettings] = useState(false);
  const [monthlyIncome, setMonthlyIncome] = useState(profile?.monthlyIncome?.toString() || "0");
  const [expenseRatioThreshold, setExpenseRatioThreshold] = useState((profile?.expenseRatioThreshold ? profile.expenseRatioThreshold * 100 : 80).toString());

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateProfile({
      monthlyIncome: Number(monthlyIncome),
      expenseRatioThreshold: Number(expenseRatioThreshold) / 100,
    });
    toast.success("Configuración actualizada");
    setShowSettings(false);
  };

  const monthStart = startOfMonth(new Date());
  const myExpenses = expenses
    .filter((e) => profile && e.userId === profile.id)
    .sort((a, b) => b.date.localeCompare(a.date));
  const monthly = myExpenses.filter((e) => safeParseDate(e.date) >= monthStart);
  const totalMonth = monthly.reduce((s, e) => s + e.amount, 0);
  const balance = (profile?.monthlyIncome || 0) - totalMonth;
  const usagePct = profile?.monthlyIncome ? Math.min(100, (totalMonth / profile.monthlyIncome) * 100) : 0;
  const expenseRatio = profile?.monthlyIncome ? (totalMonth / profile.monthlyIncome) * 100 : 0;

  const byCategory = useMemo(() => {
    const map = new Map<Category, number>();
    monthly.forEach((e) => map.set(e.category, (map.get(e.category) || 0) + e.amount));
    return CATEGORIES.map((c) => ({ name: c, value: map.get(c) || 0, fill: CATEGORY_COLORS[c] })).filter((d) => d.value > 0);
  }, [monthly]);

  const byDay = useMemo(() => {
    const map = new Map<string, number>();
    monthly.forEach((e) => {
      const d = e.date.slice(0, 10);
      map.set(d, (map.get(d) || 0) + e.amount);
    });
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, amount]) => ({ date: safeFormatDate(date, "d MMM"), amount }));
  }, [monthly]);

  const byWeekDay = useMemo(() => {
    const days = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
    const map = new Map<number, number>();
    monthly.forEach((e) => {
      const dayIndex = safeParseDate(e.date).getDay();
      map.set(dayIndex, (map.get(dayIndex) || 0) + e.amount);
    });
    return Array.from({ length: 7 }, (_, i) => ({
      name: days[i],
      amount: map.get(i) || 0,
    })).filter((d) => d.amount > 0);
  }, [monthly]);

  const top5Expenses = useMemo(() => {
    return [...monthly]
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5)
      .map((e) => ({
        name: e.description.length > 15 ? e.description.substring(0, 15) + "..." : e.description,
        amount: e.amount,
        fill: CATEGORY_COLORS[e.category]
      }));
  }, [monthly]);

  if (!profile) return null;

  return (
    <Layout>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <p className="text-muted-foreground">Hola,</p>
          <h1 className="text-4xl font-bold">{profile.name} 👋</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setShowSettings(!showSettings)} className="glass h-11">
            <Settings className="h-4 w-4 mr-2" /> Presupuesto
          </Button>
          <Button onClick={() => setAdding(true)} className="bg-gradient-primary text-white shadow-glow h-11">
            <Plus className="h-4 w-4 mr-2" /> Registrar gasto
          </Button>
        </div>
      </div>

      {showSettings && (
        <div className="glass-strong rounded-3xl p-6 mb-8 animate-in fade-in slide-in-from-top-4">
          <h2 className="text-xl font-bold mb-4 flex items-center"><Wallet className="w-5 h-5 mr-2 text-primary" /> Configuración Financiera</h2>
          <form onSubmit={handleSaveSettings} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Ingreso mensual proyectado (S/)</Label>
              <Input type="number" step="0.01" min="0" value={monthlyIncome} onChange={(e) => setMonthlyIncome(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Umbral de alerta de gastos (%)</Label>
              <div className="flex items-center gap-2">
                <Input type="number" min="1" max="100" value={expenseRatioThreshold} onChange={(e) => setExpenseRatioThreshold(e.target.value)} required />
                <span className="text-muted-foreground">%</span>
              </div>
              <p className="text-xs text-muted-foreground">Recibirás una alerta cuando gastes más de este porcentaje.</p>
            </div>
            <div className="md:col-span-2 flex justify-end">
              <Button type="submit" className="bg-primary text-white shadow-sm">Guardar cambios</Button>
            </div>
          </form>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="glass rounded-2xl p-6 relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary/5 rounded-full group-hover:scale-150 transition-transform duration-500 ease-out" />
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Ingreso mensual</span>
            <Wallet className="h-5 w-5 text-indigo-500" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{formatCurrency(profile.monthlyIncome)}</p>
        </div>
        <div className="glass rounded-2xl p-6 relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-red-500/5 rounded-full group-hover:scale-150 transition-transform duration-500 ease-out" />
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Gasto del mes</span>
            <TrendingDown className="h-5 w-5 text-red-500" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{formatCurrency(totalMonth)}</p>
          <div className="mt-3 h-2 rounded-full bg-gray-100 overflow-hidden">
            <div className={`h-full transition-all duration-1000 ease-out ${usagePct > (profile.expenseRatioThreshold * 100) ? 'bg-red-500' : 'bg-gradient-to-r from-indigo-500 to-purple-500'}`} style={{ width: `${usagePct}%` }} />
          </div>
          <p className={`text-xs mt-1.5 font-medium ${usagePct > (profile.expenseRatioThreshold * 100) ? 'text-red-500' : 'text-gray-500'}`}>
            {usagePct.toFixed(0)}% del presupuesto
          </p>
        </div>
        <div className="glass rounded-2xl p-6 relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-500/5 rounded-full group-hover:scale-150 transition-transform duration-500 ease-out" />
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Balance Restante</span>
            <TrendingUp className={`h-5 w-5 ${balance >= 0 ? "text-emerald-500" : "text-red-500"}`} />
          </div>
          <p className={`text-3xl font-bold ${balance >= 0 ? "text-emerald-600" : "text-red-600"}`}>
            {formatCurrency(balance)}
          </p>
        </div>
        <div className="glass rounded-2xl p-6 relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-amber-500/5 rounded-full group-hover:scale-150 transition-transform duration-500 ease-out" />
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Ratio de gasto</span>
            <TrendingDown className="h-5 w-5 text-amber-500" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{expenseRatio.toFixed(0)}%</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
        <div className="glass rounded-2xl p-6">
          <h3 className="font-semibold text-gray-800 mb-6">Distribución por categoría</h3>
          {byCategory.length === 0 ? (
            <div className="h-[260px] flex items-center justify-center border-2 border-dashed border-gray-100 rounded-xl">
              <p className="text-sm text-gray-400 font-medium">Sin datos este mes</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={byCategory} dataKey="value" nameKey="name" innerRadius={70} outerRadius={110} paddingAngle={4}>
                  {byCategory.map((d, i) => <Cell key={i} fill={d.fill} stroke="rgba(255,255,255,0.5)" strokeWidth={2} />)}
                </Pie>
                <Tooltip 
                  formatter={(v: number) => formatCurrency(v)}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 30px -10px rgba(0,0,0,0.1)' }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="glass rounded-2xl p-6">
          <h3 className="font-semibold text-gray-800 mb-6">Tendencia diaria</h3>
          {byDay.length === 0 ? (
            <div className="h-[260px] flex items-center justify-center border-2 border-dashed border-gray-100 rounded-xl">
              <p className="text-sm text-gray-400 font-medium">Sin datos este mes</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={byDay} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="date" fontSize={11} tickLine={false} axisLine={false} tick={{ fill: '#6B7280' }} dy={10} />
                <YAxis fontSize={11} tickLine={false} axisLine={false} tick={{ fill: '#6B7280' }} tickFormatter={(value) => `S/${value}`} />
                <Tooltip 
                  formatter={(v: number) => formatCurrency(v)}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 30px -10px rgba(0,0,0,0.1)' }}
                />
                <Line type="monotone" dataKey="amount" stroke="#6366f1" strokeWidth={3} dot={{ fill: "#6366f1", strokeWidth: 2, r: 4 }} activeDot={{ r: 6, fill: "#4f46e5" }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Nuevos Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
        <div className="glass rounded-2xl p-6">
          <h3 className="font-semibold text-gray-800 mb-6">Gastos por día de la semana</h3>
          {byWeekDay.length === 0 ? (
             <div className="h-[260px] flex items-center justify-center border-2 border-dashed border-gray-100 rounded-xl">
               <p className="text-sm text-gray-400 font-medium">Sin datos este mes</p>
             </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={byWeekDay} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} tick={{ fill: '#6B7280' }} dy={10} />
                <YAxis fontSize={11} tickLine={false} axisLine={false} tick={{ fill: '#6B7280' }} tickFormatter={(value) => `S/${value}`} />
                <Tooltip 
                  formatter={(v: number) => formatCurrency(v)}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 30px -10px rgba(0,0,0,0.1)', cursor: 'default' }}
                  cursor={{ fill: 'rgba(99, 102, 241, 0.05)' }}
                />
                <Bar dataKey="amount" fill="#8b5cf6" radius={[6, 6, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="glass rounded-2xl p-6">
          <h3 className="font-semibold text-gray-800 mb-6">Top 5 Gastos del mes</h3>
          {top5Expenses.length === 0 ? (
             <div className="h-[260px] flex items-center justify-center border-2 border-dashed border-gray-100 rounded-xl">
               <p className="text-sm text-gray-400 font-medium">Sin datos este mes</p>
             </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={top5Expenses} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB" />
                <XAxis type="number" fontSize={11} tickLine={false} axisLine={false} tick={{ fill: '#6B7280' }} />
                <YAxis dataKey="name" type="category" width={100} fontSize={11} tickLine={false} axisLine={false} tick={{ fill: '#374151', fontWeight: 500 }} />
                <Tooltip 
                  formatter={(v: number) => formatCurrency(v)}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 30px -10px rgba(0,0,0,0.1)' }}
                  cursor={{ fill: 'rgba(99, 102, 241, 0.05)' }}
                />
                <Bar dataKey="amount" radius={[0, 6, 6, 0]} maxBarSize={30}>
                  {top5Expenses.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* History */}
      <div className="glass rounded-2xl p-6">
        <h3 className="font-semibold text-gray-800 mb-6">Mis gastos recientes ({myExpenses.length})</h3>
        {myExpenses.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
            <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-sm mb-3">
              <Wallet className="w-6 h-6 text-gray-300" />
            </div>
            <p className="text-sm font-medium text-gray-600">Sin registros aún</p>
            <p className="text-xs text-gray-400 mt-1">¡Registra tu primer gasto para empezar!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {myExpenses.slice(0, 10).map((e) => (
              <div key={e.id} className="flex items-center gap-4 p-4 rounded-xl bg-white border border-gray-100 hover:border-gray-200 hover:shadow-md transition-all duration-200 group">
                <div className="h-12 w-12 rounded-2xl flex items-center justify-center text-white text-lg font-bold shadow-sm group-hover:scale-105 transition-transform" style={{ background: CATEGORY_COLORS[e.category] }}>
                  {e.category[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800 truncate text-base">{e.description}</p>
                  <p className="text-xs font-medium text-gray-500 mt-0.5">{e.category} <span className="mx-1.5 opacity-50">•</span> {safeFormatDate(e.date, "d MMM yyyy")}</p>
                </div>
                <p className="font-bold text-lg text-gray-900 tracking-tight">{formatCurrency(e.amount)}</p>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50" onClick={() => setEditing(e)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-gray-400 hover:text-red-600 hover:bg-red-50" onClick={() => setDeleting(e)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            {myExpenses.length > 10 && (
              <Button variant="ghost" className="w-full text-indigo-600 hover:bg-indigo-50 mt-2" onClick={() => navigate("/history")}>
                Ver historial completo
              </Button>
            )}
          </div>
        )}
      </div>

      <ExpenseForm
        open={adding}
        onOpenChange={setAdding}
        onSubmit={async (d) => { await addExpense(d); toast.success("Gasto registrado"); }}
      />
      <ExpenseForm
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        initial={editing}
        onSubmit={async (d) => { if (editing) { await updateExpense(editing.id, d); toast.success("Actualizado"); setEditing(null); } }}
      />
      <DeleteExpenseDialog
        open={!!deleting}
        description={deleting?.description || ""}
        onOpenChange={(o) => !o && setDeleting(null)}
        onConfirm={async () => {
          if (deleting) {
            await deleteExpense(deleting.id);
            toast.success("Eliminado");
            setDeleting(null);
          }
        }}
      />
    </Layout>
  );
};

export default Dashboard;
