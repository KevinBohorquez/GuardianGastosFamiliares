import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { Family, Member, Expense, AVATAR_COLORS } from "@/types";
import * as api from "@/lib/api";

const ACTIVE_KEY = "gg_active_member";

interface Ctx {
  family: Family | null;
  members: Member[];
  expenses: Expense[];
  activeMember: Member | null;
  loading: boolean;
  signup: (familyName: string, email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
  addMember: (name: string, monthlyIncome: number) => Promise<void>;
  updateMember: (id: string, data: Partial<Pick<Member, "name" | "monthlyIncome">>) => Promise<void>;
  deleteMember: (id: string) => Promise<void>;
  selectMember: (id: string | null) => void;
  addExpense: (e: Omit<Expense, "id" | "memberId" | "familyId" | "createdAt">) => Promise<void>;
  updateExpense: (id: string, data: Partial<Omit<Expense, "id" | "memberId" | "familyId" | "createdAt">>) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
}

const AppCtx = createContext<Ctx | null>(null);

export const AppProvider = ({ children }: { children: React.ReactNode }) => {
  const [family, setFamily] = useState<Family | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [activeMemberId, setActiveMemberId] = useState<string | null>(
    () => localStorage.getItem(ACTIVE_KEY)
  );
  const [loading, setLoading] = useState(true);

  const refreshAll = useCallback(async () => {
    const [m, e] = await Promise.all([api.apiListMembers(), api.apiListExpenses()]);
    setMembers(m);
    setExpenses(e);
  }, []);

  // Hydrate desde token guardado
  useEffect(() => {
    (async () => {
      const token = api.getToken();
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const fam = await api.apiGetFamily();
        setFamily(fam);
        await refreshAll();
      } catch {
        api.setToken(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [refreshAll]);

  const activeMember = members.find((m) => m.id === activeMemberId) || null;

  const signup: Ctx["signup"] = async (familyName, email, password) => {
    try {
      const res = await api.apiSignup(familyName, email, password);
      api.setToken(res.accessToken);
      const fam = await api.apiGetFamily();
      setFamily(fam);
      await refreshAll();
      return { ok: true };
    } catch (e: any) {
      return { ok: false, error: e?.message ?? "Error al registrar" };
    }
  };

  const login: Ctx["login"] = async (email, password) => {
    try {
      const res = await api.apiLogin(email, password);
      api.setToken(res.accessToken);
      const fam = await api.apiGetFamily();
      setFamily(fam);
      await refreshAll();
      return { ok: true };
    } catch (e: any) {
      return { ok: false, error: e?.message ?? "Credenciales incorrectas" };
    }
  };

  const logout = () => {
    api.setToken(null);
    localStorage.removeItem(ACTIVE_KEY);
    setFamily(null);
    setMembers([]);
    setExpenses([]);
    setActiveMemberId(null);
  };

  const addMember: Ctx["addMember"] = async (name, monthlyIncome) => {
    const color = AVATAR_COLORS[members.length % AVATAR_COLORS.length];
    const m = await api.apiCreateMember({ name, monthlyIncome, color });
    setMembers((prev) => [...prev, m]);
  };

  const updateMember: Ctx["updateMember"] = async (id, data) => {
    const m = await api.apiUpdateMember(id, data);
    setMembers((prev) => prev.map((x) => (x.id === id ? m : x)));
  };

  const deleteMember: Ctx["deleteMember"] = async (id) => {
    await api.apiDeleteMember(id);
    setMembers((prev) => prev.filter((x) => x.id !== id));
    setExpenses((prev) => prev.filter((e) => e.memberId !== id));
    if (activeMemberId === id) {
      setActiveMemberId(null);
      localStorage.removeItem(ACTIVE_KEY);
    }
  };

  const selectMember = useCallback((id: string | null) => {
    setActiveMemberId(id);
    if (id) localStorage.setItem(ACTIVE_KEY, id);
    else localStorage.removeItem(ACTIVE_KEY);
  }, []);

  const addExpense: Ctx["addExpense"] = async (data) => {
    if (!activeMemberId) return;
    const e = await api.apiCreateExpense({ ...data, memberId: activeMemberId });
    setExpenses((prev) => [e, ...prev]);
  };

  const updateExpense: Ctx["updateExpense"] = async (id, data) => {
    const e = await api.apiUpdateExpense(id, data);
    setExpenses((prev) => prev.map((x) => (x.id === id ? e : x)));
  };

  const deleteExpense: Ctx["deleteExpense"] = async (id) => {
    await api.apiDeleteExpense(id);
    setExpenses((prev) => prev.filter((x) => x.id !== id));
  };

  return (
    <AppCtx.Provider
      value={{
        family,
        members,
        expenses,
        activeMember,
        loading,
        signup,
        login,
        logout,
        addMember,
        updateMember,
        deleteMember,
        selectMember,
        addExpense,
        updateExpense,
        deleteExpense,
      }}
    >
      {loading ? (
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-pulse flex flex-col items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-primary/20 animate-spin border-t-2 border-primary"></div>
            <p className="text-muted-foreground text-sm">Cargando Guardián...</p>
          </div>
        </div>
      ) : (
        children
      )}
    </AppCtx.Provider>
  );
};

export const useApp = () => {
  const c = useContext(AppCtx);
  if (!c) throw new Error("useApp must be used inside AppProvider");
  return c;
};
