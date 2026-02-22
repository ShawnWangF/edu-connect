import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";

interface ItineraryItem {
  id: string;
  startTime: string;
  endTime: string;
  locationName: string;
  contactPerson: string;
  description: string;
  notes: string;
}

interface BatchAddItineraryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupStartDate: string;
  groupEndDate: string;
  onSubmit: (date: string, items: Omit<ItineraryItem, 'id'>[]) => void;
  isPending: boolean;
}

export function BatchAddItineraryDialog({
  open,
  onOpenChange,
  groupStartDate,
  groupEndDate,
  onSubmit,
  isPending,
}: BatchAddItineraryDialogProps) {
  const [selectedDate, setSelectedDate] = useState<string>(groupStartDate);
  const [items, setItems] = useState<ItineraryItem[]>([
    {
      id: crypto.randomUUID(),
      startTime: "",
      endTime: "",
      locationName: "",
      contactPerson: "",
      description: "",
      notes: "",
    },
  ]);

  const calculateDayNumber = (date: string) => {
    const selected = new Date(date);
    const start = new Date(groupStartDate);
    return Math.floor((selected.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  };

  const addItem = () => {
    setItems([
      ...items,
      {
        id: crypto.randomUUID(),
        startTime: "",
        endTime: "",
        locationName: "",
        contactPerson: "",
        description: "",
        notes: "",
      },
    ]);
  };

  const removeItem = (id: string) => {
    if (items.length === 1) return; // 至少保留一個
    setItems(items.filter((item) => item.id !== id));
  };

  const updateItem = (id: string, field: keyof Omit<ItineraryItem, 'id'>, value: string) => {
    setItems(items.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validItems = items.filter((item) => item.locationName.trim() !== "");
    if (validItems.length === 0) {
      return;
    }
    onSubmit(
      selectedDate,
      validItems.map(({ id, ...rest }) => rest)
    );
    // 重置表單
    setItems([
      {
        id: crypto.randomUUID(),
        startTime: "",
        endTime: "",
        locationName: "",
        contactPerson: "",
        description: "",
        notes: "",
      },
    ]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>批量添加行程點</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 日期選擇 */}
          <div className="space-y-2 pb-4 border-b">
            <Label htmlFor="date">選擇日期 *</Label>
            <Input
              id="date"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              min={groupStartDate}
              max={groupEndDate}
              required
            />
            <p className="text-sm text-muted-foreground">
              團組日期範圍：{format(new Date(groupStartDate), "yyyy-MM-dd")} 至{" "}
              {format(new Date(groupEndDate), "yyyy-MM-dd")} ·{" "}
              <span className="font-semibold text-primary">
                第 {calculateDayNumber(selectedDate)} 天
              </span>
            </p>
          </div>

          {/* 行程點列表 */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">行程點列表</h3>
              <Button type="button" onClick={addItem} size="sm" variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                添加行程點
              </Button>
            </div>

            {items.map((item, index) => (
              <div
                key={item.id}
                className="p-4 border rounded-lg space-y-4 relative bg-card"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-muted-foreground">
                    行程點 #{index + 1}
                  </span>
                  {items.length > 1 && (
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive"
                      onClick={() => removeItem(item.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>開始時間</Label>
                    <Input
                      type="time"
                      value={item.startTime}
                      onChange={(e) => updateItem(item.id, "startTime", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>結束時間</Label>
                    <Input
                      type="time"
                      value={item.endTime}
                      onChange={(e) => updateItem(item.id, "endTime", e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>地點名稱 *</Label>
                  <Input
                    value={item.locationName}
                    onChange={(e) => updateItem(item.id, "locationName", e.target.value)}
                    placeholder="例：香港海洋公園"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>對接人</Label>
                  <Input
                    value={item.contactPerson}
                    onChange={(e) => updateItem(item.id, "contactPerson", e.target.value)}
                    placeholder="例：陳主任、黃經理wechat"
                  />
                </div>

                <div className="space-y-2">
                  <Label>活動描述</Label>
                  <Textarea
                    value={item.description}
                    onChange={(e) => updateItem(item.id, "description", e.target.value)}
                    rows={2}
                    placeholder="簡要描述活動內容"
                  />
                </div>

                <div className="space-y-2">
                  <Label>備註</Label>
                  <Textarea
                    value={item.notes}
                    onChange={(e) => updateItem(item.id, "notes", e.target.value)}
                    rows={2}
                    placeholder="其他需要注意的事項"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* 提交按鈕 */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "保存中..." : `保存 ${items.filter(i => i.locationName.trim()).length} 個行程點`}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
