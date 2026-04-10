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
        // 注册 Service Worker
        const reg = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
        });
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
      }
    };

    checkState();
  }, []);

  // 请求通知权限并订阅推送
  const subscribe = useCallback(async () => {
    if (!registration || !VAPID_PUBLIC_KEY) return false;
    setIsLoading(true);

    try {
      // 请求通知权限
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState("denied");
        return false;
      }

      // 订阅推送
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      const subJson = subscription.toJSON();
      const keys = subJson.keys as { p256dh: string; auth: string };

      // 发送到后端保存
      await subscribeMutation.mutateAsync({
        endpoint: subscription.endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        userAgent: navigator.userAgent,
      });

      setState("subscribed");
      return true;
    } catch (err) {
      console.error("[PWA] Subscribe failed:", err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [registration, subscribeMutation]);

  // 取消订阅
  const unsubscribe = useCallback(async () => {
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
    } catch (err) {
      console.error("[PWA] Unsubscribe failed:", err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [registration, unsubscribeMutation]);

  return {
    state,
    isLoading,
    isSupported: state !== "unsupported",
    isSubscribed: state === "subscribed",
    subscribe,
    unsubscribe,
  };
}
