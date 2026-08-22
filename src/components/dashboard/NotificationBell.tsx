import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { Bell, MessageSquare, Gavel, CheckCircle2, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { useNotifications, type NotificationRow } from "@/hooks/useNotifications";

const TYPE_ICONS: Record<string, typeof Bell> = {
  message: MessageSquare,
  bid_received: Gavel,
  bid_accepted: CheckCircle2,
};

const NotificationBell = () => {
  const { notifications, unreadCount, loading, markRead, markAllRead } = useNotifications();
  const navigate = useNavigate();

  const openNotification = (n: NotificationRow) => {
    if (!n.read) markRead(n.id);
    if (n.link) navigate(n.link);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" className="rounded-lg relative" aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}>
          <Bell size={16} />
          {unreadCount > 0 && (
            <Badge variant="destructive" className="absolute -top-1.5 -right-1.5 h-4 min-w-4 px-1 text-[10px] leading-4 justify-center rounded-full">
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
          <p className="text-sm font-semibold text-foreground">Notifications</p>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={markAllRead}>
              Mark all read
            </Button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {loading ? (
            <p className="text-xs text-muted-foreground text-center py-8">Loading…</p>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 px-4 text-center">
              <Inbox size={24} className="text-muted-foreground" />
              <p className="text-xs text-muted-foreground">You're all caught up — nothing here yet.</p>
            </div>
          ) : (
            notifications.map((n) => {
              const Icon = TYPE_ICONS[n.type] || Bell;
              return (
                <button
                  key={n.id}
                  onClick={() => openNotification(n)}
                  className={`w-full text-left flex items-start gap-2.5 px-3 py-2.5 border-b border-border last:border-0 hover:bg-accent transition-colors ${!n.read ? "bg-primary/5" : ""}`}
                >
                  <span className={`mt-0.5 shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${!n.read ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                    <Icon size={13} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm truncate ${!n.read ? "font-semibold text-foreground" : "text-foreground"}`}>{n.title}</p>
                    {n.body && <p className="text-xs text-muted-foreground truncate">{n.body}</p>}
                    <p className="text-[11px] text-muted-foreground mt-0.5">{formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}</p>
                  </div>
                  {!n.read && <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary shrink-0" aria-hidden="true" />}
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationBell;
