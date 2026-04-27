import { useEffect, useMemo, useState } from "react";
import { useApp } from "@/context/AppContext";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CATEGORIES, CATEGORY_COLORS, Category, Expense, formatCurrency } from "@/types";
import { Pencil, Trash2, Filter, Download } from "lucide-react";
import { ExpenseForm } from "@/components/ExpenseForm";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import * as api from "@/lib/api";

type Scope = "individual" | "familiar";

const History = () => {
  const { family, members, expenses, activeMember, updateExpense, deleteExpense } = useApp();
  const navigate = useNavigate();

  const [scope, setScope] = useState<Scope>(activeMember ? "individual" : "familiar");
  const [memberFilter, setMemberFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [editing, setEditing] = useState<Expense | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  useEffect(() => {
    if (!family) navigate("/login");
  }, [family, navigate]);

  const [paginatedList, setPaginatedList] = useState<Expense[]>([]);
  const [totalFiltered, setTotalFiltered] = useState<number>(0);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [exporting, setExporting] = useState(false);

  const totalPages = Math.ceil(totalFiltered / itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [scope, memberFilter, categoryFilter, from, to]);

  useEffect(() => {
    if (!family) return;
    const fetchPage = async () => {
      setLoadingHistory(true);
      try {
        const p = {
          page: currentPage,
          limit: itemsPerPage,
          memberId: scope === "individual" ? activeMember?.id : (memberFilter !== "all" ? memberFilter : undefined),
          category: categoryFilter !== "all" ? categoryFilter : undefined,
          from: from || undefined,
          to: to || undefined,
        };
        const res = await api.apiGetPaginatedExpenses(p);
        setPaginatedList(res.data);
        setTotalFiltered(res.total);
      } catch (e: any) {
        toast.error(e.message || "Error al cargar el historial");
      } finally {
        setLoadingHistory(false);
      }
    };
    fetchPage();
  }, [currentPage, scope, memberFilter, categoryFilter, from, to, activeMember, family, expenses]);

  const exportCSV = async () => {
    setExporting(true);
    const toastId = toast.loading("Preparando exportación...");
    try {
      const p = {
        memberId: scope === "individual" ? activeMember?.id : (memberFilter !== "all" ? memberFilter : undefined),
        category: categoryFilter !== "all" ? categoryFilter : undefined,
        from: from || undefined,
        to: to || undefined,
      };
      const dataToExport = await api.apiExportExpenses(p);

      const rows = [
        ["Fecha", "Miembro", "Categoría", "Descripción", "Monto (S/)"],
        ...dataToExport.map((e) => {
          const m = members.find((x) => x.id === e.memberId);
          return [
            format(parseISO(e.date), "yyyy-MM-dd"),
            m?.name || "—",
            e.category,
            `"${e.description.replace(/"/g, '""')}"`,
            e.amount.toFixed(2),
          ];
        }),
      ];
      const csv = rows.map((r) => r.join(",")).join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `historial_${scope}_${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("CSV descargado", { id: toastId });
    } catch (e: any) {
      toast.error(e.message || "Error al exportar", { id: toastId });
    } finally {
      setExporting(false);
    }
  };

  if (!family) return null;

  return (
    <Layout>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <p className="text-muted-foreground">Historial de gastos</p>
          <h1 className="text-4xl font-bold">
            {scope === "individual" ? activeMember?.name || "Individual" : `Familia ${family.familyName}`}
          </h1>
        </div>
        <Button onClick={exportCSV} variant="outline" className="glass" disabled={exporting}>
          <Download className="h-4 w-4 mr-2" /> {exporting ? "Exportando..." : "Exportar CSV"}
        </Button>
      </div>

      {/* Tabs scope */}
      <div className="flex gap-2 mb-6">
        <Button
          variant={scope === "individual" ? "default" : "outline"}
          onClick={() => setScope("individual")}
          disabled={!activeMember}
          className={scope === "individual" ? "bg-gradient-primary text-white" : "glass"}
        >
          Mi historial
        </Button>
        <Button
          variant={scope === "familiar" ? "default" : "outline"}
          onClick={() => setScope("familiar")}
          className={scope === "familiar" ? "bg-gradient-primary text-white" : "glass"}
        >
          Historial familiar
        </Button>
      </div>

      {/* Filters */}
      <div className="glass rounded-2xl p-4 md:p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-4 w-4 text-primary" />
          <h3 className="font-semibold">Filtros</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {scope === "familiar" && (
            <div className="space-y-1">
              <Label className="text-xs">Miembro</Label>
              <Select value={memberFilter} onValueChange={setMemberFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {members.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1">
            <Label className="text-xs">Categoría</Label>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Desde</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Hasta</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>
        {(memberFilter !== "all" || categoryFilter !== "all" || from || to) && (
          <Button
            variant="ghost"
            size="sm"
            className="mt-3"
            onClick={() => { setMemberFilter("all"); setCategoryFilter("all"); setFrom(""); setTo(""); }}
          >
            Limpiar filtros
          </Button>
        )}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="glass rounded-2xl p-5">
          <p className="text-sm text-muted-foreground">Registros filtrados</p>
          <p className="text-3xl font-bold">{totalFiltered}</p>
        </div>
      </div>

      {/* List */}
      <div className="glass rounded-2xl p-4 md:p-6 relative">
        {loadingHistory && (
          <div className="absolute inset-0 z-10 glass-strong rounded-2xl flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        )}
        {paginatedList.length === 0 ? (
          <p className="text-sm text-muted-foreground py-12 text-center">No hay gastos que coincidan con los filtros.</p>
        ) : (
          <div className="space-y-2">
            {paginatedList.map((e) => {
              const m = members.find((x) => x.id === e.memberId);
              return (
                <div key={e.id} className="flex items-center gap-3 p-3 rounded-xl glass hover:shadow-soft transition-smooth">
                  <div
                    className="h-10 w-10 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0"
                    style={{ background: CATEGORY_COLORS[e.category] }}
                  >
                    {e.category[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{e.description}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {m?.name || "—"} · {e.category} · {format(parseISO(e.date), "d MMM yyyy", { locale: es })}
                    </p>
                  </div>
                  <p className="font-bold whitespace-nowrap">{formatCurrency(e.amount)}</p>
                  {(scope === "individual" || (activeMember && e.memberId === activeMember.id)) && (
                    <>
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditing(e)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive"
                        onClick={() => { deleteExpense(e.id); toast.success("Eliminado"); }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/10">
            <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>
              Anterior
            </Button>
            <span className="text-sm text-muted-foreground font-medium">Página {currentPage} de {totalPages}</span>
            <Button variant="outline" size="sm" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>
              Siguiente
            </Button>
          </div>
        )}
      </div>

      <ExpenseForm
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        initial={editing}
        onSubmit={(d) => { if (editing) { updateExpense(editing.id, d); toast.success("Actualizado"); } }}
      />
    </Layout>
  );
};

export default History;