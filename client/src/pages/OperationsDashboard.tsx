import { useEffect, useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { MapView } from "@/components/Map";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Users, MapPin, Clock, AlertTriangle, CheckCircle2, Circle,
  Utensils, Plane, Building2, UserCheck, UserX, Activity,
  TrendingUp, Navigation, CalendarClock, ChevronRight, RefreshCw,
  Hotel, Bus, Star, Zap, Bell, BellRing, Edit3, Info, LocateFixed, Send
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

// ===== 辅助函数 =====
const roleLabel: Record<string, string> = {
  coordinator: "負責人", staff: "工作人員", guide: "導遊", driver: "司機", security: "安全員", other: "自定義",
};
const roleColor: Record<string, string> = {
  coordinator: "bg-purple-100 text-purple-800",
  staff: "bg-blue-100 text-blue-800",
  guide: "bg-green-100 text-green-800",
  driver: "bg-orange-100 text-orange-800",
  security: "bg-red-100 text-red-800",
  other: "bg-slate-100 text-slate-800",
};

function roleName(role: string, customRole?: string | null) {
  return role === 'other' ? customRole || '自定義' : roleLabel[role] || role;
}
const statusConfig = {
  in_progress: { label: "進行中", color: "bg-emerald-500", textColor: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" },
  upcoming: { label: "即將開始", color: "bg-blue-400", textColor: "text-blue-700", bg: "bg-blue-50 border-blue-200" },
  completed: { label: "已完成", color: "bg-gray-400", textColor: "text-gray-500", bg: "bg-gray-50 border-gray-200" },
};

function formatTime(t: string | null | undefined) {
  if (!t) return "--";
  return t.slice(0, 5);
}

function hoursLabel(h: number) {
  if (h <= 0) return "現在";
  if (h < 1) return `${Math.round(h * 60)} 分鐘後`;
  return `${h.toFixed(1)} 小時後`;
}

// ===== 顶部状态栏 =====
function StatusBar({ currentTime, today, totalGroups, activeGroups }: {
  currentTime: string; today: string; totalGroups: number; activeGroups: number;
}) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, []);
  const now = new Date();
  const timeStr = now.toLocaleTimeString("zh-HK", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const dateStr = now.toLocaleDateString("zh-HK", { year: "numeric", month: "long", day: "numeric", weekday: "long" });

  return (
    <div className="flex items-center justify-between px-6 py-3 bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-xl mb-6 shadow-lg">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-sm font-medium text-slate-300">實時監控</span>
        </div>
        <div className="h-4 w-px bg-slate-600" />
        <span className="text-sm text-slate-300">{dateStr}</span>
      </div>
      <div className="text-2xl font-mono font-bold tracking-widest text-emerald-400">{timeStr}</div>
      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-1.5">
          <Activity className="w-4 h-4 text-emerald-400" />
          <span className="text-slate-300">活躍團組</span>
          <span className="font-bold text-white">{activeGroups}/{totalGroups}</span>
        </div>
      </div>
    </div>
  );
}

// ===== 团组行程进度卡片 =====
function GroupProgressCard({ itin }: { itin: any }) {
  const cfg = statusConfig[itin.status as keyof typeof statusConfig] || statusConfig.upcoming;
  const headcount = (itin.studentCount || 0) + (itin.teacherCount || 0);

  return (
    <div className={`border rounded-lg p-4 ${cfg.bg} transition-all hover:shadow-md`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${cfg.color} ${itin.status === 'in_progress' ? 'animate-pulse' : ''}`} />
          <span className="font-semibold text-sm">{itin.groupCode}</span>
          <span className="text-xs text-muted-foreground truncate max-w-[120px]">{itin.groupName?.replace(/組$/, '')}</span>
        </div>
        <Badge variant="outline" className={`text-xs ${cfg.textColor} border-current`}>
          {cfg.label}
        </Badge>
      </div>

      <div className="mb-2">
        <p className="text-sm font-medium leading-tight">{itin.description}</p>
        {itin.locationName && (
          <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
            <MapPin className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{itin.locationName}</span>
          </div>
        )}
      </div>

      {itin.startTime && itin.endTime && (
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatTime(itin.startTime)} – {formatTime(itin.endTime)}
            </span>
            {itin.status === 'in_progress' && (
              <span className={`font-semibold ${cfg.textColor}`}>{itin.progressPercent}%</span>
            )}
          </div>
          <Progress
            value={itin.progressPercent}
            className="h-1.5"
          />
        </div>
      )}

      {headcount > 0 && (
        <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
          <Users className="w-3 h-3" />
          <span>{headcount} 人</span>
          {itin.batchCode && <span className="ml-1 text-slate-400">· {itin.batchCode}</span>}
        </div>
      )}
    </div>
  );
}

// ===== 工作人员状态卡片 =====
function StaffStatusCard({ staff }: { staff: any }) {
  const isBusy = staff.status === 'busy';
  const isScheduled = staff.status === 'scheduled';

  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg border transition-all ${
      isBusy ? 'bg-emerald-50 border-emerald-200' :
      isScheduled ? 'bg-blue-50 border-blue-200' :
      'bg-gray-50 border-gray-200'
    }`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
        isBusy ? 'bg-emerald-500 text-white' :
        isScheduled ? 'bg-blue-500 text-white' :
        'bg-gray-300 text-gray-600'
      }`}>
        {staff.name.slice(0, 1)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="font-medium text-sm">{staff.name}</span>
          <Badge variant="outline" className={`text-xs px-1 py-0 ${roleColor[staff.role]} border-0`}>
            {roleName(staff.role, staff.customRole)}
          </Badge>
        </div>
        {isBusy && staff.currentAssignment ? (
          <div className="text-xs text-emerald-700">
            <span className="font-medium">{staff.currentAssignment.groupCode}</span>
            {staff.currentAssignment.taskName && ` · ${staff.currentAssignment.taskName}`}
            <span className="text-emerald-600 ml-1">
              {formatTime(staff.currentAssignment.startTime)}–{formatTime(staff.currentAssignment.endTime)}
            </span>
          </div>
        ) : isScheduled && staff.nextAssignment ? (
          <div className="text-xs text-blue-600">
            下一任務：{staff.nextAssignment.groupCode}
            {staff.nextAssignment.taskName && ` · ${staff.nextAssignment.taskName}`}
            <span className="ml-1">{formatTime(staff.nextAssignment.startTime)}</span>
          </div>
        ) : (
          <div className="text-xs text-gray-500">空閒可指派</div>
        )}
      </div>
      <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
        isBusy ? 'bg-emerald-500 animate-pulse' :
        isScheduled ? 'bg-blue-400' :
        'bg-gray-300'
      }`} />
    </div>
  );
}

function StaffLocationMap({
  data,
  itineraryMap,
  onRemind,
  onSyncPlaces,
  syncPending,
}: {
  data: any;
  itineraryMap: any;
  onRemind: (staffId: number) => void;
  onSyncPlaces: () => void;
  syncPending: boolean;
}) {
  const located = data?.located || [];
  const missing = data?.missing || [];
  const itineraryPoints = (itineraryMap?.points || []).map((point: any) => ({ ...point, color: "#ff1744" }));
  const missingPlaces = itineraryMap?.missing || [];
  const center = located[0]?.latitude && located[0]?.longitude
    ? { lat: located[0].latitude, lng: located[0].longitude }
    : itineraryPoints[0]?.lat && itineraryPoints[0]?.lng
      ? { lat: itineraryPoints[0].lat, lng: itineraryPoints[0].lng }
    : { lat: 22.3193, lng: 114.1694 };
  const staffPoints = located
    .filter((item: any) => item.latitude && item.longitude)
    .map((item: any) => ({
      id: `staff-${item.staffId}`,
      lat: item.latitude,
      lng: item.longitude,
      color: "#ff1744",
      label: item.staffName,
      subtitle: `${roleName(item.role, item.customRole)} · ${item.groupCode || ""} ${item.groupName || ""}`.trim(),
      meta: `${item.taskName || "團組指派"} · 最近 ${item.lastLocationAt ? new Date(item.lastLocationAt).toLocaleString("zh-HK") : "未記錄"}`,
    }));
  const mapPoints = [...itineraryPoints, ...staffPoints];

  return (
    <Card className="bg-white border-0 shadow-sm">
      <CardHeader className="pb-3 pt-4 px-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <LocateFixed className="w-4 h-4 text-blue-500" />
            團組位置追蹤地圖
          </CardTitle>
          <div className="flex gap-3 text-xs text-muted-foreground">
            <span>{located.length} 人已上報位置</span>
            <span>{missing.length} 人待開啟/待上報</span>
            <span>{itineraryPoints.length} 個行程點</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-5 pb-5 space-y-4">
        <MapView
          className="h-[420px] rounded-lg border overflow-hidden"
          initialCenter={center}
          initialZoom={12}
          points={mapPoints}
        />
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-[#ff1744] shadow-[0_0_10px_rgba(255,23,68,.75)]" />
            行程點 / 工作人員位置
          </span>
          <Button variant="outline" size="sm" className="ml-auto h-7" onClick={onSyncPlaces} disabled={syncPending}>
            {syncPending ? "同步中..." : "同步地點坐標"}
          </Button>
        </div>
        {located.length === 0 && itineraryPoints.length === 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            目前沒有可顯示坐標。可先同步地點坐標，或提醒已指派工作人員開啟位置共享。
          </div>
        )}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {located.slice(0, 6).map((item: any) => (
            <div key={`loc-${item.staffId}`} className="rounded-lg border bg-blue-50/50 p-3 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{item.staffName}</span>
                <Badge variant="outline">{roleName(item.role, item.customRole)}</Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{item.groupCode} · {item.groupName}</p>
              <p className="mt-1 text-xs text-muted-foreground">{item.taskName || "團組指派"}</p>
              <p className="mt-1 text-xs text-blue-700">
                最近：{item.lastLocationAt ? new Date(item.lastLocationAt).toLocaleString("zh-HK") : "未記錄"}
                {item.lastLocationAccuracy ? ` · 約 ${item.lastLocationAccuracy} 米` : ""}
              </p>
            </div>
          ))}
        </div>
        {missing.length > 0 && (
          <div className="rounded-lg border">
            <div className="border-b bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">
              未顯示位置的已指派工作人員
            </div>
            <div className="divide-y">
              {missing.slice(0, 8).map((item: any) => (
                <div key={`missing-${item.staffId}`} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                  <div className="min-w-0">
                    <div className="text-sm font-medium">{item.staffName} <span className="text-xs text-muted-foreground">· {roleName(item.role, item.customRole)}</span></div>
                    <div className="text-xs text-muted-foreground truncate">{item.groupCode} · {item.groupName} · {item.taskName || "團組指派"}</div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => onRemind(item.staffId)}>
                    <Send className="mr-1.5 h-3.5 w-3.5" />
                    提醒開啟
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
        {missingPlaces.length > 0 && (
          <div className="rounded-lg border">
            <div className="border-b bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">
              尚未定位的常見行程點
            </div>
            <div className="flex flex-wrap gap-2 p-3">
              {missingPlaces.slice(0, 12).map((item: any) => (
                <Badge key={item.name} variant="outline" className="bg-white">
                  {item.name} · {item.count}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ===== 景点人流预警 =====
function VenueAlertCard({ venue }: { venue: any }) {
  const pct = venue.maxCapacity > 0 ? Math.round((venue.currentPax / venue.maxCapacity) * 100) : 0;
  const alertConfig = {
    critical: { icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50 border-red-300", label: "超負荷預警", barColor: "bg-red-500" },
    warning: { icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-50 border-amber-300", label: "即將滿員", barColor: "bg-amber-500" },
    healthy: { icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200", label: "容量健康", barColor: "bg-emerald-500" },
  };
  const cfg = alertConfig[venue.alertLevel as keyof typeof alertConfig] || alertConfig.healthy;
  const Icon = cfg.icon;

  return (
    <div className={`border rounded-lg p-4 ${cfg.bg}`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-slate-600" />
          <span className="font-semibold text-sm">{venue.name}</span>
        </div>
        <div className={`flex items-center gap-1 text-xs font-medium ${cfg.color}`}>
          <Icon className="w-3.5 h-3.5" />
          {cfg.label}
        </div>
      </div>

      <div className="mb-2">
        <div className="flex justify-between text-xs text-muted-foreground mb-1">
          <span>當前人數：<strong>{venue.currentPax}</strong> 人</span>
          <span>上限：{venue.maxCapacity} 人</span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${cfg.barColor}`}
            style={{ width: `${Math.min(pct, 100)}%` }}
          />
        </div>
        <div className="text-right text-xs text-muted-foreground mt-0.5">{pct}%</div>
      </div>

      {venue.currentGroups.length > 0 && (
        <div className="text-xs text-slate-600 mb-1">
          <span className="font-medium">在場：</span>
          {venue.currentGroups.map((g: any) => (
            <span key={g.groupId} className="ml-1 bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded">
              {g.groupCode}（{g.headcount}人）
            </span>
          ))}
        </div>
      )}

      {venue.upcomingGroups.length > 0 && (
        <div className="text-xs text-slate-600">
          <span className="font-medium">即將抵達：</span>
          {venue.upcomingGroups.map((g: any) => (
            <span key={`${g.groupId}-${g.startTime}`} className="ml-1 bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
              {g.groupCode} {hoursLabel(g.hoursUntil)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ===== 餐饮预备卡片 =====
function DiningCard({ booking }: { booking: any }) {
  const urgencyConfig = {
    now: { color: "text-red-600", bg: "bg-red-50 border-red-300", label: "立即準備！", icon: "🔴" },
    soon: { color: "text-amber-600", bg: "bg-amber-50 border-amber-300", label: "緊急準備", icon: "🟡" },
    later: { color: "text-blue-600", bg: "bg-blue-50 border-blue-200", label: "今日預訂", icon: "🔵" },
    tomorrow: { color: "text-gray-600", bg: "bg-gray-50 border-gray-200", label: "明日預訂", icon: "⚪" },
  };
  const cfg = urgencyConfig[booking.urgency as keyof typeof urgencyConfig] || urgencyConfig.later;

  return (
    <div className={`border rounded-lg p-3 ${cfg.bg}`}>
      <div className="flex items-start justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <span className="text-base">{cfg.icon}</span>
          <span className="font-semibold text-sm">{booking.restaurantName}</span>
        </div>
        <span className={`text-xs font-medium ${cfg.color}`}>{cfg.label}</span>
      </div>
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Users className="w-3 h-3" />
          {booking.groupCode || "—"} · {booking.bookingPax} 人
        </span>
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {booking.bookingDate} {formatTime(booking.bookingTime)}
        </span>
      </div>
      {booking.hoursUntil > 0 && booking.urgency !== 'tomorrow' && (
        <div className={`text-xs mt-1 font-medium ${cfg.color}`}>
          距抵達還有 {hoursLabel(booking.hoursUntil)}，請提前備餐
        </div>
      )}
    </div>
  );
}

// ===== 紧急调整快捷窗口 =====
function EmergencyCommandButton({
  commandScope,
  staffLocations,
  onRemindLocation,
}: {
  commandScope: any;
  staffLocations: any;
  onRemindLocation: (staffId: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [activeCommand, setActiveCommand] = useState<'notice' | 'adjust' | 'location'>('notice');
  const [selectedItinId, setSelectedItinId] = useState<string>("");
  const [form, setForm] = useState({
    scopeType: "batch" as "single" | "group" | "batch",
    groupIds: [] as string[],
    batchCode: "",
    matchText: "",
    date: "",
    locationName: "", description: "", startTime: "", endTime: "",
    notes: "", reason: "", notifyAll: true
  });
  const [noticeForm, setNoticeForm] = useState({
    title: "",
    content: "",
    relatedGroupId: "all",
  });
  const [impactPreview, setImpactPreview] = useState<any>(null);
  const utils = trpc.useUtils();
  const { data: recentAdj = [] } = trpc.dashboard.recentAdjustments.useQuery(undefined, { refetchInterval: 30000 });
  const allItins = commandScope?.itineraries || [];
  const groupOptions = useMemo(() => {
    return (commandScope?.groups || []).map((group: any) => ({
      id: group.id,
      label: `${group.code || ''} ${group.name || ''}`.trim() || `團組 #${group.id}`,
    }));
  }, [commandScope]);
  const batchOptions = useMemo(() => {
    return (commandScope?.batches || []).map((batch: any) => batch.code).filter(Boolean);
  }, [commandScope]);
  const itineraryNameOptions = useMemo(() => {
    const set = new Set<string>();
    allItins.forEach((itin: any) => {
      const label = (itin.locationName || itin.description || "").trim();
      if (label) set.add(label);
    });
    return Array.from(set).sort();
  }, [allItins]);
  const broadcastMutation = trpc.dashboard.emergencyBroadcast.useMutation({
    onSuccess: (data) => {
      toast.success("緊急通知已發布", {
        description: `已寫入 ${data.recipients} 位用戶通知中心${data.pushed ? `，推送 ${data.pushed} 個端點` : ""}`,
      });
      utils.notifications.list.invalidate();
      setNoticeForm({ title: "", content: "", relatedGroupId: "all" });
      setOpen(false);
    },
    onError: (e) => toast.error("發布失敗", { description: e.message }),
  });
  const previewMutation = trpc.dashboard.previewUrgentAdjust.useMutation({
    onSuccess: (data) => setImpactPreview(data),
    onError: (e) => {
      setImpactPreview(null);
      toast.error("預檢失敗", { description: e.message });
    },
  });
  const adjustMutation = trpc.dashboard.urgentAdjust.useMutation({
    onSuccess: (data) => {
      toast.success("調整已提交", {
        description: `${data.groupName} ${data.date} 已更新 ${data.affectedGroups || 1} 個團組、${data.affectedItineraries || 1} 個行程點${form.notifyAll ? "，已通知全員" : ""}`,
      });
      utils.dashboard.recentAdjustments.invalidate();
      utils.dashboard.overview.invalidate();
      utils.dashboard.commandScope.invalidate();
      utils.dashboard.staffStatus.invalidate();
      utils.dashboard.staffLocations.invalidate();
      utils.batchStaff.invalidate();
      setOpen(false);
      setForm({ scopeType: "batch", groupIds: [], batchCode: "", matchText: "", date: "", locationName: "", description: "", startTime: "", endTime: "", notes: "", reason: "", notifyAll: true });
      setSelectedItinId("");
      setImpactPreview(null);
    },
    onError: (e) => toast.error("提交失敗", { description: e.message }),
  });
  const selectedItin = useMemo(
    () => allItins.find((i: any) => String(i.itinId) === selectedItinId),
    [allItins, selectedItinId]
  );
  useEffect(() => {
    setImpactPreview(null);
  }, [form.scopeType, form.groupIds, form.batchCode, form.matchText, form.date, form.locationName, form.description, form.startTime, form.endTime, form.notes, selectedItinId]);
  const buildAdjustPayload = () => ({
    itineraryId: selectedItinId ? Number(selectedItinId) : undefined,
    scopeType: form.scopeType,
    groupIds: form.groupIds.map(Number),
    batchCode: form.batchCode || undefined,
    matchText: form.matchText || undefined,
    date: form.date || undefined,
    locationName: form.locationName || undefined,
    description: form.description || undefined,
    startTime: form.startTime || undefined,
    endTime: form.endTime || undefined,
    notes: form.notes || undefined,
  });
  const validateAdjustForm = () => {
    if (form.scopeType === "single" && !selectedItinId) {
      toast.error("請選擇單個行程點");
      return false;
    }
    if (form.scopeType === "group" && (form.groupIds.length === 0 || !form.matchText.trim())) {
      toast.error("請選擇團組並指定原行程點");
      return false;
    }
    if (form.scopeType === "batch" && (!form.batchCode || !form.matchText.trim())) {
      toast.error("請選擇批次並指定原行程點");
      return false;
    }
    if (!form.locationName.trim() && !form.description.trim() && !form.startTime && !form.endTime && !form.notes.trim()) {
      toast.error("請至少填寫一項要調整的內容");
      return false;
    }
    return true;
  };
  const handlePreview = () => {
    if (!validateAdjustForm()) return;
    previewMutation.mutate(buildAdjustPayload());
  };
  const handleSubmit = () => {
    if (!form.reason.trim()) {
      toast.error("請填寫調整原因");
      return;
    }
    if (!validateAdjustForm()) return;
    adjustMutation.mutate({
      ...buildAdjustPayload(),
      reason: form.reason,
      notifyAll: form.notifyAll,
    });
  };
  const handleBroadcast = () => {
    if (!noticeForm.title.trim() || !noticeForm.content.trim()) {
      toast.error("請填寫通知標題和內容");
      return;
    }
    broadcastMutation.mutate({
      title: noticeForm.title.trim(),
      content: noticeForm.content.trim(),
      relatedGroupId: noticeForm.relatedGroupId === "all" ? undefined : Number(noticeForm.relatedGroupId),
    });
  };
  const missingLocations = staffLocations?.missing || [];
  const blockingImpacts = (impactPreview?.impacts || []).filter((impact: any) => impact.level === "error");
  const warningImpacts = (impactPreview?.impacts || []).filter((impact: any) => impact.level === "warning");

  return (
    <>
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={() => setOpen(true)}
          className="h-14 rounded-full bg-red-600 px-5 text-white shadow-2xl hover:bg-red-700"
        >
          <Zap className="mr-2 h-5 w-5" />
          緊急指揮
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[86vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-700">
              <Zap className="w-5 h-5" />緊急指揮快捷指令
            </DialogTitle>
            {commandScope?.project && (
              <p className="text-xs text-muted-foreground">
                目前作用範圍：{commandScope.project.name} · 全部批次/團組/行程點
              </p>
            )}
          </DialogHeader>

          <div className="grid grid-cols-3 gap-2">
            <Button
              type="button"
              variant={activeCommand === 'notice' ? 'default' : 'outline'}
              onClick={() => setActiveCommand('notice')}
              className={activeCommand === 'notice' ? 'bg-red-600 hover:bg-red-700' : ''}
            >
              <Bell className="mr-2 h-4 w-4" />
              全員通知
            </Button>
            <Button
              type="button"
              variant={activeCommand === 'adjust' ? 'default' : 'outline'}
              onClick={() => setActiveCommand('adjust')}
              className={activeCommand === 'adjust' ? 'bg-red-600 hover:bg-red-700' : ''}
            >
              <Edit3 className="mr-2 h-4 w-4" />
              改行程
            </Button>
            <Button
              type="button"
              variant={activeCommand === 'location' ? 'default' : 'outline'}
              onClick={() => setActiveCommand('location')}
              className={activeCommand === 'location' ? 'bg-red-600 hover:bg-red-700' : ''}
            >
              <LocateFixed className="mr-2 h-4 w-4" />
              定位提醒
            </Button>
          </div>

          {activeCommand === 'notice' && (
            <div className="space-y-4 py-2">
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">
                用於突發天氣、交通延誤、集合點變更等需要所有系統用戶立即看到的事項。發布後會寫入通知中心，並嘗試推送到已訂閱設備。
              </div>
              <div className="space-y-1.5">
                <Label>通知標題 *</Label>
                <Input
                  placeholder="如：所有團組暫停前往戶外景點"
                  value={noticeForm.title}
                  onChange={(e) => setNoticeForm((f) => ({ ...f, title: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>關聯團組</Label>
                <Select
                  value={noticeForm.relatedGroupId}
                  onValueChange={(value) => setNoticeForm((f) => ({ ...f, relatedGroupId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部 / 不指定團組</SelectItem>
                    {groupOptions.map((group: any) => (
                      <SelectItem key={group.id} value={String(group.id)}>{group.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>通知內容 *</Label>
                <Textarea
                  rows={4}
                  placeholder="請寫明處理指令、集合時間、負責人和下一步安排..."
                  value={noticeForm.content}
                  onChange={(e) => setNoticeForm((f) => ({ ...f, content: e.target.value }))}
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>取消</Button>
                <Button onClick={handleBroadcast} disabled={broadcastMutation.isPending} className="bg-red-600 hover:bg-red-700">
                  <Send className="mr-2 h-4 w-4" />
                  {broadcastMutation.isPending ? "發布中..." : "發布緊急通知"}
                </Button>
              </DialogFooter>
            </div>
          )}

              {activeCommand === 'adjust' && (
            <div className="space-y-4 py-2">
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                適用於景點、學校交流或餐廳突然改時間：先選團組或批次範圍，再指定要匹配的原行程點，系統會先預檢跨團衝突，確認後才批量更新。
              </div>

              <div className="grid grid-cols-3 gap-2">
                {([
                  ["batch", "按批次"],
                  ["group", "按團組"],
                  ["single", "單個行程"],
                ] as const).map(([value, label]) => (
                  <Button
                    key={value}
                    type="button"
                    variant={form.scopeType === value ? "default" : "outline"}
                    onClick={() => setForm((f) => ({ ...f, scopeType: value, groupIds: value === "group" ? f.groupIds : [], batchCode: value === "batch" ? f.batchCode : "" }))}
                    className={form.scopeType === value ? "bg-slate-900 hover:bg-slate-800" : ""}
                  >
                    {label}
                  </Button>
                ))}
              </div>

              {form.scopeType === "batch" && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>批次代號 *</Label>
                    <Select value={form.batchCode} onValueChange={(value) => setForm((f) => ({ ...f, batchCode: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="選擇批次" />
                      </SelectTrigger>
                      <SelectContent>
                        {batchOptions.map((code: string) => (
                          <SelectItem key={code} value={code}>{code}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>指定日期</Label>
                    <Input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
                  </div>
                </div>
              )}

              {form.scopeType === "group" && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>團組代號 *</Label>
                    <Select
                      value={form.groupIds[0] || ""}
                      onValueChange={(value) => setForm((f) => ({ ...f, groupIds: [value] }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="選擇團組" />
                      </SelectTrigger>
                      <SelectContent>
                        {groupOptions.map((group: any) => (
                          <SelectItem key={group.id} value={String(group.id)}>{group.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>指定日期</Label>
                    <Input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
                  </div>
                </div>
              )}

              {form.scopeType !== "single" && (
                <div className="space-y-1.5">
                  <Label>原行程點 / 關鍵詞 *</Label>
                  <Select
                    value={itineraryNameOptions.includes(form.matchText) ? form.matchText : "manual"}
                    onValueChange={(value) => setForm((f) => ({ ...f, matchText: value === "manual" ? "" : value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="選擇常見行程點，或手動輸入" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      <SelectItem value="manual">手動輸入關鍵詞</SelectItem>
                      {itineraryNameOptions.map((name) => (
                        <SelectItem key={name} value={name}>{name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="如：香港海洋公園、姊妹學校交流、晚餐"
                    value={form.matchText}
                    onChange={(e) => setForm((f) => ({ ...f, matchText: e.target.value }))}
                  />
                </div>
              )}

              {form.scopeType === "single" && (
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">選擇行程點 <span className="text-red-500">*</span></Label>
                <Select value={selectedItinId} onValueChange={setSelectedItinId}>
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="選擇需要調整的行程點..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {allItins.map((itin: any) => (
                      <SelectItem key={itin.itinId} value={String(itin.itinId)}>
                        <span className="font-semibold text-blue-700 mr-2">{itin.groupCode}</span>
                        {itin.description || itin.locationName}
                        {itin.startTime && <span className="text-muted-foreground ml-1">({formatTime(itin.startTime)})</span>}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedItin && (
                  <div className="text-xs text-muted-foreground bg-slate-50 rounded p-2 border">
                    當前：{selectedItin.description || selectedItin.locationName}
                    {selectedItin.startTime && ` · ${formatTime(selectedItin.startTime)}–${formatTime(selectedItin.endTime)}`}
                  </div>
                )}
              </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-sm">新地點名稱</Label>
                  <Input placeholder="留空則不修改" value={form.locationName}
                    onChange={e => setForm(f => ({ ...f, locationName: e.target.value }))} className="text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">新行程描述</Label>
                  <Input placeholder="留空則不修改" value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">新開始時間</Label>
                  <Input type="time" value={form.startTime}
                    onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} className="text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">新結束時間</Label>
                  <Input type="time" value={form.endTime}
                    onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))} className="text-sm" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">備註</Label>
                <Input placeholder="其他補充說明" value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="text-sm" />
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-sm font-semibold text-slate-800">調整前預檢</div>
                    <div className="text-xs text-muted-foreground">檢查受影響團組、同團重疊、同地點/學校/工作人員衝突</div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handlePreview}
                    disabled={previewMutation.isPending}
                  >
                    <AlertTriangle className="mr-1.5 h-3.5 w-3.5" />
                    {previewMutation.isPending ? "預檢中..." : "預檢影響"}
                  </Button>
                </div>

                {impactPreview && (
                  <div className="mt-3 space-y-3">
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-md bg-white p-2 border">
                        <div className="text-lg font-bold text-slate-900">{impactPreview.affectedGroups}</div>
                        <div className="text-[11px] text-muted-foreground">受影響團組</div>
                      </div>
                      <div className="rounded-md bg-white p-2 border">
                        <div className="text-lg font-bold text-slate-900">{impactPreview.affectedItineraries}</div>
                        <div className="text-[11px] text-muted-foreground">匹配行程點</div>
                      </div>
                      <div className="rounded-md bg-white p-2 border">
                        <div className={cn("text-lg font-bold", blockingImpacts.length > 0 ? "text-red-600" : warningImpacts.length > 0 ? "text-amber-600" : "text-emerald-600")}>
                          {blockingImpacts.length + warningImpacts.length}
                        </div>
                        <div className="text-[11px] text-muted-foreground">風險提示</div>
                      </div>
                    </div>
                    {impactPreview.targetGroups?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {impactPreview.targetGroups.slice(0, 18).map((code: string) => (
                          <Badge key={code} variant="outline" className="bg-white text-xs">{code}</Badge>
                        ))}
                        {impactPreview.targetGroups.length > 18 && (
                          <Badge variant="outline" className="bg-white text-xs">+{impactPreview.targetGroups.length - 18}</Badge>
                        )}
                      </div>
                    )}
                    <div className="space-y-2">
                      {(impactPreview.impacts || []).slice(0, 8).map((impact: any, index: number) => (
                        <div
                          key={`${impact.type}-${index}`}
                          className={cn(
                            "rounded-md border p-2 text-xs",
                            impact.level === "error" && "border-red-200 bg-red-50 text-red-800",
                            impact.level === "warning" && "border-amber-200 bg-amber-50 text-amber-800",
                            impact.level === "info" && "border-emerald-200 bg-emerald-50 text-emerald-800",
                          )}
                        >
                          <div className="flex items-center gap-1.5 font-semibold">
                            {impact.level === "info" ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                            {impact.title}
                          </div>
                          <div className="mt-1 leading-relaxed">{impact.message}</div>
                        </div>
                      ))}
                    </div>
                    {impactPreview.targets?.length > 0 && (
                      <div className="rounded-md border bg-white p-2">
                        <div className="mb-1 text-xs font-semibold text-slate-700">將被更新的行程點</div>
                        <div className="space-y-1 text-xs text-muted-foreground">
                          {impactPreview.targets.slice(0, 5).map((target: any) => (
                            <div key={target.id} className="truncate">
                              {target.groupCode} · {target.date} · {target.startTime || "未定"} · {target.locationName || target.description || "未命名行程"}
                            </div>
                          ))}
                          {impactPreview.targets.length > 5 && <div>另有 {impactPreview.targets.length - 5} 個行程點...</div>}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">調整原因 <span className="text-red-500">*</span></Label>
                <Textarea
                  placeholder="請說明調整原因，此內容將包含在通知中..."
                  value={form.reason}
                  onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                  className="text-sm resize-none" rows={2}
                />
              </div>
              <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg border border-amber-200">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-amber-600" />
                  <div>
                    <div className="text-sm font-medium text-amber-800">通知全員</div>
                    <div className="text-xs text-amber-600">向所有平台用戶發送調整通知</div>
                  </div>
                </div>
                <Switch checked={form.notifyAll} onCheckedChange={v => setForm(f => ({ ...f, notifyAll: v }))} />
              </div>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setOpen(false)} size="sm">取消</Button>
                <Button
                  onClick={handleSubmit}
                  disabled={adjustMutation.isPending || !impactPreview}
                  className="bg-red-500 hover:bg-red-600 text-white"
                  size="sm"
                >
                  {adjustMutation.isPending ? "提交中..." : !impactPreview ? "請先預檢影響" : (
                    <><Zap className="w-3.5 h-3.5 mr-1" />{form.notifyAll ? "確認調整並通知" : "確認調整"}</>
                  )}
                </Button>
              </DialogFooter>
            </div>
          )}

          {activeCommand === 'location' && (
            <div className="space-y-4 py-2">
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800">
                用於提醒已指派但未顯示位置的人員開啟「我的任務」位置共享。已綁定登入帳號的人員會收到通知中心提醒和 Web Push。
              </div>
              {missingLocations.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  <LocateFixed className="mx-auto mb-2 h-9 w-9 opacity-40" />
                  <p className="text-sm">目前沒有待提醒人員</p>
                </div>
              ) : (
                <div className="rounded-lg border divide-y">
                  {missingLocations.map((item: any) => (
                    <div key={item.staffId} className="flex flex-wrap items-center justify-between gap-2 p-3">
                      <div>
                        <div className="text-sm font-medium">{item.staffName}</div>
                        <div className="text-xs text-muted-foreground">
                          {roleName(item.role, item.customRole)} · {item.groupCode} {item.groupName}
                        </div>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => onRemindLocation(item.staffId)}>
                        <Send className="mr-1.5 h-3.5 w-3.5" />
                        發送提醒
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {recentAdj.length > 0 && activeCommand !== 'adjust' && (
            <div className="mt-2 rounded-lg border bg-slate-50 p-3">
              <div className="mb-2 text-xs font-semibold text-slate-600">最近調整記錄</div>
              <div className="space-y-1.5">
                {(recentAdj as any[]).slice(0, 3).map((r: any, i: number) => (
                  <div key={i} className="flex items-start gap-2 rounded bg-white p-2 text-xs">
                    <BellRing className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-400" />
                    <div className="min-w-0">
                      <div className="truncate font-medium">{r.title}</div>
                      <div className="text-muted-foreground">{r.createdAt}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

// ===== 详情弹窗：工作人员 =====
function StaffDetailDialog({ open, onClose, staffStatus }: { open: boolean; onClose: () => void; staffStatus: any[] }) {
  const busyStaff = staffStatus.filter(s => s.status === 'busy');
  const scheduledStaff = staffStatus.filter(s => s.status === 'scheduled');
  const freeStaff = staffStatus.filter(s => s.status === 'free');
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-blue-500" />
            工作人員實時狀態詳情
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-3 bg-emerald-50 rounded-lg">
              <div className="text-2xl font-bold text-emerald-600">{busyStaff.length}</div>
              <div className="text-xs text-emerald-700">當前在崗</div>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{scheduledStaff.length}</div>
              <div className="text-xs text-blue-700">今日待命</div>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-600">{freeStaff.length}</div>
              <div className="text-xs text-gray-700">空閒可指派</div>
            </div>
          </div>
          {busyStaff.length > 0 && (
            <div>
              <div className="text-sm font-semibold text-emerald-700 mb-2 flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />當前在崗
              </div>
              <div className="space-y-2">{busyStaff.map((s: any) => <StaffStatusCard key={s.id} staff={s} />)}</div>
            </div>
          )}
          {scheduledStaff.length > 0 && (
            <div>
              <div className="text-sm font-semibold text-blue-700 mb-2 flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-blue-400" />今日待命
              </div>
              <div className="space-y-2">{scheduledStaff.map((s: any) => <StaffStatusCard key={s.id} staff={s} />)}</div>
            </div>
          )}
          {freeStaff.length > 0 && (
            <div>
              <div className="text-sm font-semibold text-gray-500 mb-2 flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-gray-300" />空閒可指派
              </div>
              <div className="space-y-2">{freeStaff.map((s: any) => <StaffStatusCard key={s.id} staff={s} />)}</div>
            </div>
          )}
          {staffStatus.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <UserX className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">暫無工作人員指派數據</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ===== 详情弹窗：景点容量 =====
function VenueDetailDialog({ open, onClose, venueAlerts }: { open: boolean; onClose: () => void; venueAlerts: any[] }) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Navigation className="w-5 h-5 text-orange-500" />
            景點容量監控詳情
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {venueAlerts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-emerald-400" />
              <p className="text-sm text-emerald-600 font-medium">今日所有景點容量均正常</p>
              <p className="text-xs mt-1">無超負荷風險</p>
            </div>
          ) : (
            venueAlerts.map((v: any) => (
              <div key={v.name} className={`border rounded-lg p-4 ${
                v.alertLevel === 'critical' ? 'bg-red-50 border-red-200' :
                v.alertLevel === 'warning' ? 'bg-amber-50 border-amber-200' :
                'bg-emerald-50 border-emerald-200'
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-slate-600" />
                    <span className="font-semibold">{v.name}</span>
                  </div>
                  <Badge variant="outline" className={`${
                    v.alertLevel === 'critical' ? 'text-red-600 border-red-300' :
                    v.alertLevel === 'warning' ? 'text-amber-600 border-amber-300' :
                    'text-emerald-600 border-emerald-300'
                  }`}>
                    {v.alertLevel === 'critical' ? '超負荷預警' : v.alertLevel === 'warning' ? '即將滿員' : '容量健康'}
                  </Badge>
                </div>
                <div className="grid grid-cols-3 gap-3 mb-3 text-center">
                  <div className="bg-white rounded p-2">
                    <div className="text-lg font-bold text-slate-800">{v.currentPax}</div>
                    <div className="text-xs text-muted-foreground">當前人數</div>
                  </div>
                  <div className="bg-white rounded p-2">
                    <div className="text-lg font-bold text-slate-800">{v.maxCapacity}</div>
                    <div className="text-xs text-muted-foreground">最大容量</div>
                  </div>
                  <div className="bg-white rounded p-2">
                    <div className={`text-lg font-bold ${
                      v.alertLevel === 'critical' ? 'text-red-600' :
                      v.alertLevel === 'warning' ? 'text-amber-600' : 'text-emerald-600'
                    }`}>
                      {v.maxCapacity > 0 ? Math.round(v.currentPax / v.maxCapacity * 100) : 0}%
                    </div>
                    <div className="text-xs text-muted-foreground">使用率</div>
                  </div>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden mb-3">
                  <div
                    className={`h-full rounded-full transition-all ${
                      v.alertLevel === 'critical' ? 'bg-red-500' :
                      v.alertLevel === 'warning' ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(v.maxCapacity > 0 ? Math.round(v.currentPax / v.maxCapacity * 100) : 0, 100)}%` }}
                  />
                </div>
                {v.currentGroups?.length > 0 && (
                  <div className="mb-2">
                    <div className="text-xs font-semibold text-slate-600 mb-1">當前在場團組：</div>
                    <div className="flex flex-wrap gap-1">
                      {v.currentGroups.map((g: any) => (
                        <span key={g.groupId} className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                          {g.groupCode}（{g.headcount}人）
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {v.upcomingGroups?.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold text-slate-600 mb-1">即將抵達：</div>
                    <div className="flex flex-wrap gap-1">
                      {v.upcomingGroups.map((g: any) => (
                        <span key={g.groupId} className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                          {g.groupCode}（{g.headcount}人）{g.hoursUntil > 0 ? ` · ${hoursLabel(g.hoursUntil)}` : ''}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ===== 详情弹窗：餐饮预备 =====
function DiningDetailDialog({ open, onClose, diningAlerts }: { open: boolean; onClose: () => void; diningAlerts: any[] }) {
  const urgencyConfig = {
    now: { label: '立即準備', color: 'text-red-600', bg: 'bg-red-50 border-red-200' },
    soon: { label: '即將到達', color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' },
    later: { label: '稍後準備', color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' },
    tomorrow: { label: '明日預訂', color: 'text-slate-600', bg: 'bg-slate-50 border-slate-200' },
  };
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Utensils className="w-5 h-5 text-rose-500" />
            餐飲預備詳情
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {diningAlerts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Utensils className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">今明兩日無餐廳預訂</p>
            </div>
          ) : (
            diningAlerts.map((d: any, idx: number) => {
              const cfg = urgencyConfig[d.urgency as keyof typeof urgencyConfig] || urgencyConfig.later;
              return (
                <div key={`${d.id}-${idx}`} className={`border rounded-lg p-4 ${cfg.bg}`}>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <Utensils className="w-4 h-4 text-rose-500" />
                        <span className="font-semibold">{d.restaurantName}</span>
                        <Badge variant="outline" className={`text-xs ${cfg.color} border-current`}>{cfg.label}</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {d.groupCode} · {d.headcount} 人 · {d.mealType === 'lunch' ? '午餐' : d.mealType === 'dinner' ? '晚餐' : '早餐'}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-slate-700">{d.mealTime ? formatTime(d.mealTime) : '--'}</div>
                      <div className="text-xs text-muted-foreground">{d.date}</div>
                    </div>
                  </div>
                  {d.hoursUntil !== undefined && d.hoursUntil > 0 && (
                    <div className="text-xs text-slate-600 mt-1">
                      <Clock className="w-3 h-3 inline mr-1" />
                      預計 {hoursLabel(d.hoursUntil)} 抵達
                    </div>
                  )}
                  {d.notes && <div className="text-xs text-muted-foreground mt-1 italic">{d.notes}</div>}
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ===== 详情弹窗：住宿统计 =====
function AccomDetailDialog({ open, onClose, accommodation }: { open: boolean; onClose: () => void; accommodation: any }) {
  const groups = accommodation?.groups || [];
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Hotel className="w-5 h-5 text-purple-500" />
            今日住宿統計詳情
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 bg-purple-50 rounded-lg text-center">
              <div className="text-3xl font-bold text-purple-600">{accommodation?.hk || 0}</div>
              <div className="text-sm text-purple-700 mt-1">香港住宿人數</div>
            </div>
            <div className="p-4 bg-indigo-50 rounded-lg text-center">
              <div className="text-3xl font-bold text-indigo-600">{accommodation?.sz || 0}</div>
              <div className="text-sm text-indigo-700 mt-1">深圳住宿人數</div>
            </div>
          </div>
          {groups.length > 0 && (
            <div>
              <div className="text-sm font-semibold text-slate-700 mb-2">各團組住宿詳情</div>
              <div className="space-y-2">
                {groups.map((g: any) => (
                  <div key={g.groupId} className="flex items-center gap-3 p-3 bg-white border rounded-lg">
                    <span className="text-xs font-bold text-slate-700 w-10">{g.groupCode}</span>
                    <span className="flex-1 text-xs text-slate-600 truncate">{g.groupName}</span>
                    <Badge variant="outline" className={`text-xs ${
                      g.location === 'hk' ? 'text-purple-600 border-purple-300' : 'text-indigo-600 border-indigo-300'
                    }`}>
                      {g.location === 'hk' ? '香港' : '深圳'}
                    </Badge>
                    <span className="text-xs font-semibold text-slate-700">{g.headcount} 人</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ===== 主仪表盘组件 =====
export default function OperationsDashboard() {
  const [staffDetailOpen, setStaffDetailOpen] = useState(false);
  const [venueDetailOpen, setVenueDetailOpen] = useState(false);
  const [diningDetailOpen, setDiningDetailOpen] = useState(false);
  const [accomDetailOpen, setAccomDetailOpen] = useState(false);

  const { data: overview, refetch: refetchOverview } = trpc.dashboard.overview.useQuery(undefined, {
    refetchInterval: 60000, // 每分钟刷新
  });
  const { data: staffStatus = [], refetch: refetchStaff } = trpc.dashboard.staffStatus.useQuery(undefined, {
    refetchInterval: 60000,
  });
  const { data: venueAlerts = [], refetch: refetchVenue } = trpc.dashboard.venueAlert.useQuery(undefined, {
    refetchInterval: 60000,
  });
  const { data: diningAlerts = [], refetch: refetchDining } = trpc.dashboard.diningAlert.useQuery(undefined, {
    refetchInterval: 60000,
  });
  const { data: accommodation } = trpc.dashboard.accommodationStats.useQuery(undefined, {
    refetchInterval: 60000,
  });
  const { data: flights } = trpc.dashboard.flightInfo.useQuery(undefined, {
    refetchInterval: 60000,
  });
  const { data: staffLocations, refetch: refetchStaffLocations } = trpc.dashboard.staffLocations.useQuery(undefined, {
    refetchInterval: 60000,
  });
  const { data: commandScope, refetch: refetchCommandScope } = trpc.dashboard.commandScope.useQuery(undefined, {
    refetchInterval: 60000,
  });
  const { data: itineraryMap, refetch: refetchItineraryMap } = trpc.dashboard.itineraryMapPoints.useQuery(undefined, {
    refetchInterval: 60000,
  });
  const remindLocation = trpc.dashboard.remindLocationSharing.useMutation({
    onSuccess: () => toast.success("已發送位置共享提醒"),
    onError: (error) => toast.error("提醒失敗", { description: error.message }),
  });
  const syncPlaces = trpc.dashboard.syncPlaceCoordinates.useMutation({
    onSuccess: (data) => {
      toast.success(data.inserted > 0 ? `已同步 ${data.inserted} 個地點坐標` : "地點坐標已是最新");
      refetchItineraryMap();
    },
    onError: (error) => toast.error("同步失敗", { description: error.message }),
  });

  const handleRefresh = () => {
    refetchOverview();
    refetchStaff();
    refetchVenue();
    refetchDining();
    refetchStaffLocations();
    refetchCommandScope();
    refetchItineraryMap();
  };

  const todayItins = overview?.todayItineraries || [];
  const tomorrowItins = overview?.tomorrowItineraries || [];
  const activeGroups = todayItins.filter(i => i.status === 'in_progress').length;
  const totalGroups = new Set(todayItins.map(i => i.groupId)).size;

  const busyStaff = staffStatus.filter((s: any) => s.status === 'busy');
  const scheduledStaff = staffStatus.filter((s: any) => s.status === 'scheduled');
  const freeStaff = staffStatus.filter((s: any) => s.status === 'free');

  const criticalVenues = venueAlerts.filter((v: any) => v.alertLevel === 'critical');
  const warningVenues = venueAlerts.filter((v: any) => v.alertLevel === 'warning');

  const urgentDining = diningAlerts.filter((d: any) => d.urgency === 'now' || d.urgency === 'soon');

  return (
    <div className="p-5 space-y-5 bg-slate-50 min-h-screen">
      {/* 顶部状态栏 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">實時運營指揮中心</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {overview?.today} · 自動每分鐘更新
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} className="gap-1.5">
          <RefreshCw className="w-3.5 h-3.5" />
          立即刷新
        </Button>
      </div>

      {/* 模拟日期提示横幅 */}
      {overview?.isSimulatedDate && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-800">
          <Info className="w-4 h-4 flex-shrink-0 text-amber-500" />
          <span className="text-xs">
            <span className="font-semibold">模擬展示模式</span> · 今日（{new Date().toLocaleDateString('zh-HK')}）暫無活躍行程，目前展示的是最近項目活躍日期 <span className="font-semibold">{overview.today}</span> 的數據。項目正式啟動後將自動切換為實時數據。
          </span>
        </div>
      )}

      <StatusBar
        currentTime={overview?.currentTime || ""}
        today={overview?.today || ""}
        totalGroups={totalGroups}
        activeGroups={activeGroups}
      />

      {/* 顶部概览数字 — 满屏6列，可点击展开详情 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* 进行中行程 */}
        <Card className="bg-white border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="w-4 h-4 text-emerald-500" />
              <span className="text-xs text-muted-foreground">進行中行程</span>
            </div>
            <div className="text-2xl font-bold text-emerald-600">{activeGroups}</div>
            <div className="text-xs text-muted-foreground">共 {todayItins.length} 個今日行程</div>
          </CardContent>
        </Card>

        {/* 在岗人员 — 可点击 */}
        <Card
          className="bg-white border-0 shadow-sm cursor-pointer hover:shadow-md hover:border-blue-200 border transition-all"
          onClick={() => setStaffDetailOpen(true)}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <UserCheck className="w-4 h-4 text-blue-500" />
              <span className="text-xs text-muted-foreground">在崗人員</span>
              <ChevronRight className="w-3 h-3 text-muted-foreground ml-auto" />
            </div>
            <div className="text-2xl font-bold text-blue-600">{busyStaff.length + scheduledStaff.length}</div>
            <div className="text-xs text-muted-foreground">{freeStaff.length} 人空閒可指派</div>
          </CardContent>
        </Card>

        {/* 香港住宿 — 可点击 */}
        <Card
          className="bg-white border-0 shadow-sm cursor-pointer hover:shadow-md hover:border-purple-200 border transition-all"
          onClick={() => setAccomDetailOpen(true)}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Hotel className="w-4 h-4 text-purple-500" />
              <span className="text-xs text-muted-foreground">今日香港住宿</span>
              <ChevronRight className="w-3 h-3 text-muted-foreground ml-auto" />
            </div>
            <div className="text-2xl font-bold text-purple-600">{accommodation?.hk || 0}</div>
            <div className="text-xs text-muted-foreground">人</div>
          </CardContent>
        </Card>

        {/* 深圳住宿 — 可点击 */}
        <Card
          className="bg-white border-0 shadow-sm cursor-pointer hover:shadow-md hover:border-indigo-200 border transition-all"
          onClick={() => setAccomDetailOpen(true)}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Building2 className="w-4 h-4 text-indigo-500" />
              <span className="text-xs text-muted-foreground">今日深圳住宿</span>
              <ChevronRight className="w-3 h-3 text-muted-foreground ml-auto" />
            </div>
            <div className="text-2xl font-bold text-indigo-600">{accommodation?.sz || 0}</div>
            <div className="text-xs text-muted-foreground">人</div>
          </CardContent>
        </Card>

        {/* 景点预警 — 可点击 */}
        <Card
          className={`border shadow-sm cursor-pointer hover:shadow-md transition-all ${
            criticalVenues.length > 0 ? 'bg-red-50 border-red-200 hover:border-red-400' :
            warningVenues.length > 0 ? 'bg-amber-50 border-amber-200 hover:border-amber-400' :
            'bg-white border-transparent hover:border-emerald-200'
          }`}
          onClick={() => setVenueDetailOpen(true)}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className={`w-4 h-4 ${
                criticalVenues.length > 0 ? 'text-red-500' :
                warningVenues.length > 0 ? 'text-amber-500' : 'text-gray-400'
              }`} />
              <span className="text-xs text-muted-foreground">景點預警</span>
              <ChevronRight className="w-3 h-3 text-muted-foreground ml-auto" />
            </div>
            <div className={`text-2xl font-bold ${
              criticalVenues.length > 0 ? 'text-red-600' :
              warningVenues.length > 0 ? 'text-amber-600' : 'text-gray-400'
            }`}>
              {criticalVenues.length + warningVenues.length}
            </div>
            <div className="text-xs text-muted-foreground">
              {criticalVenues.length > 0 ? `${criticalVenues.length} 個超負荷` :
               warningVenues.length > 0 ? `${warningVenues.length} 個即將滿員` : '全部健康'}
            </div>
          </CardContent>
        </Card>

        {/* 餐饮提醒 — 可点击 */}
        <Card
          className={`border shadow-sm cursor-pointer hover:shadow-md transition-all ${
            urgentDining.length > 0 ? 'bg-amber-50 border-amber-200 hover:border-amber-400' :
            'bg-white border-transparent hover:border-rose-200'
          }`}
          onClick={() => setDiningDetailOpen(true)}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Utensils className={`w-4 h-4 ${urgentDining.length > 0 ? 'text-amber-500' : 'text-gray-400'}`} />
              <span className="text-xs text-muted-foreground">餐飲提醒</span>
              <ChevronRight className="w-3 h-3 text-muted-foreground ml-auto" />
            </div>
            <div className={`text-2xl font-bold ${urgentDining.length > 0 ? 'text-amber-600' : 'text-gray-400'}`}>
              {diningAlerts.length}
            </div>
            <div className="text-xs text-muted-foreground">
              {urgentDining.length > 0 ? `${urgentDining.length} 個緊急` : '今明兩日預訂'}
            </div>
          </CardContent>
        </Card>
      </div>

      <StaffLocationMap
        data={staffLocations}
        itineraryMap={itineraryMap}
        onRemind={(staffId) => remindLocation.mutate({ staffId })}
        onSyncPlaces={() => syncPlaces.mutate()}
        syncPending={syncPlaces.isPending}
      />

      {/* 主内容区：三列布局 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* 左列：团组行程实时进度 */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="bg-white border-0 shadow-sm">
            <CardHeader className="pb-3 pt-4 px-5">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-500" />
                  今日行程實時進度
                </CardTitle>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />進行中</span>
                  <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-400" />即將開始</span>
                  <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-gray-400" />已完成</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-5 pb-4">
              {todayItins.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <CalendarClock className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">今日暫無行程安排</p>
                  <p className="text-xs mt-1">請確認行程數據已正確錄入</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {todayItins.map((itin: any) => (
                    <GroupProgressCard key={itin.itinId} itin={itin} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 明日预告 */}
          {tomorrowItins.length > 0 && (
            <Card className="bg-white border-0 shadow-sm">
              <CardHeader className="pb-3 pt-4 px-5">
                <CardTitle className="text-base flex items-center gap-2">
                  <ChevronRight className="w-4 h-4 text-blue-500" />
                  明日行程預告
                </CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-4">
                <div className="space-y-2">
                  {tomorrowItins.slice(0, 6).map((itin: any) => (
                    <div key={itin.itinId} className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
                      <span className="text-xs font-semibold text-blue-700 w-8 flex-shrink-0">{itin.groupCode}</span>
                      <span className="text-xs text-slate-700 flex-1 truncate">{itin.description}</span>
                      {itin.startTime && (
                        <span className="text-xs text-muted-foreground flex-shrink-0 flex items-center gap-1">
                          <Clock className="w-3 h-3" />{formatTime(itin.startTime)}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 航班信息 */}
          {((flights?.arrivals?.length || 0) + (flights?.departures?.length || 0)) > 0 && (
            <Card className="bg-white border-0 shadow-sm">
              <CardHeader className="pb-3 pt-4 px-5">
                <CardTitle className="text-base flex items-center gap-2">
                  <Plane className="w-4 h-4 text-sky-500" />
                  今明航班動態
                </CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(flights?.arrivals?.length || 0) > 0 && (
                    <div>
                      <div className="text-xs font-semibold text-emerald-700 mb-2 flex items-center gap-1">
                        <Plane className="w-3 h-3 rotate-45" />抵達
                      </div>
                      <div className="space-y-2">
                        {flights!.arrivals.map((g: any) => (
                          <div key={g.id} className="flex items-center gap-2 p-2 bg-emerald-50 rounded-lg border border-emerald-100">
                            <span className="text-xs font-bold text-emerald-700 w-8">{g.code}</span>
                            <div className="flex-1 min-w-0">
                              <div className="text-xs truncate">{g.flightInfo || "航班待確認"}</div>
                              <div className="text-xs text-muted-foreground">{g.startDate} · {(g.studentCount || 0) + (g.teacherCount || 0)} 人</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {(flights?.departures?.length || 0) > 0 && (
                    <div>
                      <div className="text-xs font-semibold text-amber-700 mb-2 flex items-center gap-1">
                        <Plane className="w-3 h-3 -rotate-45" />離開
                      </div>
                      <div className="space-y-2">
                        {flights!.departures.map((g: any) => (
                          <div key={g.id} className="flex items-center gap-2 p-2 bg-amber-50 rounded-lg border border-amber-100">
                            <span className="text-xs font-bold text-amber-700 w-8">{g.code}</span>
                            <div className="flex-1 min-w-0">
                              <div className="text-xs truncate">{g.flightInfo || "航班待確認"}</div>
                              <div className="text-xs text-muted-foreground">{g.endDate} · {(g.studentCount || 0) + (g.teacherCount || 0)} 人</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* 右列：工作人员状态 + 景点预警 + 餐饮提醒 */}
        <div className="space-y-4">
          {/* 工作人员实时状态 */}
          <Card
            className="bg-white border-0 shadow-sm cursor-pointer hover:shadow-md transition-all"
            onClick={() => setStaffDetailOpen(true)}
          >
            <CardHeader className="pb-3 pt-4 px-5">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-500" />
                工作人員實時狀態
                <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto" />
              </CardTitle>
              <div className="flex gap-3 text-xs mt-1">
                <span className="flex items-center gap-1 text-emerald-600">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />{busyStaff.length} 在崗
                </span>
                <span className="flex items-center gap-1 text-blue-600">
                  <div className="w-2 h-2 rounded-full bg-blue-400" />{scheduledStaff.length} 待命
                </span>
                <span className="flex items-center gap-1 text-gray-500">
                  <div className="w-2 h-2 rounded-full bg-gray-300" />{freeStaff.length} 空閒
                </span>
              </div>
            </CardHeader>
            <CardContent className="px-5 pb-4">
              {staffStatus.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <UserX className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-xs">暫無工作人員數據</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {/* 在岗人员优先显示 */}
                  {busyStaff.length > 0 && (
                    <div>
                      <div className="text-xs font-semibold text-emerald-700 mb-1.5 flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />當前在崗
                      </div>
                      {busyStaff.map((s: any) => <StaffStatusCard key={s.id} staff={s} />)}
                    </div>
                  )}
                  {scheduledStaff.length > 0 && (
                    <div className="mt-2">
                      <div className="text-xs font-semibold text-blue-700 mb-1.5 flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />今日待命
                      </div>
                      {scheduledStaff.map((s: any) => <StaffStatusCard key={s.id} staff={s} />)}
                    </div>
                  )}
                  {freeStaff.length > 0 && (
                    <div className="mt-2">
                      <div className="text-xs font-semibold text-gray-500 mb-1.5 flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-gray-300" />空閒可指派
                      </div>
                      {freeStaff.map((s: any) => <StaffStatusCard key={s.id} staff={s} />)}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 景点人流预警 */}
          <Card
            className="bg-white border-0 shadow-sm cursor-pointer hover:shadow-md transition-all"
            onClick={() => setVenueDetailOpen(true)}
          >
            <CardHeader className="pb-3 pt-4 px-5">
              <CardTitle className="text-base flex items-center gap-2">
                <Navigation className="w-4 h-4 text-orange-500" />
                景點人流監控
                <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto" />
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-4">
              {venueAlerts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-400" />
                  <p className="text-xs text-emerald-600 font-medium">今日景點容量均正常</p>
                  <p className="text-xs text-muted-foreground mt-0.5">無超負荷風險</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {venueAlerts.map((v: any) => <VenueAlertCard key={v.name} venue={v} />)}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 餐饮预备提醒 */}
          <Card
            className="bg-white border-0 shadow-sm cursor-pointer hover:shadow-md transition-all"
            onClick={() => setDiningDetailOpen(true)}
          >
            <CardHeader className="pb-3 pt-4 px-5">
              <CardTitle className="text-base flex items-center gap-2">
                <Utensils className="w-4 h-4 text-rose-500" />
                餐飲預備提醒
                <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto" />
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-4">
              {diningAlerts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Utensils className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-xs">今明兩日無餐廳預訂</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {diningAlerts.map((d: any, idx: number) => (
                    <DiningCard key={`${d.id}-${idx}`} booking={d} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 詳情弹窗 */}
      <StaffDetailDialog
        open={staffDetailOpen}
        onClose={() => setStaffDetailOpen(false)}
        staffStatus={staffStatus}
      />
      <VenueDetailDialog
        open={venueDetailOpen}
        onClose={() => setVenueDetailOpen(false)}
        venueAlerts={venueAlerts}
      />
      <DiningDetailDialog
        open={diningDetailOpen}
        onClose={() => setDiningDetailOpen(false)}
        diningAlerts={diningAlerts}
      />
      <AccomDetailDialog
        open={accomDetailOpen}
        onClose={() => setAccomDetailOpen(false)}
        accommodation={accommodation}
      />
      <EmergencyCommandButton
        commandScope={commandScope}
        staffLocations={staffLocations}
        onRemindLocation={(staffId) => remindLocation.mutate({ staffId })}
      />
    </div>
  );
}
