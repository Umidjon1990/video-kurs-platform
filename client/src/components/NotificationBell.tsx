import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Bell } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { uz } from "date-fns/locale";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Notification } from "@shared/schema";

interface NotificationBellProps {
  onNotificationAction?: (notification: Notification) => void;
}

export function NotificationBell({ onNotificationAction }: NotificationBellProps = {}) {
  const [open, setOpen] = useState(false);

  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
    refetchInterval: 30000,
  });

  const markAsReadMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest("PATCH", `/api/notifications/${id}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: () => apiRequest("PATCH", "/api/notifications/mark-all-read"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  
  const recentNotifications = notifications.slice(0, 5);
  const archivedNotifications = notifications.slice(5);

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      markAsReadMutation.mutate(notification.id);
    }
    
    if (onNotificationAction) {
      onNotificationAction(notification);
      setOpen(false);
    }
  };

  const renderNotification = (notification: Notification) => (
    <div
      key={notification.id}
      className={`p-4 cursor-pointer hover-elevate ${
        !notification.isRead ? "bg-accent/10" : ""
      }`}
      onClick={() => handleNotificationClick(notification)}
      data-testid={`notification-${notification.id}`}
    >
      <div className="flex items-start gap-2">
        <div className="flex-1">
          <p className="font-medium text-sm">
            {notification.title}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {notification.message}
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            {notification.createdAt && formatDistanceToNow(new Date(notification.createdAt), {
              addSuffix: true,
              locale: uz,
            })}
          </p>
        </div>
        {!notification.isRead && (
          <div className="w-2 h-2 bg-primary rounded-full mt-1" />
        )}
      </div>
    </div>
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          data-testid="button-notifications"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
              data-testid="badge-notification-count"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">Ogohlantirishlar</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => markAllAsReadMutation.mutate()}
              data-testid="button-mark-all-read"
            >
              Barchasini o'qilgan qilish
            </Button>
          )}
        </div>
        <ScrollArea className="h-[400px]">
          {notifications.length === 0 ? (
            <div
              className="p-8 text-center text-muted-foreground"
              data-testid="text-no-notifications"
            >
              Ogohlantirishlar yo'q
            </div>
          ) : (
            <>
              <div className="divide-y">
                {recentNotifications.map(renderNotification)}
              </div>
              
              {archivedNotifications.length > 0 && (
                <>
                  <div className="px-4 py-2 bg-muted/30 border-t border-b">
                    <p className="text-xs font-semibold text-muted-foreground">
                      Arxiv ({archivedNotifications.length})
                    </p>
                  </div>
                  <div className="divide-y">
                    {archivedNotifications.map(renderNotification)}
                  </div>
                </>
              )}
            </>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
