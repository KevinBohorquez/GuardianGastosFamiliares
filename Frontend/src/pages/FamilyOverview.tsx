import { useEffect, useMemo } from "react";
import { useApp } from "@/context/AppContext";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { CATEGORIES, CATEGORY_COLORS, Category, formatCurrency } from "@/types";
import { TrendingDown, TrendingUp, Users, Wallet } from "lucide-react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, LineChart, Line,
} from "recharts";
import { format, parseISO, startOfMonth } from "date-fns";
import { es } from "date-fns/locale";

const FamilyOverview = () => {
  const { family, members, expenses } = useApp();
  const navigate = useNavigate();

  const monthStart = startOfMonth(new Date());
  const monthly = expenses.filter((e) => parseISO(e.date) >= monthStart);
  const totalIncome = members.reduce((s, m) => s + m.monthlyIncome, 0);
  const totalSpent = monthly.reduce((s, e) => s + e.amount, 0);
  const balance = totalIncome - totalSpent;

  const byCategory = useMemo(() => {
    const map = new Map<Category, number>();
    monthly.forEach((e) => map.set(e.category, (map.get(e.category) || 0) + e.amount));
    return CATEGORIES.map((c) => ({ name: c, value: map.get(c) || 0, fill: CATEGORY_COLORS[c] })).filter((d) => d.value > 0);
  }, [monthly]);

  const byMember = useMemo(() => {
    return members.map((m) => {
      const spent = monthly.filter((e) => e.memberId === m.id).reduce((s, e) => s + e.amount, 0);
      return { name: m.name, Ingreso: m.monthlyIncome, Gasto: spent, color: m.color };
    });
  }, [members, monthly]);

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
    return members.map((m) => {
      const spent = monthly.filter((e) => e.memberId === m.id).reduce((s, e) => s + e.amount, 0);
      return { name: m.name, value: spent, fill: m.color };
    }).filter((d) => d.value > 0);
  }, [members, monthly]);

  const recent = [...expenses]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 15);

  useEffect(() => {
    if (!family) navigate("/login");
  }, [family, navigate]);

  if (!family) return null;

  return (
    <Layout>
      <div className="mb-8">
        <p className="text-muted-foreground">Vista familiar</p>
        <h1 className="text-4xl font-bold">Familia {family.familyName}</h1>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="glass rounded-2xl p-6">
          <Users className="h-5 w-5 text-primary mb-2" />
          <p className="text-sm text-muted-foreground">Miembros</p>
          <p className="text-3xl font-bold">{members.length}</p>
        </div>
        <div className="glass rounded-2xl p-6">
          <Wallet className="h-5 w-5 text-secondary mb-2" />
          <p className="text-sm text-muted-foreground">Ingresos</p>
          <p className="text-2xl font-bold">{formatCurrency(totalIncome)}</p>
        </div>
        <div className="glass rounded-2xl p-6">
          <TrendingDown className="h-5 w-5 text-destructive mb-2" />
          <p className="text-sm text-muted-foreground">Gasto del mes</p>
          <p className="text-2xl font-bold">{formatCurrency(totalSpent)}</p>
        </div>
        <div className="glass rounded-2xl p-6">
          <TrendingUp className={`h-5 w-5 mb-2 ${balance >= 0 ? "text-success" : "text-destructive"}`} />
          <p className="text-sm text-muted-foreground">Balance</p>
          <p className={`text-2xl font-bold ${balance >= 0 ? "text-success" : "text-destructive"}`}>{formatCurrency(balance)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
        <div className="glass rounded-2xl p-6">
          <h3 className="font-semibold mb-4">Gastos por categoría (mes)</h3>
          {byCategory.length === 0 ? (
            <p className="text-sm text-muted-foreground py-12 text-center">Sin datos este mes</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={byCategory} dataKey="value" nameKey="name" innerRadius={60} outerRadius={110} paddingAngle={3} label={(d) => d.name}>
                  {byCategory.map((d, i) => <Cell key={i} fill={d.fill} />)}
                </Pie>
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="glass rounded-2xl p-6">
          <h3 className="font-semibold mb-4">Ingresos vs Gastos por miembro</h3>
          {byMember.length === 0 ? (
            <p className="text-sm text-muted-foreground py-12 text-center">Agrega miembros</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={byMember}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="name" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Legend />
                <Bar dataKey="Ingreso" fill="hsl(var(--secondary))" radius={[8, 8, 0, 0]} />
                <Bar dataKey="Gasto" fill="hsl(var(--accent))" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
        <div className="glass rounded-2xl p-6">
          <h3 className="font-semibold mb-4">Tendencia de Gasto Diario (Familia)</h3>
          {familyByDay.length === 0 ? (
            <p className="text-sm text-muted-foreground py-12 text-center">Sin datos este mes</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={familyByDay}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="date" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Line type="monotone" dataKey="amount" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ fill: "hsl(var(--primary))" }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="glass rounded-2xl p-6">
          <h3 className="font-semibold mb-4">Distribución del Gasto por Miembro</h3>
          {distributionByMember.length === 0 ? (
            <p className="text-sm text-muted-foreground py-12 text-center">Sin datos este mes</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={distributionByMember} dataKey="value" nameKey="name" innerRadius={60} outerRadius={100} paddingAngle={3} label={(d) => d.name}>
                  {distributionByMember.map((d, i) => <Cell key={i} fill={d.fill} />)}
                </Pie>
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="glass rounded-2xl p-6">
        <h3 className="font-semibold mb-4">Historial consolidado (últimos 15)</h3>
        {recent.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Sin gastos registrados todavía</p>
        ) : (
          <div className="space-y-2">
            {recent.map((e) => {
              const m = members.find((x) => x.id === e.memberId);
              return (
                <div key={e.id} className="flex items-center gap-3 p-3 rounded-xl glass">
                  <div className="h-9 w-9 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ background: m?.color || "hsl(var(--muted))" }}>
                    {m?.name[0]?.toUpperCase() || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{e.description}</p>
                    <p className="text-xs text-muted-foreground">{m?.name || "—"} · {e.category} · {format(parseISO(e.date), "d MMM", { locale: es })}</p>
                  </div>
                  <p className="font-bold">{formatCurrency(e.amount)}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default FamilyOverview;
