import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { MapPin, Edit, Trash2, Plus, Clock, Users, AlertTriangle, CalendarX } from "lucide-react";

type TimeSlot = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
};

const WEEKDAYS = [
  { value: 0, label: "週日", key: "sunday" },
  { value: 1, label: "週一", key: "monday" },
  { value: 2, label: "週二", key: "tuesday" },
  { value: 3, label: "週三", key: "wednesday" },
  { value: 4, label: "週四", key: "thursday" },
  { value: 5, label: "週五", key: "friday" },
  { value: 6, label: "週六", key: "saturday" },
];

function parseClosedDays(raw: unknown): number[] {
  if (!raw) return [];
  const list = Array.isArray(raw) ? raw : (typeof raw === "string" ? JSON.parse(raw) : []);
  const weekdayMap: Record<string, number> = {
    sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
    thursday: 4, friday: 5, saturday: 6,
  };
  return list
    .map((entry: unknown) => {
      if (typeof entry === "number") return entry;
      if (typeof entry === "string") {
        const n = weekdayMap[entry.toLowerCase()];
        return n !== undefined ? n : -1;
      }
      return -1;
    })
    .filter((n: number) => n >= 0 && n <= 6);
}

export default function Attractions() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAttraction, setEditingAttraction] = useState<any>(null);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [isAlwaysUnavailable, setIsAlwaysUnavailable] = useState(false);
  // 每週休館日（數字陣列：0=週日, 1=週一, ...）
  const [closedDayNums, setClosedDayNums] = useState<number[]>([]);

  const utils = trpc.useUtils();
  const { data: attractions = [], isLoading } = trpc.attractions.list.useQuery();

  const createMutation = trpc.attractions.create.useMutation({
    onSuccess: () => {
      toast.success("景點創建成功");
      utils.attractions.list.invalidate();
      handleCloseDialog();
    },
    onError: (error) => toast.error(`創建失敗：${error.message}`),
  });

  const updateMutation = trpc.attractions.update.useMutation({
    onSuccess: () => {
      toast.success("景點更新成功");
      utils.attractions.list.invalidate();
      handleCloseDialog();
    },
    onError: (error) => toast.error(`更新失敗：${error.message}`),
  });

  const deleteMutation = trpc.attractions.delete.useMutation({
    onSuccess: () => {
      toast.success("景點刪除成功");
      utils.attractions.list.invalidate();
    },
    onError: (error) => toast.error(`刪除失敗：${error.message}`),
  });

  const handleOpenDialog = (attraction?: any) => {
    if (attraction) {
      setEditingAttraction(attraction);
      setIsAlwaysUnavailable(attraction.isAlwaysUnavailable || false);
      setTimeSlots(Array.isArray(attraction.unavailableTimeSlots) ? attraction.unavailableTimeSlots : []);
      setClosedDayNums(parseClosedDays(attraction.closedDays));
    } else {
      setEditingAttraction(null);
      setIsAlwaysUnavailable(false);
      setTimeSlots([]);
      setClosedDayNums([]);
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingAttraction(null);
    setTimeSlots([]);
    setIsAlwaysUnavailable(false);
    setClosedDayNums([]);
  };

  const toggleClosedDay = (dayNum: number) => {
    setClosedDayNums(prev =>
      prev.includes(dayNum) ? prev.filter(d => d !== dayNum) : [...prev, dayNum]
    );
  };

  const handleAddTimeSlot = () => {
    setTimeSlots([...timeSlots, { dayOfWeek: 1, startTime: "09:00", endTime: "17:00" }]);
  };

  const handleRemoveTimeSlot = (index: number) => {
    setTimeSlots(timeSlots.filter((_, i) => i !== index));
  };

  const handleTimeSlotChange = (index: number, field: keyof TimeSlot, value: string | number) => {
    const newSlots = [...timeSlots];
    newSlots[index] = { ...newSlots[index], [field]: value };
    setTimeSlots(newSlots);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const data = {
      name: formData.get("name") as string,
      location: formData.get("location") as string || undefined,
      address: formData.get("address") as string || undefined,
      description: formData.get("description") as string || undefined,
      capacity: formData.get("capacity") ? parseInt(formData.get("capacity") as string) : undefined,
      maxCapacity: formData.get("maxCapacity") ? parseInt(formData.get("maxCapacity") as string) : undefined,
      closedDays: closedDayNums, // 傳遞數字陣列
      requiresBooking: formData.get("requiresBooking") === "on",
      bookingLeadTime: formData.get("bookingLeadTime") ? parseInt(formData.get("bookingLeadTime") as string) : undefined,
      contactPerson: formData.get("contactPerson") as string || undefined,
      contactPhone: formData.get("contactPhone") as string || undefined,
      isAlwaysUnavailable,
      unavailableTimeSlots: timeSlots,
      notes: formData.get("notes") as string || undefined,
    };

    if (editingAttraction) {
      updateMutation.mutate({ id: editingAttraction.id, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("確定要刪除這個景點嗎？")) {
      deleteMutation.mutate({ id });
    }
  };

  if (isLoading) {
    return (
      <div className="container py-8">
        <div className="text-center">加載中...</div>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">景點資源管理</h1>
          <p className="text-muted-foreground mt-1">管理可參訪的景點和場館，設定容量限制與休館日</p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="mr-2 h-4 w-4" />
          添加景點
        </Button>
      </div>

      {attractions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            還沒有景點資源，點擊上方按鈕添加第一個景點
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {attractions.map((attraction: any) => {
            const slots = Array.isArray(attraction.unavailableTimeSlots) ? attraction.unavailableTimeSlots : [];
            const closedDays = parseClosedDays(attraction.closedDays);

            return (
              <Card key={attraction.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="flex items-center gap-2">
                        <MapPin className="h-5 w-5 text-primary flex-shrink-0" />
                        <span className="truncate">{attraction.name}</span>
                      </CardTitle>
                      {attraction.location && (
                        <CardDescription className="mt-1">{attraction.location}</CardDescription>
                      )}
                      {attraction.address && (
                        <CardDescription className="mt-1 text-xs">{attraction.address}</CardDescription>
                      )}
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(attraction)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(attraction.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {attraction.description && (
                    <p className="text-sm text-muted-foreground">{attraction.description}</p>
                  )}

                  {/* 容量資訊 */}
                  <div className="flex flex-wrap gap-2">
                    {attraction.capacity && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Users className="h-4 w-4" />
                        <span>一般容量 {attraction.capacity} 人</span>
                      </div>
                    )}
                    {attraction.maxCapacity && (
                      <div className="flex items-center gap-1 text-sm font-medium text-orange-600">
                        <AlertTriangle className="h-4 w-4" />
                        <span>最大承接 {attraction.maxCapacity} 人</span>
                      </div>
                    )}
                  </div>

                  {/* 休館日 */}
                  {closedDays.length > 0 && (
                    <div className="flex items-start gap-1">
                      <CalendarX className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                      <div className="flex flex-wrap gap-1">
                        {closedDays.map(d => (
                          <Badge key={d} variant="destructive" className="text-xs px-1.5 py-0">
                            {WEEKDAYS.find(w => w.value === d)?.label || `週${d}`}
                          </Badge>
                        ))}
                        <span className="text-xs text-muted-foreground self-center">休館</span>
                      </div>
                    </div>
                  )}

                  {/* 可用狀態 */}
                  {attraction.isAlwaysUnavailable ? (
                    <div className="flex items-center gap-2 text-sm text-destructive">
                      <Clock className="h-4 w-4" />
                      <span>全天不可用</span>
                    </div>
                  ) : slots.length > 0 ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>有 {slots.length} 個不可用時間段</span>
                    </div>
                  ) : closedDays.length === 0 ? (
                    <div className="flex items-center gap-2 text-sm text-green-600">
                      <Clock className="h-4 w-4" />
                      <span>全天可用</span>
                    </div>
                  ) : null}

                  {/* 聯絡人 */}
                  {attraction.contactPerson && (
                    <p className="text-xs text-muted-foreground">
                      對接：{attraction.contactPerson}
                      {attraction.contactPhone && ` · ${attraction.contactPhone}`}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* 新增/編輯對話框 */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingAttraction ? "編輯景點" : "添加景點"}</DialogTitle>
            <DialogDescription>填寫景點信息、容量限制和休館日設定</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 基本信息 */}
            <div className="space-y-2">
              <Label htmlFor="name">景點名稱 *</Label>
              <Input id="name" name="name" placeholder="例如：故宮博物院" defaultValue={editingAttraction?.name || ""} required />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="location">地點</Label>
                <Input id="location" name="location" placeholder="例如：台北市士林區" defaultValue={editingAttraction?.location || ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">詳細地址</Label>
                <Input id="address" name="address" placeholder="例如：至善路二段221號" defaultValue={editingAttraction?.address || ""} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">描述</Label>
              <Textarea id="description" name="description" placeholder="簡要描述景點特色" defaultValue={editingAttraction?.description || ""} rows={2} />
            </div>

            {/* 容量設定 */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="capacity">一般容量（人）</Label>
                <Input id="capacity" name="capacity" type="number" min="0" placeholder="例如：500" defaultValue={editingAttraction?.capacity || ""} />
                <p className="text-xs text-muted-foreground">場地最大容納人數</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxCapacity" className="flex items-center gap-1">
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                  最大承接量（人）
                </Label>
                <Input id="maxCapacity" name="maxCapacity" type="number" min="0" placeholder="例如：200" defaultValue={editingAttraction?.maxCapacity || ""} />
                <p className="text-xs text-muted-foreground">超過此人數將觸發超載警告</p>
              </div>
            </div>

            {/* 每週固定休館日 */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <CalendarX className="h-4 w-4 text-red-500" />
                每週固定休館日
              </Label>
              <p className="text-xs text-muted-foreground">勾選後，排程中安排到這些日期將顯示衝突警告</p>
              <div className="flex flex-wrap gap-2 pt-1">
                {WEEKDAYS.map(day => (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => toggleClosedDay(day.value)}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium border transition-colors ${
                      closedDayNums.includes(day.value)
                        ? "bg-red-100 border-red-400 text-red-700 dark:bg-red-900/30 dark:border-red-600 dark:text-red-400"
                        : "bg-background border-border text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
              {closedDayNums.length > 0 && (
                <p className="text-xs text-red-600">
                  已設定休館日：{closedDayNums.sort().map(d => WEEKDAYS.find(w => w.value === d)?.label).join("、")}
                </p>
              )}
            </div>

            {/* 全天不可用 */}
            <div className="flex items-center space-x-2">
              <Checkbox id="isAlwaysUnavailable" checked={isAlwaysUnavailable} onCheckedChange={(checked) => setIsAlwaysUnavailable(checked as boolean)} />
              <Label htmlFor="isAlwaysUnavailable">全天不可用（例如永久關閉的景點）</Label>
            </div>

            {/* 不可用時間段 */}
            {!isAlwaysUnavailable && (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label>特定不可用時間段</Label>
                  <Button type="button" variant="outline" size="sm" onClick={handleAddTimeSlot}>
                    <Plus className="mr-1 h-3 w-3" />
                    添加時間段
                  </Button>
                </div>
                {timeSlots.length === 0 ? (
                  <p className="text-sm text-muted-foreground">未設置不可用時間段</p>
                ) : (
                  <div className="space-y-2">
                    {timeSlots.map((slot, index) => (
                      <Card key={index}>
                        <CardContent className="pt-3 pb-3">
                          <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 items-end">
                            <div className="space-y-1">
                              <Label className="text-xs">星期</Label>
                              <Select value={slot.dayOfWeek.toString()} onValueChange={(value) => handleTimeSlotChange(index, "dayOfWeek", parseInt(value))}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {WEEKDAYS.map(day => (
                                    <SelectItem key={day.value} value={day.value.toString()}>{day.label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">開始</Label>
                              <Input type="time" value={slot.startTime} onChange={(e) => handleTimeSlotChange(index, "startTime", e.target.value)} />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">結束</Label>
                              <Input type="time" value={slot.endTime} onChange={(e) => handleTimeSlotChange(index, "endTime", e.target.value)} />
                            </div>
                            <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveTimeSlot(index)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 預約設定 */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="contactPerson">對接人姓名</Label>
                <Input id="contactPerson" name="contactPerson" placeholder="例如：李先生" defaultValue={editingAttraction?.contactPerson || ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactPhone">對接人電話</Label>
                <Input id="contactPhone" name="contactPhone" placeholder="例如：+852-1234-5678" defaultValue={editingAttraction?.contactPhone || ""} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">備註</Label>
              <Textarea id="notes" name="notes" placeholder="其他注意事項" defaultValue={editingAttraction?.notes || ""} rows={2} />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>取消</Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {editingAttraction ? "更新" : "創建"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
