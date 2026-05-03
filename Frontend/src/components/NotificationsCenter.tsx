import { useState, useRef, useEffect } from "react";
import { useApp } from "@/context/AppContext";
import { Bell, Check, X, AlertTriangle, Users, MailOpen } from "lucide-react";
import { Button } from "./ui/button";
import { formatDistanceToNow, parseISO, format } from "date-fns";
import { es } from "date-fns/locale";

export const NotificationsCenter = () => {
  const { notifications, readNotification, acceptInvite, rejectOrRemoveMember } = useApp();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const unread = notifications.filter(n => !n.isRead).length;

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleAcceptInvite = async (n: any) => {
    try {
      await acceptInvite(n.relatedEntityId);
      await readNotification(n.id);
    } catch (e: any) {
      console.error(e);
    }
  };

  const handleRejectInvite = async (n: any) => {
    try {
      await rejectOrRemoveMember(n.relatedEntityId);
      await readNotification(n.id);
    } catch (e: any) {
      console.error(e);
    }
  };

  const formatDate = (iso: string) => {
    try {
      const date = parseISO(iso);
      const relative = formatDistanceToNow(date, { addSuffix: true, locale: es });
      const absolute = format(date, "d 'de' MMMM 'a las' HH:mm", { locale: es });
      return { relative, absolute };
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
              {unread > 0 && (
                <p className="text-xs text-indigo-600 font-medium mt-0.5">{unread} sin leer</p>
              )}
            </div>
            {unread > 0 && (
              <button
                onClick={() => notifications.filter(n => !n.isRead).forEach(n => readNotification(n.id))}
                className="text-xs text-gray-500 hover:text-indigo-600 font-medium transition-colors"
              >
                Marcar todas
              </button>
            )}
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

                  return (
                    <div
                      key={n.id}
                      className={`px-5 py-4 border-b border-gray-50 last:border-0 transition-colors ${n.isRead ? 'bg-white' : 'bg-indigo-50/30'}`}
                    >
                      <div className="flex gap-3">
                        {/* Icon */}
                        <div className={`mt-0.5 w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          isAlert
                            ? 'bg-red-100'
                            : 'bg-indigo-100'
                        }`}>
                          {isAlert
                            ? <AlertTriangle className="w-5 h-5 text-red-600" />
                            : <Users className="w-5 h-5 text-indigo-600" />
                          }
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          {/* Badge */}
                          <span className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md mb-1.5 ${
                            isAlert ? 'bg-red-100 text-red-700' : 'bg-indigo-100 text-indigo-700'
                          }`}>
                            {isAlert ? "Alerta de presupuesto" : "Invitación familiar"}
                          </span>

                          <p className={`text-sm leading-snug ${!n.isRead ? 'font-medium text-gray-900' : 'text-gray-600'}`}>
                            {n.message}
                          </p>

                          {/* Timestamp */}
                          <p className="text-xs text-gray-400 mt-1.5 flex items-center gap-1">
                            <span>{relative}</span>
                            {absolute && (
                              <>
                                <span className="opacity-40">·</span>
                                <span className="opacity-60">{absolute}</span>
                              </>
                            )}
                          </p>

                          {/* Actions */}
                          {isInvite && !n.isRead && (
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

                          {isAlert && !n.isRead && (
                            <button
                              onClick={() => readNotification(n.id)}
                              className="mt-2 text-xs text-indigo-600 font-medium hover:text-indigo-800 transition-colors"
                            >
                              Entendido →
                            </button>
                          )}
                        </div>

                        {/* Unread dot */}
                        {!n.isRead && (
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
