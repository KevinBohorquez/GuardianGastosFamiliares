import { useState } from "react";
import { useApp } from "@/context/AppContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Pencil, Trash2, LogOut, BarChart3 } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency, Member } from "@/types";

const MemberForm = ({ initial, onSubmit, submitLabel }: { initial?: Member; onSubmit: (n: string, i: number) => void; submitLabel: string }) => {
  const [name, setName] = useState(initial?.name || "");
  const [income, setIncome] = useState(initial?.monthlyIncome?.toString() || "");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim()) return toast.error("El nombre es obligatorio");
        const i = parseFloat(income);
        if (isNaN(i) || i < 0) return toast.error("Ingreso inválido");
        onSubmit(name.trim(), i);
      }}
      className="space-y-4"
    >
      <div className="space-y-2">
        <Label>Nombre</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} required />
      </div>
      <div className="space-y-2">
        <Label>Ingreso mensual (S/)</Label>
        <Input type="number" step="0.01" min="0" value={income} onChange={(e) => setIncome(e.target.value)} required />
      </div>
      <DialogFooter>
        <Button type="submit" className="bg-gradient-primary text-white">{submitLabel}</Button>
      </DialogFooter>
    </form>
  );
};

const Profiles = () => {
  const { family, members, addMember, updateMember, deleteMember, selectMember, logout } = useApp();
  const navigate = useNavigate();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Member | null>(null);
  const [deleting, setDeleting] = useState<Member | null>(null);
  const [confirmName, setConfirmName] = useState("");

  if (!family) {
    // defer navigation to next tick to avoid setState during render
    queueMicrotask(() => navigate("/login"));
    return null;
  }

  const pick = (m: Member) => {
    selectMember(m.id);
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="container flex items-center justify-between py-6">
        <div>
          <p className="text-sm text-muted-foreground">Familia {family.familyName}</p>
          <h1 className="text-2xl font-bold">{family.email}</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => { logout(); navigate("/login"); }}>
            <LogOut className="h-4 w-4 mr-2" /> Salir
          </Button>
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <h2 className="text-5xl md:text-6xl font-bold text-center mb-3">¿Quién está usando?</h2>
        <p className="text-muted-foreground text-center mb-12 text-lg">Selecciona tu perfil para gestionar tus gastos</p>

        <div className="flex flex-wrap justify-center gap-8 max-w-5xl">
          {members.map((m) => (
            <div key={m.id} className="group flex flex-col items-center gap-3">
              <button
                onClick={() => pick(m)}
                className="relative h-32 w-32 md:h-40 md:w-40 rounded-3xl flex items-center justify-center text-5xl md:text-6xl font-bold text-white shadow-soft transition-smooth hover:scale-110 hover:shadow-glow ring-4 ring-transparent group-hover:ring-white/60"
                style={{ background: m.color }}
              >
                {m.name[0]?.toUpperCase()}
              </button>
              <div className="text-center">
                <p className="font-semibold text-lg">{m.name}</p>
                <p className="text-xs text-muted-foreground">{formatCurrency(m.monthlyIncome)} /mes</p>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-smooth">
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditing(m)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => { setDeleting(m); setConfirmName(""); }}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}

          <button
            onClick={() => setAdding(true)}
            className="h-32 w-32 md:h-40 md:w-40 rounded-3xl glass border-2 border-dashed border-primary/40 flex flex-col items-center justify-center gap-2 transition-smooth hover:scale-110 hover:border-primary hover:shadow-glow"
          >
            <Plus className="h-10 w-10 text-primary" />
            <span className="font-semibold text-sm">Agregar miembro</span>
          </button>
        </div>

        {members.length === 0 && (
          <p className="mt-10 text-muted-foreground text-center max-w-md">
            Aún no hay miembros. Haz clic en <span className="font-semibold text-primary">"Agregar miembro"</span> para empezar.
          </p>
        )}
      </div>

      {/* Add */}
      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent className="glass-strong">
          <DialogHeader><DialogTitle>Nuevo miembro</DialogTitle></DialogHeader>
          <MemberForm
            submitLabel="Crear"
            onSubmit={(n, i) => { addMember(n, i); toast.success(`${n} agregado`); setAdding(false); }}
          />
        </DialogContent>
      </Dialog>

      {/* Edit */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="glass-strong">
          <DialogHeader><DialogTitle>Editar miembro</DialogTitle></DialogHeader>
          {editing && (
            <MemberForm
              initial={editing}
              submitLabel="Guardar"
              onSubmit={(n, i) => { updateMember(editing.id, { name: n, monthlyIncome: i }); toast.success("Actualizado"); setEditing(null); }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete with confirmation */}
      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent className="glass-strong">
          <DialogHeader><DialogTitle className="text-destructive">Eliminar a {deleting?.name}</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Esta acción es <strong>permanente</strong> y borrará todo su historial de gastos.
            Para confirmar, escribe el nombre exacto: <strong>{deleting?.name}</strong>
          </p>
          <Input value={confirmName} onChange={(e) => setConfirmName(e.target.value)} placeholder={deleting?.name} />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleting(null)}>Cancelar</Button>
            <Button
              variant="destructive"
              disabled={confirmName !== deleting?.name}
              onClick={() => {
                if (deleting) { deleteMember(deleting.id); toast.success("Miembro eliminado"); setDeleting(null); }
              }}
            >
              Eliminar definitivamente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Profiles;
