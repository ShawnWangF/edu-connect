import { useEffect, useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Users, MapPin, Clock, AlertTriangle, CheckCircle2, Circle,
  Utensils, Plane, Building2, UserCheck, UserX, Activity,
  TrendingUp, Navigation, CalendarClock, ChevronRight, RefreshCw,
  Hotel, Bus, Star, Zap, Bell, BellRing, Edit3
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
  coordinator: "總統籌", staff: "工作人員", guide: "導遊", driver: "司機",
};
const roleColor: Record<string, string> = {
  coordinator: "bg-purple-100 text-purple-800",
  staff: "bg-blue-100 text-blue-800",
  guide: "bg-green-100 text-green-800",
  driver: "bg-orange-100 text-orange-800",
};
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
            {roleLabel[staff.role]}
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
function UrgentAdjustPanel({ allItins }: { allItins: any[] }) {
  const [open, setOpen] = useState(false);
  const [selectedItinId, setSelectedItinId] = useState<string>("");
  const [form, setForm] = useState({
    locationName: "", description: "", startTime: "", endTime: "",
    notes: "", reason: "", notifyAll: true
  });
  const utils = trpc.useUtils();
  const { data: recentAdj = [] } = trpc.dashboard.recentAdjustments.useQuery(undefined, { refetchInterval: 30000 });
  const adjustMutation = trpc.dashboard.urgentAdjust.useMutation({
    onSuccess: (data) => {
      toast.success("調整已提交", {
        description: `${data.groupName} ${data.date} 行程點已更新${form.notifyAll ? "，已通知全员" : ""}`,
      });
      utils.dashboard.recentAdjustments.invalidate();
      utils.dashboard.overview.invalidate();
      setOpen(false);
      setForm({ locationName: "", description: "", startTime: "", endTime: "", notes: "", reason: "", notifyAll: true });
      setSelectedItinId("");
    },
    onError: (e) => toast.error("提交失敗", { description: e.message }),
  });
  const selectedItin = useMemo(
    () => allItins.find(i => String(i.itinId) === selectedItinId),
    [allItins, selectedItinId]
  );
  const handleSubmit = () => {
    if (!selectedItinId || !form.reason.trim()) {
      toast.error("請選擇行程點並填寫調整原因");
      return;
    }
    adjustMutation.mutate({
      itineraryId: Number(selectedItinId),
      locationName: form.locationName || undefined,
      description: form.description || undefined,
      startTime: form.startTime || undefined,
      endTime: form.endTime || undefined,
      notes: form.notes || undefined,
      reason: form.reason,
      notifyAll: form.notifyAll,
    });
  };
  return (
    <>
      <div className="bg-red-50 border border-red-200 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-red-500 flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="text-sm font-bold text-red-800">緊急行程調整</div>
              <div className="text-xs text-red-600">快速修改行程點 · 可一鍵通知全員</div>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => setOpen(true)}
            className="bg-red-500 hover:bg-red-600 text-white text-xs h-8 px-3 gap-1.5 shadow-sm"
          >
            <Edit3 className="w-3.5 h-3.5" />發起調整
          </Button>
        </div>
        {recentAdj.length > 0 ? (
          <div className="space-y-1.5">
            <div className="text-xs font-semibold text-red-700 mb-1.5">最近調整記錄</div>
            {(recentAdj as any[]).slice(0, 3).map((r: any, i: number) => (
              <div key={i} className="flex items-start gap-2 p-2 bg-white rounded-lg border border-red-100">
                <BellRing className="w-3.5 h-3.5 text-red-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-red-800 truncate">{r.title}</div>
                  <div className="text-xs text-muted-foreground">{r.createdAt}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-xs text-red-500 text-center py-1">暂無調整記錄</div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-700">
              <Zap className="w-5 h-5" />緊急行程點調整
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
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
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} size="sm">取消</Button>
            <Button
              onClick={handleSubmit}
              disabled={adjustMutation.isPending}
              className="bg-red-500 hover:bg-red-600 text-white"
              size="sm"
            >
              {adjustMutation.isPending ? "提交中..." : (
                <><Zap className="w-3.5 h-3.5 mr-1" />{form.notifyAll ? "調整並通知全員" : "僅調整行程"}</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ===== 主仪表盘组件 =====
export default function OperationsDashboard() {
  const [refreshKey, setRefreshKey] = useState(0);

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

  const handleRefresh = () => {
    refetchOverview();
    refetchStaff();
    refetchVenue();
    refetchDining();
    setRefreshKey(k => k + 1);
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

      <StatusBar
        currentTime={overview?.currentTime || ""}
        today={overview?.today || ""}
        totalGroups={totalGroups}
        activeGroups={activeGroups}
      />

      {/* 顶部概览数字 */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
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
        <Card className="bg-white border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <UserCheck className="w-4 h-4 text-blue-500" />
              <span className="text-xs text-muted-foreground">在崗人員</span>
            </div>
            <div className="text-2xl font-bold text-blue-600">{busyStaff.length}</div>
            <div className="text-xs text-muted-foreground">{freeStaff.length} 人空閒可指派</div>
          </CardContent>
        </Card>
        <Card className="bg-white border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Hotel className="w-4 h-4 text-purple-500" />
              <span className="text-xs text-muted-foreground">今日香港住宿</span>
            </div>
            <div className="text-2xl font-bold text-purple-600">{accommodation?.hk || 0}</div>
            <div className="text-xs text-muted-foreground">人</div>
          </CardContent>
        </Card>
        <Card className="bg-white border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Building2 className="w-4 h-4 text-indigo-500" />
              <span className="text-xs text-muted-foreground">今日深圳住宿</span>
            </div>
            <div className="text-2xl font-bold text-indigo-600">{accommodation?.sz || 0}</div>
            <div className="text-xs text-muted-foreground">人</div>
          </CardContent>
        </Card>
        <Card className={`border-0 shadow-sm ${criticalVenues.length > 0 ? 'bg-red-50' : warningVenues.length > 0 ? 'bg-amber-50' : 'bg-white'}`}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className={`w-4 h-4 ${criticalVenues.length > 0 ? 'text-red-500' : warningVenues.length > 0 ? 'text-amber-500' : 'text-gray-400'}`} />
              <span className="text-xs text-muted-foreground">景點預警</span>
            </div>
            <div className={`text-2xl font-bold ${criticalVenues.length > 0 ? 'text-red-600' : warningVenues.length > 0 ? 'text-amber-600' : 'text-gray-400'}`}>
              {criticalVenues.length + warningVenues.length}
            </div>
            <div className="text-xs text-muted-foreground">
              {criticalVenues.length > 0 ? `${criticalVenues.length} 個超負荷` : warningVenues.length > 0 ? `${warningVenues.length} 個即將滿員` : '全部健康'}
            </div>
          </CardContent>
        </Card>
        <Card className={`border-0 shadow-sm ${urgentDining.length > 0 ? 'bg-amber-50' : 'bg-white'}`}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Utensils className={`w-4 h-4 ${urgentDining.length > 0 ? 'text-amber-500' : 'text-gray-400'}`} />
              <span className="text-xs text-muted-foreground">餐飲提醒</span>
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

          {/* 紧急调整快捷窗口（明日行程預告上方） */}
          <UrgentAdjustPanel allItins={[...todayItins, ...tomorrowItins]} />

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
          <Card className="bg-white border-0 shadow-sm">
            <CardHeader className="pb-3 pt-4 px-5">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-500" />
                工作人員實時狀態
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
          <Card className="bg-white border-0 shadow-sm">
            <CardHeader className="pb-3 pt-4 px-5">
              <CardTitle className="text-base flex items-center gap-2">
                <Navigation className="w-4 h-4 text-orange-500" />
                景點人流監控
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
          <Card className="bg-white border-0 shadow-sm">
            <CardHeader className="pb-3 pt-4 px-5">
              <CardTitle className="text-base flex items-center gap-2">
                <Utensils className="w-4 h-4 text-rose-500" />
                餐飲預備提醒
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
    </div>
  );
}
