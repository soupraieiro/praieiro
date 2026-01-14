import { useEffect, useState, useCallback } from "react";
import { Bell, AlertTriangle, Info, CheckCircle, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface AdminNotification {
  id: string;
  title: string;
  message: string;
  notification_type: string;
  priority: string | null;
  is_read: boolean | null;
  is_archived: boolean | null;
  created_at: string | null;
  action_required: boolean | null;
  action_type: string | null;
}

interface AdminNotificationBellProps {
  onNavigateToTab?: (tabId: string) => void;
}

export function AdminNotificationBell({ onNavigateToTab }: AdminNotificationBellProps) {
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);

  const fetchNotifications = useCallback(async () => {
    const { data, error } = await supabase
      .from("ai_council_admin_notifications")
      .select("*")
      .eq("is_archived", false)
      .order("created_at", { ascending: false })
      .limit(30);

    if (error) {
      console.error("Erro ao buscar notificações admin:", error);
      return;
    }

    if (data) {
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.is_read).length);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    
    // Subscribe to realtime notifications
    const channel = supabase
      .channel('admin-notifications-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ai_council_admin_notifications'
        },
        (payload) => {
          const newNotification = payload.new as AdminNotification;
          setNotifications(prev => [newNotification, ...prev]);
          setUnreadCount(prev => prev + 1);
          
          // Show critical toast for critical notifications
          if (newNotification.priority === 'critical' || newNotification.notification_type === 'critical') {
            toast.error(
              <div className="flex flex-col gap-1">
                <span className="font-semibold flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Atenção Administrador
                </span>
                <span className="text-sm">
                  O Conselho de IA detectou um desequilíbrio no fluxo de Conchas.
                </span>
                <button 
                  onClick={() => {
                    if (onNavigateToTab) {
                      onNavigateToTab('satoshi-dashboard');
                    }
                    toast.dismiss();
                  }}
                  className="mt-2 text-xs underline text-left hover:text-destructive-foreground"
                >
                  Clique aqui para resolver na Aba SQL →
                </button>
              </div>,
              {
                duration: 10000,
                className: "bg-destructive text-destructive-foreground border-destructive",
              }
            );
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'ai_council_admin_notifications'
        },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchNotifications, onNavigateToTab]);

  const markAsRead = async (notificationId: string) => {
    await supabase
      .from("ai_council_admin_notifications")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("id", notificationId);

    setNotifications(prev =>
      prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = async () => {
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
    
    if (unreadIds.length === 0) return;

    await supabase
      .from("ai_council_admin_notifications")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .in("id", unreadIds);

    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  const handleNotificationClick = (notification: AdminNotification) => {
    markAsRead(notification.id);
    
    // Navigate to appropriate tab based on notification type
    if (onNavigateToTab) {
      if (notification.notification_type === 'critical' || 
          notification.notification_type === 'balance_alert' ||
          notification.action_type === 'sql_correction') {
        onNavigateToTab('satoshi-dashboard');
      } else if (notification.notification_type === 'security_alert' ||
                 notification.action_type === 'review_ban') {
        onNavigateToTab('satoshi-dashboard');
      } else if (notification.notification_type === 'council_decision') {
        onNavigateToTab('ai-council');
      } else if (notification.notification_type === 'code_issue') {
        onNavigateToTab('code-issues');
      }
    }
    
    setOpen(false);
  };

  const getPriorityIcon = (priority: string | null, type: string) => {
    if (priority === 'critical' || type === 'critical') {
      return <AlertTriangle className="h-4 w-4 text-destructive" />;
    }
    if (priority === 'high') {
      return <XCircle className="h-4 w-4 text-orange-500" />;
    }
    if (priority === 'low' || type === 'info') {
      return <Info className="h-4 w-4 text-blue-500" />;
    }
    return <CheckCircle className="h-4 w-4 text-green-500" />;
  };

  const getPriorityColor = (priority: string | null, type: string) => {
    if (priority === 'critical' || type === 'critical') return "border-l-destructive";
    if (priority === 'high') return "border-l-orange-500";
    if (priority === 'low' || type === 'info') return "border-l-blue-500";
    return "border-l-green-500";
  };

  const formatTime = (dateString: string | null) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Agora";
    if (diffMins < 60) return `${diffMins}min`;
    if (diffHours < 24) return `${diffHours}h`;
    return `${diffDays}d`;
  };

  return (
    <TooltipProvider>
      <Popover open={open} onOpenChange={setOpen}>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon"
                className="relative transition-transform duration-200 hover:scale-105 active:scale-95"
              >
                <Bell className={cn(
                  "h-5 w-5 transition-all duration-200",
                  unreadCount > 0 && "text-destructive animate-pulse"
                )} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground animate-bounce">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            <p>Notificações do Conselho de IA</p>
          </TooltipContent>
        </Tooltip>
        <PopoverContent align="end" className="w-96 p-0">
          <div className="flex items-center justify-between border-b px-4 py-3 bg-muted/50">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-primary" />
              <h4 className="font-semibold">Alertas do Conselho IA</h4>
            </div>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground hover:text-foreground"
                onClick={markAllAsRead}
              >
                Marcar todas como lidas
              </Button>
            )}
          </div>
          <ScrollArea className="h-[400px]">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Bell className="h-10 w-10 text-muted-foreground/30" />
                <p className="mt-3 text-sm text-muted-foreground">
                  Nenhuma notificação do Conselho
                </p>
                <p className="text-xs text-muted-foreground/70">
                  Alertas críticos aparecerão aqui
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {notifications.map((notification) => (
                  <button
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={cn(
                      "flex w-full gap-3 p-4 text-left transition-colors hover:bg-muted/50 border-l-4",
                      getPriorityColor(notification.priority, notification.notification_type),
                      !notification.is_read && "bg-primary/5"
                    )}
                  >
                    <div className="mt-0.5 shrink-0">
                      {getPriorityIcon(notification.priority, notification.notification_type)}
                    </div>
                    <div className="flex-1 space-y-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className={cn(
                          "text-sm truncate",
                          !notification.is_read && "font-semibold"
                        )}>
                          {notification.title}
                        </p>
                        <span className="text-[10px] text-muted-foreground/70 shrink-0">
                          {formatTime(notification.created_at)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {notification.message}
                      </p>
                      {notification.action_required && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-destructive font-medium">
                          <AlertTriangle className="h-3 w-3" />
                          Ação necessária
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </PopoverContent>
      </Popover>
    </TooltipProvider>
  );
}
