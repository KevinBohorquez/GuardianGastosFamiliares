import { useEffect, useState } from "react";
import { useApp } from "@/context/AppContext";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CATEGORIES, CATEGORY_COLORS, Category, Expense, formatCurrency } from "@/types";
import { Pencil, Trash2, Filter, Download, Wallet } from "lucide-react";
import { ExpenseForm } from "@/components/ExpenseForm";
import { DeleteExpenseDialog } from "@/components/DeleteExpenseDialog";
import { toast } from "sonner";
import { safeParseDate, safeFormatDate } from "@/lib/utils";

import * as api from "@/lib/api";

type Scope = "individual" | "familiar";

const History = () => {
  const { profile, family, familyMembers, updateExpense, deleteExpense } = useApp();
  const navigate = useNavigate();

  const isLeader = family?.leader_id === profile?.id;
  const [scope, setScope] = useState<Scope>("individual");
  const [memberFilter, setMemberFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [editing, setEditing] = useState<Expense | null>(null);
  const [deleting, setDeleting] = useState<Expense | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const [paginatedList, setPaginatedList] = useState<Expense[]>([]);
  const [totalFiltered, setTotalFiltered] = useState<number>(0);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [exporting, setExporting] = useState(false);

  const totalPages = Math.ceil(totalFiltered / itemsPerPage);

  const acceptedMembers = familyMembers.filter(m => m.status === 'accepted');
  const allFamilyProfiles = profile ? [profile, ...acceptedMembers.map(m => ({
    id: m.userId,
    name: m.name || "Desconocido",
    color: m.color || "#ccc"
  }))] : [];

  useEffect(() => {
    setCurrentPage(1);
  }, [scope, memberFilter, categoryFilter, from, to]);

  useEffect(() => {
    if (!profile) return;
    const fetchPage = async () => {
      setLoadingHistory(true);
      try {
        const p = {
          page: currentPage,
          limit: itemsPerPage,
          userId: scope === "individual" ? profile.id : (memberFilter !== "all" ? memberFilter : undefined),
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
  }, [currentPage, scope, memberFilter, categoryFilter, from, to, profile, refreshKey]);

  const bumpHistory = () => setRefreshKey((k) => k + 1);

  const exportCSV = async () => {
    setExporting(true);
    const toastId = toast.loading("Preparando exportación...");
    try {
      const p = {
        userId: scope === "individual" ? profile?.id : (memberFilter !== "all" ? memberFilter : undefined),
        category: categoryFilter !== "all" ? categoryFilter : undefined,
        from: from || undefined,
        to: to || undefined,
      };
      const dataToExport = await api.apiExportExpenses(p);

      const rows = [
        ["fecha", "descripción", "categoría", "monto"],
        ...dataToExport.map((e) => [
          safeFormatDate(e.date, "yyyy-MM-dd"),
          `"${e.description.replace(/"/g, '""')}"`,
          e.category,
          e.amount.toFixed(2),
        ]),
      ];
      const csv = rows.map((r) => r.join(",")).join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "gastos_guardian.csv";
      a.click();
      URL.revokeObjectURL(url);
      toast.success("CSV descargado", { id: toastId });
    } catch (e: any) {
      toast.error(e.message || "Error al exportar", { id: toastId });
    } finally {
      setExporting(false);
    }
  };

  if (!profile) return null;

  return (
    <Layout>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <p className="text-muted-foreground">Historial de gastos</p>
          <h1 className="text-4xl font-bold text-gray-900">
            {scope === "individual" ? profile.name : `Familia ${family?.family_name || ""}`}
          </h1>
        </div>
        <Button onClick={exportCSV} variant="outline" className="glass bg-white" disabled={exporting}>
          <Download className="h-4 w-4 mr-2" /> {exporting ? "Exportando..." : "Exportar datos (CSV)"}
        </Button>
      </div>

      {/* Tabs scope */}
      {isLeader && (
        <div className="flex gap-2 mb-6 bg-gray-100/50 p-1 rounded-xl w-fit">
          <Button
            variant="ghost"
            onClick={() => setScope("individual")}
            className={scope === "individual" ? "bg-white shadow-sm text-indigo-600 hover:text-indigo-700" : "text-gray-500 hover:text-gray-700"}
          >
            Mi historial
          </Button>
          <Button
            variant="ghost"
            onClick={() => setScope("familiar")}
            className={scope === "familiar" ? "bg-white shadow-sm text-indigo-600 hover:text-indigo-700" : "text-gray-500 hover:text-gray-700"}
          >
            Historial familiar
          </Button>
        </div>
      )}

      {/* Filters */}
      <div className="glass rounded-2xl p-4 md:p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-4 w-4 text-indigo-500" />
          <h3 className="font-semibold text-gray-800">Filtros</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {scope === "familiar" && (
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-gray-600">Miembro</Label>
              <Select value={memberFilter} onValueChange={setMemberFilter}>
                <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {allFamilyProfiles.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-gray-600">Categoría</Label>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-gray-600">Desde</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="bg-white" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-gray-600">Hasta</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="bg-white" />
          </div>
        </div>
        {(memberFilter !== "all" || categoryFilter !== "all" || from || to) && (
          <Button
            variant="ghost"
            size="sm"
            className="mt-4 text-gray-500 hover:text-indigo-600"
            onClick={() => { setMemberFilter("all"); setCategoryFilter("all"); setFrom(""); setTo(""); }}
          >
            Limpiar filtros
          </Button>
        )}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="glass rounded-2xl p-5 border border-indigo-50">
          <p className="text-sm font-medium text-gray-500">Registros filtrados</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{totalFiltered}</p>
        </div>
      </div>

      {/* List */}
      <div className="glass rounded-2xl p-4 md:p-6 relative min-h-[300px]" data-testid="expense-history-table">
        {loadingHistory && (
          <div className="absolute inset-0 z-10 bg-white/50 backdrop-blur-sm rounded-2xl flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        )}
        
        {!loadingHistory && paginatedList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center h-full">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
              <Wallet className="w-8 h-8 text-gray-300" />
            </div>
            <p className="text-gray-500 font-medium">No hay gastos que coincidan con los filtros.</p>
            <Button variant="link" onClick={() => { setMemberFilter("all"); setCategoryFilter("all"); setFrom(""); setTo(""); }} className="mt-2 text-indigo-600">
              Mostrar todos
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {paginatedList.map((e) => {
              const m = allFamilyProfiles.find((x) => x.id === e.userId);
              const isMine = e.userId === profile.id;
              
              return (
                <div key={e.id} className="flex items-center gap-4 p-4 rounded-xl bg-white border border-gray-100 hover:border-gray-200 hover:shadow-md transition-all duration-200 group">
                  <div
                    className="h-12 w-12 rounded-2xl flex items-center justify-center text-white text-sm font-bold shrink-0 shadow-sm group-hover:scale-105 transition-transform"
                    style={{ background: CATEGORY_COLORS[e.category] }}
                  >
                    {e.category[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 truncate text-base">{e.description}</p>
                    <p className="text-xs font-medium text-gray-500 truncate mt-0.5">
                      {m?.name || "—"} <span className="mx-1.5 opacity-50">•</span> {e.category} <span className="mx-1.5 opacity-50">•</span> {safeFormatDate(e.date, "d MMM yyyy")}
                    </p>
                  </div>
                  <p className="font-bold text-lg text-gray-900 tracking-tight whitespace-nowrap">{formatCurrency(e.amount)}</p>
                  
                  {isMine ? (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50" onClick={() => setEditing(e)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-gray-400 hover:text-red-600 hover:bg-red-50"
                        onClick={() => setDeleting(e)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="w-[72px]" /> // Spacer to align amounts
                  )}
                </div>
              );
            })}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-100">
            <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="bg-white">
              Anterior
            </Button>
            <span className="text-sm text-gray-500 font-medium">Página <span className="text-gray-900">{currentPage}</span> de <span className="text-gray-900">{totalPages}</span></span>
            <Button variant="outline" size="sm" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="bg-white">
              Siguiente
            </Button>
          </div>
        )}
      </div>

      <ExpenseForm
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        initial={editing}
        onSubmit={async (d) => {
          if (editing) {
            await updateExpense(editing.id, d);
            toast.success("Actualizado");
            setEditing(null);
            bumpHistory();
          }
        }}
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
            bumpHistory();
          }
        }}
      />
    </Layout>
  );
};

export default History;