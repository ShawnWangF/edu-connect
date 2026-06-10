import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { CalendarDays, Clock, MapPin, Navigation, Phone, RefreshCw, ShieldCheck, Users } from "lucide-react";
import { toast } from "sonner";

const roleLabel: Record<string, string> = {
  coordinator: "負責人",
  staff: "工作人員",
  guide: "導遊",
  driver: "司機",
  security: "安全員",
  other: "自定義",
};

function displayRole(role: string, customRole?: string | null) {
  return role === "other" ? customRole || "自定義" : roleLabel[role] || role;
}

function formatLocationTime(value?: string | Date | null) {
  if (!value) return "尚未上報";
  return new Date(value).toLocaleString("zh-HK", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function MyTasks() {
  const [watchId, setWatchId] = useState<number | null>(null);
  const utils = trpc.useUtils();
  const { data, isLoading, refetch } = trpc.staff.myAssignments.useQuery(undefined, {
    refetchInterval: 60000,
  });
  const setSharing = trpc.staff.setLocationSharing.useMutation({
    onSuccess: () => utils.staff.myAssignments.invalidate(),
    onError: (error) => toast.error(error.message),
  });
  const reportLocation = trpc.staff.reportLocation.useMutation({
    onSuccess: () => utils.staff.myAssignments.invalidate(),
    onError: (error) => toast.error(error.message),
  });

  const profile = data?.profile;
  const assignments = data?.assignments || [];

  const groupedAssignments = useMemo(() => {
    return assignments.reduce((acc: Record<string, any[]>, item: any) => {
      const key = item.date || "未定日期";
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    }, {});
  }, [assignments]);

  const reportCurrentPosition = () => {
    if (!navigator.geolocation) {
      toast.error("此設備或瀏覽器不支持定位");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        reportLocation.mutate({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
        toast.success("位置已上報");
      },
      (error) => {
        toast.error(error.message || "無法取得位置，請檢查定位權限");
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 }
    );
  };

  const enableSharing = (enabled: boolean) => {
    if (!profile) return;
    if (!enabled) {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
        setWatchId(null);
      }
      setSharing.mutate({ enabled: false });
      toast.info("位置共享已關閉");
      return;
    }
    if (!navigator.geolocation) {
      toast.error("此設備或瀏覽器不支持定位");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setSharing.mutate({ enabled: true });
        reportLocation.mutate({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
        const id = navigator.geolocation.watchPosition(
          (nextPosition) => {
            reportLocation.mutate({
              latitude: nextPosition.coords.latitude,
              longitude: nextPosition.coords.longitude,
              accuracy: nextPosition.coords.accuracy,
            });
          },
          () => undefined,
          { enableHighAccuracy: true, maximumAge: 30000, timeout: 15000 }
        );
        setWatchId(id);
        toast.success("位置共享已開啟");
      },
      (error) => {
        toast.error(error.message || "定位授權失敗");
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 }
    );
  };

  if (isLoading) {
    return <div className="p-6 text-sm text-muted-foreground">正在載入任務...</div>;
  }

  if (!profile) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-14 text-center text-muted-foreground">
            <ShieldCheck className="mx-auto mb-3 h-10 w-10 opacity-40" />
            <p className="font-medium text-foreground">此帳號尚未綁定工作人員檔案</p>
            <p className="mt-1 text-sm">請由管理員在「工作人員管理」中把你的登入帳號綁定到人員檔案。</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-5 space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">我的任務</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {profile.name} · {displayRole(profile.role, profile.customRole)}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          刷新
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Navigation className="h-4 w-4 text-blue-500" />
            位置共享
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border bg-slate-50 px-4 py-3">
            <div>
              <Label htmlFor="sharing">允許指揮中心查看我的實時位置</Label>
              <p className="text-xs text-muted-foreground mt-1">
                開啟後會使用手機/瀏覽器定位授權；關閉後不再更新位置。
              </p>
            </div>
            <Switch
              id="sharing"
              checked={Boolean(profile.locationSharingEnabled)}
              onCheckedChange={enableSharing}
              disabled={setSharing.isPending}
            />
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span>最近上報：{formatLocationTime(profile.lastLocationAt)}</span>
            {profile.lastLocationAccuracy && <span>精度約 {profile.lastLocationAccuracy} 米</span>}
          </div>
          <Button onClick={reportCurrentPosition} disabled={!profile.locationSharingEnabled || reportLocation.isPending}>
            <MapPin className="mr-2 h-4 w-4" />
            立即上報当前位置
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {Object.keys(groupedAssignments).length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <CalendarDays className="mx-auto mb-3 h-10 w-10 opacity-40" />
              <p className="text-sm">暫無指派任務</p>
            </CardContent>
          </Card>
        ) : (
          Object.entries(groupedAssignments).map(([date, items]) => (
            <Card key={date}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-slate-500" />
                  {date}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(items as any[]).map((item) => (
                  <div key={item.id} className="rounded-lg border p-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">{item.groupCode} · {item.groupName}</span>
                          <Badge variant="outline">{displayRole(item.role, item.customRole)}</Badge>
                        </div>
                        <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                          <p className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {item.startTime || "全天"}{item.endTime ? ` - ${item.endTime}` : ""}
                          </p>
                          <p className="flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5" />
                            {item.taskName || item.itineraryLocationName || "團組指派"}
                          </p>
                          {item.headcount ? (
                            <p className="flex items-center gap-1">
                              <Users className="h-3.5 w-3.5" />
                              {item.headcount} 人
                            </p>
                          ) : null}
                          {(item.groupContact || item.groupPhone) && (
                            <p className="flex items-center gap-1">
                              <Phone className="h-3.5 w-3.5" />
                              {item.groupContact || "團組聯絡人"} {item.groupPhone && `· ${item.groupPhone}`}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    {item.notes && <p className="mt-2 text-xs text-muted-foreground">備註：{item.notes}</p>}
                  </div>
                ))}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
