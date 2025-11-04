import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { X, AlertCircle, CheckCircle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  created_at: string;
}

interface NotificationBannerProps {
  userId: string;
}

export const NotificationBanner = ({ userId }: NotificationBannerProps) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    const fetchNotifications = async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .eq("read", false)
        .order("created_at", { ascending: false });

      if (data) {
        setNotifications(data);
      }
    };

    fetchNotifications();

    // Subscribe to real-time updates
    const channel = supabase
      .channel("notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          setNotifications((prev) => [payload.new as Notification, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const markAsRead = async (notificationId: string) => {
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("id", notificationId);

    setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "error":
        return <AlertCircle className="h-5 w-5" />;
      case "success":
        return <CheckCircle className="h-5 w-5" />;
      default:
        return <Info className="h-5 w-5" />;
    }
  };

  const getVariant = (type: string) => {
    switch (type) {
      case "error":
        return "destructive";
      default:
        return "default";
    }
  };

  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4 space-y-2">
      {notifications.map((notification) => (
        <Alert
          key={notification.id}
          variant={getVariant(notification.type)}
          className="shadow-lg animate-in slide-in-from-top"
        >
          {getIcon(notification.type)}
          <AlertTitle className="flex items-center justify-between">
            {notification.title}
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => markAsRead(notification.id)}
            >
              <X className="h-4 w-4" />
            </Button>
          </AlertTitle>
          <AlertDescription>{notification.message}</AlertDescription>
        </Alert>
      ))}
    </div>
  );
};
