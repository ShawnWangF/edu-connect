import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, Check, AlertCircle, Calendar, Clock, RefreshCw } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { toast } from "sonner";

export default function Notifications() {
  const { data: notifications, refetch } = trpc.notifications.list.useQuery();
  const markAsRead = trpc.notifications.markAsRead.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("已標記為已讀");
    },
    onError: () => {
      toast.error("操作失敗");
    },
  });

  const markAllAsRead = trpc.notifications.markAllAsRead.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("已將所有通知標記為已讀");
    },
    onError: () => {
      toast.error("操作失敗");
    },
  });

  const unreadCount = notifications?.filter((n) => !n.isRead).length || 0;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "reminder":
        return <Bell className="h-4 w-4" />;
      case "deadline":
        return <Clock className="h-4 w-4" />;
      case "departure":
        return <Calendar className="h-4 w-4" />;
      case "change":
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case "reminder":
        return "bg-blue-100 text-blue-700 border-blue-300";
      case "deadline":
        return "bg-red-100 text-red-700 border-red-300";
      case "departure":
        return "bg-green-100 text-green-700 border-green-300";
      case "change":
        return "bg-yellow-100 text-yellow-700 border-yellow-300";
      default:
        return "bg-gray-100 text-gray-700 border-gray-300";
    }
  };

  const getNotificationTypeLabel = (type: string) => {
    switch (type) {
      case "reminder":
        return "提醒";
      case "deadline":
        return "截止日期";
      case "departure":
        return "出發通知";
      case "change":
        return "變更通知";
      default:
        return "通知";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">通知中心</h1>
          <p className="text-muted-foreground mt-1">
            查看系統通知和重要提醒
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unreadCount} 條未讀
              </Badge>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          {unreadCount > 0 && (
            <Button 
              variant="outline" 
              onClick={() => markAllAsRead.mutate()}
              disabled={markAllAsRead.isPending}
            >
              <Check className="h-4 w-4 mr-2" />
              全部已讀
            </Button>
          )}
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            刷新
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            所有通知
          </CardTitle>
        </CardHeader>
        <CardContent>
          {notifications && notifications.length > 0 ? (
            <div className="space-y-3">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 border rounded-lg transition-colors ${
                    notification.isRead ? "bg-muted/30" : "bg-background"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <div
                        className={`p-2 rounded-full ${getNotificationColor(
                          notification.type
                        )}`}
                      >
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium">{notification.title}</h3>
                          <Badge variant="outline" className="text-xs">
                            {getNotificationTypeLabel(notification.type)}
                          </Badge>
                          {!notification.isRead && (
                            <Badge variant="destructive" className="text-xs">
                              未讀
                            </Badge>
                          )}
                        </div>
                        {notification.content && (
                          <p className="text-sm text-muted-foreground mb-2">
                            {notification.content}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {format(
                            new Date(notification.createdAt),
                            "yyyy年MM月dd日 HH:mm",
                            { locale: zhCN }
                          )}
                        </p>
                      </div>
                    </div>
                    {!notification.isRead && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          markAsRead.mutate({ id: notification.id })
                        }
                      >
                        <Check className="h-4 w-4 mr-1" />
                        標記已讀
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">暫無通知</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
