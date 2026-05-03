import { useState, useRef, useEffect } from "react";
import { useApp } from "@/context/AppContext";
import { Bell, Check, X, AlertTriangle, Users, MailOpen, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "./ui/button";
import { formatDistanceToNow, parseISO, format } from "date-fns";
import { es } from "date-fns/locale";

export const NotificationsCenter = () => {
  const { notifications, readNotification, acceptInvite, rejectOrRemoveMember, refreshAll } = useApp();
  const [open, setOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  // Track optimistic states per notification id
  const [pending, setPending] = useState<Record<string, "accepting" | "rejecting" | "accepted" | "rejected">>({});
  const ref = useRef<HTMLDivElement>(null);

  const unread = notifications.filter(n => !n.isRead).length;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleAcceptInvite = async (n: any) => {
    setPending(p => ({ ...p, [n.id]: "accepting" }));
    try {
      await acceptInvite(n.relatedEntityId);
      setPending(p => ({ ...p, [n.id]: "accepted" }));
      await readNotification(n.id);
      // Refresh en background sin bloquear UI
      refreshAll();
    } catch (e: any) {
      setPending(p => { const next = { ...p }; delete next[n.id]; return next; });
    }
  };

  const handleRejectInvite = async (n: any) => {
    setPending(p => ({ ...p, [n.id]: "rejecting" }));
    try {
      await rejectOrRemoveMember(n.relatedEntityId);
      setPending(p => ({ ...p, [n.id]: "rejected" }));
      await readNotification(n.id);
      refreshAll();
    } catch (e: any) {
      setPending(p => { const next = { ...p }; delete next[n.id]; return next; });
    }
  };

  const formatDate = (iso: string) => {
    try {
      const date = parseISO(iso);
      return {
        relative: formatDistanceToNow(date, { addSuffix: true, locale: es }),
        absolute: format(date, "d 'de' MMMM 'a las' HH:mm", { locale: es }),
      };
    } catch {
      return { relative: "hace un momento", absolute: "" };
    }
  };

  const sorted = [...notifications].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="relative flex items-center justify-center w-9 h-9 rounded-full hover:bg-gray-100 transition-colors"
      >
        <Bell className="w-5 h-5 text-gray-500" />
        {unread > 0 && (
          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white animate-pulse" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden"
          style={{ animation: "fadeSlideIn 0.15s ease-out" }}>

          {/* Header */}
          <div className="px-5 py-4 border-b border-gray-50 flex justify-between items-center bg-gradient-to-r from-indigo-50/50 to-purple-50/50">
            <div>
              <h3 className="font-bold text-gray-900 text-base">Notificaciones</h3>
              {unread > 0 && <p className="text-xs text-indigo-600 font-medium mt-0.5">{unread} sin leer</p>}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={async () => { setRefreshing(true); await refreshAll(); setRefreshing(false); }}
                className="text-gray-400 hover:text-indigo-600 transition-colors p-1.5 rounded-lg hover:bg-indigo-50"
                title="Actualizar"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
              </button>
              {unread > 0 && (
                <button
                  onClick={() => notifications.filter(n => !n.isRead).forEach(n => readNotification(n.id))}
                  className="text-xs text-gray-500 hover:text-indigo-600 font-medium transition-colors"
                >
                  Marcar todas
                </button>
              )}
            </div>
          </div>

          {/* List */}
          <div className="max-h-[480px] overflow-y-auto">
            {sorted.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                <div className="w-14 h-14 bg-gray-50 rounded-full flex items-center justify-center mb-3">
                  <MailOpen className="w-7 h-7 text-gray-300" />
                </div>
                <p className="text-sm font-medium text-gray-500">Todo al día</p>
                <p className="text-xs text-gray-400 mt-1">No tienes notificaciones pendientes</p>
              </div>
            ) : (
              <div>
                {sorted.map((n) => {
                  const { relative, absolute } = formatDate(n.createdAt);
                  const isInvite = n.type === "family_invite";
                  const isAlert = n.type === "expense_alert";
                  const state = pending[n.id];

                  return (
                    <div
                      key={n.id}
                      className={`px-5 py-4 border-b border-gray-50 last:border-0 transition-colors ${n.isRead && !state ? "bg-white" : "bg-indigo-50/30"}`}
                    >
                      <div className="flex gap-3">
                        {/* Icon */}
                        <div className={`mt-0.5 w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          state === "accepted" ? "bg-emerald-100" :
                          state === "rejected" ? "bg-gray-100" :
                          isAlert ? "bg-red-100" : "bg-indigo-100"
                        }`}>
                          {state === "accepted" ? <Check className="w-5 h-5 text-emerald-600" /> :
                           state === "rejected" ? <X className="w-5 h-5 text-gray-500" /> :
                           isAlert ? <AlertTriangle className="w-5 h-5 text-red-600" /> :
                           <Users className="w-5 h-5 text-indigo-600" />}
                        </div>

                        <div className="flex-1 min-w-0">
                          {/* Badge */}
                          <span className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md mb-1.5 ${
                            state === "accepted" ? "bg-emerald-100 text-emerald-700" :
                            state === "rejected" ? "bg-gray-100 text-gray-600" :
                            isAlert ? "bg-red-100 text-red-700" : "bg-indigo-100 text-indigo-700"
                          }`}>
                            {state === "accepted" ? "✓ Invitación aceptada" :
                             state === "rejected" ? "✗ Invitación rechazada" :
                             isAlert ? "Alerta de presupuesto" : "Invitación familiar"}
                          </span>

                          <p className={`text-sm leading-snug ${!n.isRead && !state ? "font-medium text-gray-900" : "text-gray-600"}`}>
                            {n.message}
                          </p>

                          {/* Timestamp */}
                          <p className="text-xs text-gray-400 mt-1.5 flex items-center gap-1 flex-wrap">
                            <span>{relative}</span>
                            {absolute && (
                              <>
                                <span className="opacity-40">·</span>
                                <span className="opacity-60">{absolute}</span>
                              </>
                            )}
                          </p>

                          {/* Invite actions */}
                          {isInvite && !n.isRead && !state && (
                            <div className="flex gap-2 mt-3">
                              <Button
                                size="sm"
                                onClick={() => handleAcceptInvite(n)}
                                className="h-8 px-4 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm"
                              >
                                <Check className="w-3 h-3 mr-1.5" /> Aceptar
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleRejectInvite(n)}
                                className="h-8 px-4 text-xs rounded-lg border-gray-200 text-gray-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                              >
                                <X className="w-3 h-3 mr-1.5" /> Rechazar
                              </Button>
                            </div>
                          )}

                          {/* Loading state */}
                          {(state === "accepting" || state === "rejecting") && (
                            <div className="flex items-center gap-1.5 mt-3 text-xs text-gray-500">
                              <Loader2 className="w-3 h-3 animate-spin" />
                              {state === "accepting" ? "Aceptando invitación..." : "Rechazando invitación..."}
                            </div>
                          )}

                          {/* Result state */}
                          {state === "accepted" && (
                            <p className="mt-2 text-xs font-semibold text-emerald-600 flex items-center gap-1">
                              <Check className="w-3 h-3" /> ¡Te has unido a la familia!
                            </p>
                          )}
                          {state === "rejected" && (
                            <p className="mt-2 text-xs font-medium text-gray-500 flex items-center gap-1">
                              <X className="w-3 h-3" /> Invitación rechazada
                            </p>
                          )}

                          {isAlert && !n.isRead && (
                            <button
                              onClick={() => readNotification(n.id)}
                              className="mt-2 text-xs text-indigo-600 font-medium hover:text-indigo-800 transition-colors"
                            >
                              Entendido →
                            </button>
                          )}
                        </div>

                        {!n.isRead && !state && (
                          <div className="w-2 h-2 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
