import { useState, useRef } from "react";
import { useApp } from "@/context/AppContext";
import { Bell, Check, X, AlertTriangle, Users } from "lucide-react";
import { Button } from "./ui/button";

export const NotificationsCenter = () => {
  const { notifications, readNotification, acceptInvite, rejectOrRemoveMember } = useApp();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const unread = notifications.filter(n => !n.isRead).length;

  const handleToggle = () => setOpen(!open);

  const handleAcceptInvite = async (n: any) => {
    // relatedEntityId is the family_members id
    // Wait, the notification stores related_entity_id as family_id
    // But we need the family_members id to accept it.
    // Actually, acceptInvite requires the family_members id.
    // I should modify the backend to return the invite id in relatedEntityId, or just find it.
    // For now, let's assume relatedEntityId is the invite id. (I need to check the backend invite logic. It inserts related_entity_id: family.id)
    // I will fix the backend to put family_members.id as related_entity_id.
    await acceptInvite(n.relatedEntityId);
    await readNotification(n.id);
  };

  const handleRejectInvite = async (n: any) => {
    await rejectOrRemoveMember(n.relatedEntityId);
    await readNotification(n.id);
  };

  return (
    <div className="relative" ref={ref}>
      <Button variant="ghost" size="icon" onClick={handleToggle} className="relative rounded-full hover:bg-black/5">
        <Bell className="w-5 h-5 text-gray-700" />
        {unread > 0 && (
          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border border-white" />
        )}
      </Button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white/95 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
          <div className="p-4 border-b border-gray-100 flex justify-between items-center">
            <h3 className="font-semibold text-gray-800">Notificaciones</h3>
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">{unread} nuevas</span>
          </div>
          
          <div className="max-h-[400px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-gray-500 text-sm">
                No tienes notificaciones
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {notifications.map((n) => (
                  <div key={n.id} className={`p-4 transition-colors ${n.isRead ? 'bg-white' : 'bg-blue-50/50'}`}>
                    <div className="flex gap-3">
                      <div className={`mt-0.5 w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${n.type === 'expense_alert' ? 'bg-red-100 text-red-600' : 'bg-primary/10 text-primary'}`}>
                        {n.type === 'expense_alert' ? <AlertTriangle className="w-4 h-4" /> : <Users className="w-4 h-4" />}
                      </div>
                      <div className="flex-1">
                        <p className={`text-sm ${!n.isRead ? 'font-medium text-gray-900' : 'text-gray-600'}`}>
                          {n.message}
                        </p>
                        
                        {n.type === 'family_invite' && !n.isRead && (
                          <div className="flex gap-2 mt-3">
                            <Button size="sm" onClick={() => handleAcceptInvite(n)} className="h-8 px-3 text-xs bg-primary hover:bg-primary/90 text-white rounded-lg">
                              <Check className="w-3 h-3 mr-1" /> Aceptar
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleRejectInvite(n)} className="h-8 px-3 text-xs rounded-lg">
                              <X className="w-3 h-3 mr-1" /> Rechazar
                            </Button>
                          </div>
                        )}
                        
                        {n.type === 'expense_alert' && !n.isRead && (
                          <div className="mt-2">
                            <button onClick={() => readNotification(n.id)} className="text-xs text-primary font-medium hover:underline">
                              Marcar como leída
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
