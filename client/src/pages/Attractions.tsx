import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { MapPin, Edit, Trash2, Plus, Clock, Users } from "lucide-react";

type TimeSlot = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
};

const WEEKDAYS = [
  { value: 0, label: "週日" },
  { value: 1, label: "週一" },
  { value: 2, label: "週二" },
  { value: 3, label: "週三" },
  { value: 4, label: "週四" },
  { value: 5, label: "週五" },
  { value: 6, label: "週六" },
];

export default function Attractions() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAttraction, setEditingAttraction] = useState<any>(null);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [isAlwaysUnavailable, setIsAlwaysUnavailable] = useState(false);

  const utils = trpc.useUtils();
  const { data: attractions = [], isLoading } = trpc.attractions.list.useQuery();

  const createMutation = trpc.attractions.create.useMutation({
    onSuccess: () => {
      toast.success("景點創建成功");
      utils.attractions.list.invalidate();
      handleCloseDialog();
    },
    onError: (error) => {
      toast.error(`創建失敗：${error.message}`);
    },
  });

  const updateMutation = trpc.attractions.update.useMutation({
    onSuccess: () => {
      toast.success("景點更新成功");
      utils.attractions.list.invalidate();
      handleCloseDialog();
    },
    onError: (error) => {
      toast.error(`更新失敗：${error.message}`);
    },
  });

  const deleteMutation = trpc.attractions.delete.useMutation({
    onSuccess: () => {
      toast.success("景點刪除成功");
      utils.attractions.list.invalidate();
    },
    onError: (error) => {
      toast.error(`刪除失敗：${error.message}`);
    },
  });

  const handleOpenDialog = (attraction?: any) => {
    if (attraction) {
      setEditingAttraction(attraction);
      setIsAlwaysUnavailable(attraction.isAlwaysUnavailable || false);
      setTimeSlots(
        Array.isArray(attraction.unavailableTimeSlots) ? attraction.unavailableTimeSlots : []
      );
    } else {
      setEditingAttraction(null);
      setIsAlwaysUnavailable(false);
      setTimeSlots([]);
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingAttraction(null);
    setTimeSlots([]);
    setIsAlwaysUnavailable(false);
  };

  const handleAddTimeSlot = () => {
    setTimeSlots([
      ...timeSlots,
      {
        dayOfWeek: 1,
        startTime: "09:00",
        endTime: "17:00",
      },
    ]);
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
      location: formData.get("location") as string,
      address: formData.get("address") as string,
      description: formData.get("description") as string,
      capacity: formData.get("capacity") ? parseInt(formData.get("capacity") as string) : undefined,
      isAlwaysUnavailable,
      unavailableTimeSlots: timeSlots,
      notes: formData.get("notes") as string,
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
          <p className="text-muted-foreground mt-1">管理可參訪的景點和場館</p>
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
            const slots = Array.isArray(attraction.unavailableTimeSlots)
              ? attraction.unavailableTimeSlots
              : [];
            
            return (
              <Card key={attraction.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2">
                        <MapPin className="h-5 w-5 text-primary" />
                        {attraction.name}
                      </CardTitle>
                      {attraction.location && (
                        <CardDescription className="mt-1">{attraction.location}</CardDescription>
                      )}
                      {attraction.address && (
                        <CardDescription className="mt-1 text-xs">{attraction.address}</CardDescription>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(attraction)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(attraction.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {attraction.description && (
                    <p className="text-sm text-muted-foreground mb-3">{attraction.description}</p>
                  )}
                  
                  {attraction.capacity && (
                    <div className="flex items-center gap-2 text-sm mb-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span>可容納 {attraction.capacity} 人</span>
                    </div>
                  )}

                  {attraction.isAlwaysUnavailable ? (
                    <div className="flex items-center gap-2 text-sm text-destructive">
                      <Clock className="h-4 w-4" />
                      <span>全天不可用</span>
                    </div>
                  ) : slots.length > 0 ? (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>不可用時間：{slots.length} 個時間段</span>
                      </div>
                      {slots.slice(0, 2).map((slot: TimeSlot, idx: number) => (
                        <div key={idx} className="text-xs text-muted-foreground ml-6">
                          {WEEKDAYS.find((d) => d.value === slot.dayOfWeek)?.label}{" "}
                          {slot.startTime}-{slot.endTime}
                        </div>
                      ))}
                      {slots.length > 2 && (
                        <div className="text-xs text-muted-foreground ml-6">
                          還有 {slots.length - 2} 個時間段...
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-sm text-green-600">
                      <Clock className="h-4 w-4" />
                      <span>全天可用</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingAttraction ? "編輯景點" : "添加景點"}</DialogTitle>
            <DialogDescription>填寫景點信息和不可用時間段</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">景點名稱 *</Label>
              <Input
                id="name"
                name="name"
                placeholder="例如：故宮博物院"
                defaultValue={editingAttraction?.name || ""}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">地點</Label>
              <Input
                id="location"
                name="location"
                placeholder="例如：台北市士林區"
                defaultValue={editingAttraction?.location || ""}
              />
              <p className="text-xs text-muted-foreground">用於Google Maps搜索</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">詳細地址</Label>
              <Input
                id="address"
                name="address"
                placeholder="例如：台北市士林區至善路二段221號"
                defaultValue={editingAttraction?.address || ""}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">描述</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="簡要描述景點特色"
                defaultValue={editingAttraction?.description || ""}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="capacity">可容納人數</Label>
              <Input
                id="capacity"
                name="capacity"
                type="number"
                placeholder="例如：100"
                defaultValue={editingAttraction?.capacity || ""}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="isAlwaysUnavailable"
                checked={isAlwaysUnavailable}
                onCheckedChange={(checked) => setIsAlwaysUnavailable(checked as boolean)}
              />
              <Label htmlFor="isAlwaysUnavailable">全天不可用（例如永久關閉的景點）</Label>
            </div>

            {!isAlwaysUnavailable && (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label>不可用時間段</Label>
                  <Button type="button" variant="outline" size="sm" onClick={handleAddTimeSlot}>
                    <Plus className="mr-1 h-3 w-3" />
                    添加時間段
                  </Button>
                </div>

                {timeSlots.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    未設置不可用時間段，景點將全天可用
                  </p>
                ) : (
                  <div className="space-y-3">
                    {timeSlots.map((slot, index) => (
                      <Card key={index}>
                        <CardContent className="pt-4">
                          <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 items-end">
                            <div className="space-y-1">
                              <Label className="text-xs">星期</Label>
                              <Select
                                value={slot.dayOfWeek.toString()}
                                onValueChange={(value) =>
                                  handleTimeSlotChange(index, "dayOfWeek", parseInt(value))
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {WEEKDAYS.map((day) => (
                                    <SelectItem key={day.value} value={day.value.toString()}>
                                      {day.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-1">
                              <Label className="text-xs">開始時間</Label>
                              <Input
                                type="time"
                                value={slot.startTime}
                                onChange={(e) =>
                                  handleTimeSlotChange(index, "startTime", e.target.value)
                                }
                              />
                            </div>

                            <div className="space-y-1">
                              <Label className="text-xs">結束時間</Label>
                              <Input
                                type="time"
                                value={slot.endTime}
                                onChange={(e) =>
                                  handleTimeSlotChange(index, "endTime", e.target.value)
                                }
                              />
                            </div>

                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveTimeSlot(index)}
                            >
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

            <div className="space-y-2">
              <Label htmlFor="notes">備註</Label>
              <Textarea
                id="notes"
                name="notes"
                placeholder="其他注意事項"
                defaultValue={editingAttraction?.notes || ""}
                rows={2}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                取消
              </Button>
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
