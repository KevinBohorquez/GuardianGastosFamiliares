import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { Profile, Family, FamilyMember, Expense, Notification } from "@/types";
import * as api from "@/lib/api";

interface Ctx {
  profile: Profile | null;
  family: Family | null;
  familyMembers: FamilyMember[];
  expenses: Expense[];
  notifications: Notification[];
  loading: boolean;
  signup: (name: string, email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
  updateProfile: (data: Partial<Pick<Profile, "name" | "monthlyIncome" | "expenseRatioThreshold" | "color">>) => Promise<void>;
  createFamily: (familyName: string) => Promise<void>;
  inviteMember: (email: string) => Promise<{ ok: boolean; error?: string }>;
  acceptInvite: (id: string) => Promise<void>;
  rejectOrRemoveMember: (id: string) => Promise<void>;
  addExpense: (e: Omit<Expense, "id" | "userId" | "createdAt">) => Promise<void>;
  updateExpense: (id: string, data: Partial<Omit<Expense, "id" | "userId" | "createdAt">>) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  readNotification: (id: string) => Promise<void>;
  refreshAll: () => Promise<void>;
}

const AppCtx = createContext<Ctx | null>(null);

export const AppProvider = ({ children }: { children: React.ReactNode }) => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [family, setFamily] = useState<Family | null>(null);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshAll = useCallback(async () => {
    try {
      const [p, f, e, n] = await Promise.all([
        api.apiGetProfile(),
        api.apiGetFamily(),
        api.apiListExpenses(),
        api.apiListNotifications(),
      ]);
      setProfile(p);
      setFamily(f);
      setExpenses(e);
      setNotifications(n);

      if (f) {
        const fm = await api.apiListFamilyMembers();
        setFamilyMembers(fm);
      } else {
        setFamilyMembers([]);
      }
    } catch (err) {
      console.error("Error refreshing data", err);
    }
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
        await refreshAll();
      } catch {
        api.setToken(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [refreshAll]);

  const signup: Ctx["signup"] = async (name, email, password) => {
    try {
      const res = await api.apiSignup(name, email, password);
      api.setToken(res.accessToken);
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
      await refreshAll();
      return { ok: true };
    } catch (e: any) {
      return { ok: false, error: e?.message ?? "Credenciales incorrectas" };
    }
  };

  const logout = () => {
    api.setToken(null);
    setProfile(null);
    setFamily(null);
    setFamilyMembers([]);
    setExpenses([]);
    setNotifications([]);
  };

  const updateProfile: Ctx["updateProfile"] = async (data) => {
    const p = await api.apiUpdateProfile(data);
    setProfile(p);
  };

  const createFamily: Ctx["createFamily"] = async (familyName) => {
    const f = await api.apiCreateFamily(familyName);
    setFamily(f);
    const fm = await api.apiListFamilyMembers();
    setFamilyMembers(fm);
  };

  const inviteMember: Ctx["inviteMember"] = async (email) => {
    try {
      await api.apiInviteMember(email);
      const fm = await api.apiListFamilyMembers();
      setFamilyMembers(fm);
      return { ok: true };
    } catch (e: any) {
      return { ok: false, error: e?.message ?? "Error al invitar" };
    }
  };

  const acceptInvite: Ctx["acceptInvite"] = async (id) => {
    await api.apiAcceptInvite(id);
    await refreshAll();
  };

  const rejectOrRemoveMember: Ctx["rejectOrRemoveMember"] = async (id) => {
    await api.apiRemoveMemberOrRejectInvite(id);
    if (familyMembers.some(m => m.id === id && m.userId === profile?.id)) {
      // Si yo salí de la familia
      await refreshAll();
    } else {
      const fm = await api.apiListFamilyMembers();
      setFamilyMembers(fm);
    }
  };

  const addExpense: Ctx["addExpense"] = async (data) => {
    const e = await api.apiCreateExpense(data);
    setExpenses((prev) => [e, ...prev]);
    // Refrescar notificaciones por si se gatilló alerta de presupuesto
    const n = await api.apiListNotifications();
    setNotifications(n);
  };

  const updateExpense: Ctx["updateExpense"] = async (id, data) => {
    const e = await api.apiUpdateExpense(id, data);
    setExpenses((prev) => prev.map((x) => (x.id === id ? e : x)));
  };

  const deleteExpense: Ctx["deleteExpense"] = async (id) => {
    await api.apiDeleteExpense(id);
    setExpenses((prev) => prev.filter((x) => x.id !== id));
  };

  const readNotification: Ctx["readNotification"] = async (id) => {
    await api.apiReadNotification(id);
    setNotifications((prev) => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
  };

  return (
    <AppCtx.Provider
      value={{
        profile,
        family,
        familyMembers,
        expenses,
        notifications,
        loading,
        signup,
        login,
        logout,
        updateProfile,
        createFamily,
        inviteMember,
        acceptInvite,
        rejectOrRemoveMember,
        addExpense,
        updateExpense,
        deleteExpense,
        readNotification,
        refreshAll
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
