import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, Check, AlertCircle, Calendar, Clock, RefreshCw, Send, BellOff, BellRing, Smartphone, CheckCircle2, XCircle, Info } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { toast } from "sonner";
import { usePushNotification } from "@/hooks/usePushNotification";
import { useAuth } from "@/_core/hooks/useAuth";

export default function Notifications() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const { data: notifications, refetch } = trpc.notifications.list.useQuery();
  const { state, isLoading, error, isSubscribed, subscribe, unsubscribe } = usePushNotification();
  
  const sendTestPush = trpc.pushNotifications.sendTest.useMutation({
    onSuccess: (data) => {
      if (data.sent > 0) {
        toast.success(`測試通知已發送，成功推送 ${data.sent} 個訂閱`);
      } else {
        toast.warning(`發送完成，但目前沒有已訂閱的設備。請先在此頁面開啟推送通知。`);
      }
    },
    onError: (err) => {
      toast.error(`發送失敗：${err.message}`);
    },
  });

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

  const handleSubscribe = async () => {
    const success = await subscribe();
    if (success) {
      toast.success("推送通知已開啟！您將收到行程變動和緊急調整的即時通知。");
    } else if (error) {
      toast.error(error);
    }
  };

  const handleUnsubscribe = async () => {
    const success = await unsubscribe();
    if (success) {
      toast.success("已取消推送通知訂閱");
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "reminder": return <Bell className="h-4 w-4" />;
      case "deadline": return <Clock className="h-4 w-4" />;
      case "departure": return <Calendar className="h-4 w-4" />;
      case "change": return <AlertCircle className="h-4 w-4" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case "reminder": return "bg-blue-100 text-blue-700 border-blue-300";
      case "deadline": return "bg-red-100 text-red-700 border-red-300";
      case "departure": return "bg-green-100 text-green-700 border-green-300";
      case "change": return "bg-yellow-100 text-yellow-700 border-yellow-300";
      default: return "bg-gray-100 text-gray-700 border-gray-300";
    }
  };

  const getNotificationTypeLabel = (type: string) => {
    switch (type) {
      case "reminder": return "提醒";
      case "deadline": return "截止日期";
      case "departure": return "出發通知";
      case "change": return "變更通知";
      default: return "通知";
    }
  };

  // 訂閱狀態顯示
  const renderSubscriptionStatus = () => {
    if (state === "unsupported") {
      return (
        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
          <XCircle className="h-5 w-5 text-muted-foreground shrink-0" />
          <div>
            <p className="text-sm font-medium">此瀏覽器不支持推送通知</p>
            <p className="text-xs text-muted-foreground">請使用 Chrome、Edge 或 Safari（iOS 16.4+）</p>
          </div>
        </div>
      );
    }

    if (state === "denied") {
      return (
        <div className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg">
          <BellOff className="h-5 w-5 text-red-500 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-700 dark:text-red-400">通知已被瀏覽器阻止</p>
            <p className="text-xs text-red-600 dark:text-red-500 mt-0.5">請在瀏覽器設置中允許此網站的通知，然後重新整理頁面</p>
          </div>
        </div>
      );
    }

    if (state === "subscribed") {
      return (
        <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg">
          <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-green-700 dark:text-green-400">推送通知已開啟</p>
            <p className="text-xs text-green-600 dark:text-green-500 mt-0.5">此設備將收到行程變動和緊急調整的即時通知</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleUnsubscribe}
            disabled={isLoading}
            className="text-xs text-muted-foreground shrink-0"
          >
            {isLoading ? "處理中..." : "取消訂閱"}
          </Button>
        </div>
      );
    }

    // default 或 granted 狀態
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-3 p-3 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 rounded-lg">
          <Smartphone className="h-5 w-5 text-indigo-500 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-indigo-700 dark:text-indigo-400">開啟此設備的推送通知</p>
            <p className="text-xs text-indigo-600 dark:text-indigo-500 mt-0.5">
              開啟後，行程變動、緊急調整等消息將即時推送到您的設備
            </p>
          </div>
          <Button
            size="sm"
            onClick={handleSubscribe}
            disabled={isLoading}
            className="bg-indigo-600 hover:bg-indigo-500 text-white shrink-0"
          >
            <BellRing className="h-4 w-4 mr-1.5" />
            {isLoading ? "訂閱中..." : "開啟通知"}
          </Button>
        </div>
        {error && (
          <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg">
            <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
            <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}
        <div className="flex items-start gap-2 p-3 bg-muted/30 rounded-lg">
          <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
          <div className="text-xs text-muted-foreground space-y-1">
            <p><strong>注意：</strong>如果您之前已安裝 PWA 到桌面，請先在此頁面點擊「開啟通知」重新訂閱，以確保推送正常工作。</p>
            <p>如果按鈕無反應，請嘗試：①在瀏覽器設置中清除此網站的通知權限，②重新整理頁面，③再次點擊「開啟通知」。</p>
          </div>
        </div>
      </div>
    );
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

      {/* 推送通知設置 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            推送通知設置
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {renderSubscriptionStatus()}

          {isAdmin && (
            <div className="pt-4 border-t">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">管理員：發送測試通知</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    向所有已訂閱的設備發送測試推送
                    {!isSubscribed && <span className="text-amber-500 ml-1">（請先在此設備開啟通知）</span>}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => sendTestPush.mutate({ title: 'HKEIU 測試通知', body: '推送通知功能正常運行 ✓' })}
                  disabled={sendTestPush.isPending}
                >
                  <Send className="h-4 w-4 mr-2" />
                  {sendTestPush.isPending ? '發送中...' : '發送測試'}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

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
                        className={`p-2 rounded-full ${getNotificationColor(notification.type)}`}
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
                        onClick={() => markAsRead.mutate({ id: notification.id })}
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
