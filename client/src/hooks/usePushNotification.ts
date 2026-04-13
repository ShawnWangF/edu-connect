import { trpc } from "@/lib/trpc";
import { useCallback, useEffect, useState } from "react";

// VAPID 公钥（从环境变量读取）
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string;

// 将 base64 URL 编码转换为 Uint8Array
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length) as Uint8Array<ArrayBuffer>;
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

type PushState = "unsupported" | "default" | "granted" | "denied" | "subscribed";

export function usePushNotification() {
  const [state, setState] = useState<PushState>("default");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  const subscribeMutation = trpc.pushNotifications.subscribe.useMutation();
  const unsubscribeMutation = trpc.pushNotifications.unsubscribe.useMutation();

  // 检查浏览器支持和当前权限状态
  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setState("unsupported");
      return;
    }

    const checkState = async () => {
      try {
        // 注册 Service Worker（强制更新检查）
        const reg = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
          updateViaCache: "none", // 强制每次检查更新
        });
        
        // 触发 SW 更新检查
        reg.update().catch(() => {/* 忽略更新检查错误 */});
        
        setRegistration(reg);

        // 检查当前权限
        const permission = Notification.permission;
        if (permission === "denied") {
          setState("denied");
          return;
        }

        // 检查是否已有订阅
        const existingSub = await reg.pushManager.getSubscription();
        if (existingSub) {
          setState("subscribed");
        } else if (permission === "granted") {
          setState("granted");
        } else {
          setState("default");
        }
      } catch (err) {
        console.error("[PWA] Service Worker registration failed:", err);
        setState("unsupported");
      }
    };

    checkState();
  }, []);

  // 请求通知权限并订阅推送
  const subscribe = useCallback(async () => {
    setError(null);
    
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setError("此瀏覽器不支持推送通知");
      return false;
    }
    
    if (!VAPID_PUBLIC_KEY) {
      setError("推送通知配置錯誤（缺少 VAPID 公鑰）");
      console.error("[PWA] VAPID_PUBLIC_KEY is not set");
      return false;
    }
    
    setIsLoading(true);

    try {
      // 确保 Service Worker 已注册
      let reg = registration;
      if (!reg) {
        reg = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
          updateViaCache: "none",
        });
        setRegistration(reg);
      }

      // 等待 Service Worker 激活
      await navigator.serviceWorker.ready;

      // 请求通知权限
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState("denied");
        setError("通知權限被拒絕，請在瀏覽器設置中允許通知");
        return false;
      }

      // 先取消旧订阅（避免 VAPID 密钥不匹配问题）
      const existingSub = await reg.pushManager.getSubscription();
      if (existingSub) {
        await existingSub.unsubscribe();
      }

      // 重新订阅推送
      let subscription: PushSubscription;
      try {
        subscription = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
      } catch (subErr: any) {
        console.error("[PWA] pushManager.subscribe failed:", subErr);
        setError(`訂閱失敗：${subErr?.message || "未知錯誤"}。請確保使用 HTTPS 訪問網站。`);
        return false;
      }

      const subJson = subscription.toJSON();
      const keys = subJson.keys as { p256dh: string; auth: string };

      if (!keys?.p256dh || !keys?.auth) {
        setError("訂閱密鑰獲取失敗，請重試");
        return false;
      }

      // 发送到后端保存
      try {
        await subscribeMutation.mutateAsync({
          endpoint: subscription.endpoint,
          p256dh: keys.p256dh,
          auth: keys.auth,
          userAgent: navigator.userAgent,
        });
      } catch (apiErr: any) {
        console.error("[PWA] Failed to save subscription to server:", apiErr);
        setError(`訂閱保存失敗：${apiErr?.message || "服務器錯誤"}，請重試`);
        return false;
      }

      setState("subscribed");
      setError(null);
      return true;
    } catch (err: any) {
      console.error("[PWA] Subscribe failed:", err);
      setError(`訂閱失敗：${err?.message || "未知錯誤"}`);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [registration, subscribeMutation]);

  // 取消订阅
  const unsubscribe = useCallback(async () => {
    setError(null);
    if (!registration) return false;
    setIsLoading(true);

    try {
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await unsubscribeMutation.mutateAsync({ endpoint: subscription.endpoint });
        await subscription.unsubscribe();
      }
      setState("granted");
      return true;
    } catch (err: any) {
      console.error("[PWA] Unsubscribe failed:", err);
      setError(`取消訂閱失敗：${err?.message || "未知錯誤"}`);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [registration, unsubscribeMutation]);

  return {
    state,
    isLoading,
    error,
    isSupported: state !== "unsupported",
    isSubscribed: state === "subscribed",
    subscribe,
    unsubscribe,
  };
}
