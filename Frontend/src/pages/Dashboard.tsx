import { useEffect, useMemo, useState } from "react";
import { useApp } from "@/context/AppContext";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { CATEGORY_COLORS, CATEGORIES, Category, Expense, formatCurrency } from "@/types";
import { Plus, Pencil, Trash2, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { ExpenseForm } from "@/components/ExpenseForm";
import { toast } from "sonner";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line,
} from "recharts";
import { format, parseISO, startOfMonth } from "date-fns";
import { es } from "date-fns/locale";

const Dashboard = () => {
  const { activeMember, expenses, addExpense, updateExpense, deleteExpense } = useApp();
  const navigate = useNavigate();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);

  const monthStart = startOfMonth(new Date());
  const myExpenses = expenses
    .filter((e) => activeMember && e.memberId === activeMember.id)
    .sort((a, b) => b.date.localeCompare(a.date));
  const monthly = myExpenses.filter((e) => parseISO(e.date) >= monthStart);
  const totalMonth = monthly.reduce((s, e) => s + e.amount, 0);
  const balance = (activeMember?.monthlyIncome || 0) - totalMonth;
  const usagePct = activeMember?.monthlyIncome ? Math.min(100, (totalMonth / activeMember.monthlyIncome) * 100) : 0;

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
      .map(([date, amount]) => ({ date: format(parseISO(date), "d MMM", { locale: es }), amount }));
  }, [monthly]);

  const byWeekDay = useMemo(() => {
    const days = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
    const map = new Map<number, number>();
    monthly.forEach((e) => {
      const dayIndex = parseISO(e.date).getDay();
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


  useEffect(() => {
    if (!activeMember) navigate("/profiles");
  }, [activeMember, navigate]);

  if (!activeMember) return null;

  return (
    <Layout>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <p className="text-muted-foreground">Hola,</p>
          <h1 className="text-4xl font-bold">{activeMember.name} 👋</h1>
        </div>
        <Button onClick={() => setAdding(true)} className="bg-gradient-primary text-white shadow-glow h-11">
          <Plus className="h-4 w-4 mr-2" /> Registrar gasto
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Ingreso mensual</span>
            <Wallet className="h-5 w-5 text-secondary" />
          </div>
          <p className="text-3xl font-bold">{formatCurrency(activeMember.monthlyIncome)}</p>
        </div>
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Gasto del mes</span>
            <TrendingDown className="h-5 w-5 text-destructive" />
          </div>
          <p className="text-3xl font-bold">{formatCurrency(totalMonth)}</p>
          <div className="mt-3 h-2 rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-gradient-hero transition-smooth" style={{ width: `${usagePct}%` }} />
          </div>
          <p className="text-xs text-muted-foreground mt-1">{usagePct.toFixed(0)}% del presupuesto</p>
        </div>
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Balance</span>
            <TrendingUp className={`h-5 w-5 ${balance >= 0 ? "text-success" : "text-destructive"}`} />
          </div>
          <p className={`text-3xl font-bold ${balance >= 0 ? "text-success" : "text-destructive"}`}>
            {formatCurrency(balance)}
          </p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
        <div className="glass rounded-2xl p-6">
          <h3 className="font-semibold mb-4">Distribución por categoría</h3>
          {byCategory.length === 0 ? (
            <p className="text-sm text-muted-foreground py-12 text-center">Aún sin datos este mes</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={byCategory} dataKey="value" nameKey="name" innerRadius={60} outerRadius={100} paddingAngle={3}>
                  {byCategory.map((d, i) => <Cell key={i} fill={d.fill} />)}
                </Pie>
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="glass rounded-2xl p-6">
          <h3 className="font-semibold mb-4">Tendencia diaria</h3>
          {byDay.length === 0 ? (
            <p className="text-sm text-muted-foreground py-12 text-center">Aún sin datos este mes</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={byDay}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="date" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Line type="monotone" dataKey="amount" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ fill: "hsl(var(--primary))" }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Nuevos Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
        <div className="glass rounded-2xl p-6">
          <h3 className="font-semibold mb-4">Gastos por día de la semana</h3>
          {byWeekDay.length === 0 ? (
            <p className="text-sm text-muted-foreground py-12 text-center">Aún sin datos</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={byWeekDay}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="name" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="glass rounded-2xl p-6">
          <h3 className="font-semibold mb-4">Top 5 Gastos del mes</h3>
          {top5Expenses.length === 0 ? (
            <p className="text-sm text-muted-foreground py-12 text-center">Aún sin datos</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={top5Expenses} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} horizontal={false} />
                <XAxis type="number" fontSize={12} />
                <YAxis dataKey="name" type="category" fontSize={12} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
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
        <h3 className="font-semibold mb-4">Mis gastos ({myExpenses.length})</h3>
        {myExpenses.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Sin registros aún. ¡Registra tu primer gasto!</p>
        ) : (
          <div className="space-y-2">
            {myExpenses.map((e) => (
              <div key={e.id} className="flex items-center gap-3 p-3 rounded-xl glass hover:shadow-soft transition-smooth">
                <div className="h-10 w-10 rounded-xl flex items-center justify-center text-white text-xs font-bold" style={{ background: CATEGORY_COLORS[e.category] }}>
                  {e.category[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{e.description}</p>
                  <p className="text-xs text-muted-foreground">{e.category} · {format(parseISO(e.date), "d MMM yyyy", { locale: es })}</p>
                </div>
                <p className="font-bold">{formatCurrency(e.amount)}</p>
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditing(e)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => { deleteExpense(e.id); toast.success("Eliminado"); }}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <ExpenseForm
        open={adding}
        onOpenChange={setAdding}
        onSubmit={(d) => { addExpense(d); toast.success("Gasto registrado"); }}
      />
      <ExpenseForm
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        initial={editing}
        onSubmit={(d) => { if (editing) { updateExpense(editing.id, d); toast.success("Actualizado"); } }}
      />
    </Layout>
  );
};

export default Dashboard;
