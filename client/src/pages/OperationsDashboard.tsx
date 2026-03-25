import { useEffect, useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Users, MapPin, Clock, AlertTriangle, CheckCircle2, Circle,
  Utensils, Plane, Building2, UserCheck, UserX, Activity,
  TrendingUp, Navigation, CalendarClock, ChevronRight, RefreshCw,
  Hotel, Bus, Star, Zap, Bell, BellRing, Edit3, Info
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
  const [refreshKey, setRefreshKey] = useState(0);
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
    </div>
  );
}
