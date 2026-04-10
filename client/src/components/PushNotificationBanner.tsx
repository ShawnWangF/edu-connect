import { Bell, BellOff, X } from "lucide-react";
import { useState } from "react";
import { usePushNotification } from "@/hooks/usePushNotification";
import { Button } from "@/components/ui/button";

export function PushNotificationBanner() {
  const { state, isLoading, isSupported, subscribe } = usePushNotification();
  const [dismissed, setDismissed] = useState(() => {
    return localStorage.getItem("push-banner-dismissed") === "true";
  });

  // 不支持推送、已订阅、已拒绝、或用户已关闭横幅时不显示
  if (!isSupported || state === "subscribed" || state === "denied" || dismissed) {
    return null;
  }

  const handleDismiss = () => {
    localStorage.setItem("push-banner-dismissed", "true");
    setDismissed(true);
  };

  const handleSubscribe = async () => {
    const success = await subscribe();
    if (success) {
      // 订阅成功后横幅自动消失（state 变为 subscribed）
    }
  };

  return (
    <div className="flex items-center gap-3 bg-indigo-950/80 border border-indigo-700/50 rounded-lg px-4 py-3 mb-4 backdrop-blur-sm">
      <Bell className="h-5 w-5 text-indigo-400 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-indigo-100">
          開啟推送通知
        </p>
        <p className="text-xs text-indigo-300 mt-0.5">
          行程變動、緊急調整等消息將即時推送到您的設備
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Button
          size="sm"
          onClick={handleSubscribe}
          disabled={isLoading}
          className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs h-8"
        >
          {isLoading ? "處理中..." : "允許通知"}
        </Button>
        <button
          onClick={handleDismiss}
          className="text-indigo-400 hover:text-indigo-200 transition-colors"
          aria-label="關閉"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// 通知设置按钮（用于侧边栏或设置页面）
export function PushNotificationToggle() {
  const { state, isLoading, isSupported, subscribe, unsubscribe } = usePushNotification();

  if (!isSupported) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <BellOff className="h-4 w-4" />
        <span>此瀏覽器不支持推送通知</span>
      </div>
    );
  }

  if (state === "denied") {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <BellOff className="h-4 w-4" />
        <span>通知已被瀏覽器阻止，請在瀏覽器設置中允許</span>
      </div>
    );
  }

  if (state === "subscribed") {
    return (
      <div className="flex items-center gap-2">
        <Bell className="h-4 w-4 text-green-500" />
        <span className="text-sm text-green-600 dark:text-green-400">推送通知已開啟</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={unsubscribe}
          disabled={isLoading}
          className="text-xs text-muted-foreground h-7"
        >
          {isLoading ? "處理中..." : "取消訂閱"}
        </Button>
      </div>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={subscribe}
      disabled={isLoading}
      className="flex items-center gap-2"
    >
      <Bell className="h-4 w-4" />
      {isLoading ? "處理中..." : "開啟推送通知"}
    </Button>
  );
}
