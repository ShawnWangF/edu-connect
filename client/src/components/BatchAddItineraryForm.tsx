import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface ItineraryItem {
  startTime: string;
  endTime: string;
  locationId: number | null;
  description: string;
}

interface BatchAddItineraryFormProps {
  groupId: number;
  group: any;
  attractions: any[];
  batchCreateMutation: any;
  onClose: () => void;
}

export function BatchAddItineraryForm({
  groupId,
  group,
  attractions,
  batchCreateMutation,
  onClose,
}: BatchAddItineraryFormProps) {
  const [selectedDate, setSelectedDate] = useState(group.startDate);
  const [itineraryItems, setItineraryItems] = useState<ItineraryItem[]>([
    { startTime: "09:00", endTime: "12:00", locationId: null, description: "" },
  ]);

  const addItineraryItem = () => {
    setItineraryItems((prev) => [
      ...prev,
      { startTime: "09:00", endTime: "12:00", locationId: null, description: "" },
    ]);
  };

  const removeItineraryItem = (index: number) => {
    setItineraryItems((prev) => prev.filter((_, i) => i !== index));
  };

  const updateItineraryItem = (index: number, field: keyof ItineraryItem, value: any) => {
    setItineraryItems((prev) => {
      const newItems = [...prev];
      newItems[index] = { ...newItems[index], [field]: value };
      return newItems;
    });
  };

  const handleSubmit = () => {
    // 驗證所有行程點是否完整
    const invalidItems = itineraryItems.filter((item) => !item.locationId);
    if (invalidItems.length > 0) {
      toast.error("請為所有行程點選擇景點");
      return;
    }

    // 計算dayNumber
    const groupStart = new Date(group.startDate);
    const currentDate = new Date(selectedDate);
    const dayNumber =
      Math.floor((currentDate.getTime() - groupStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    // 準備批量創建的數據
    const itineraries = itineraryItems.map((item, index) => {
      const attraction = attractions.find((a: any) => a.id === item.locationId);
      return {
        date: selectedDate,
        dayNumber,
        startTime: item.startTime,
        endTime: item.endTime,
        locationId: item.locationId,
        locationName: attraction?.name || "",
        description: item.description || `${attraction?.name}參觀`,
        sortOrder: index,
      };
    });

    batchCreateMutation.mutate({
      groupId,
      itineraries,
    });
  };

  return (
    <div className="space-y-6">
      {/* 日期選擇 */}
      <div className="space-y-4">
        <div>
          <Label className="text-base font-semibold">1. 選擇日期</Label>
          <p className="text-sm text-muted-foreground mt-1">選擇要添加行程點的日期</p>
        </div>
        <Input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          min={group.startDate}
          max={group.endDate}
        />
      </div>

      {/* 行程點列表 */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-base font-semibold">2. 添加行程點</Label>
            <p className="text-sm text-muted-foreground mt-1">連續添加當日的所有行程點</p>
          </div>
          <Button onClick={addItineraryItem} variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-1" />
            添加更多
          </Button>
        </div>

        <div className="space-y-3 max-h-96 overflow-y-auto">
          {itineraryItems.map((item, index) => (
            <Card key={index}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">行程點 {index + 1}</span>
                  {itineraryItems.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeItineraryItem(index)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>開始時間</Label>
                    <Input
                      type="time"
                      value={item.startTime}
                      onChange={(e) => updateItineraryItem(index, "startTime", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>結束時間</Label>
                    <Input
                      type="time"
                      value={item.endTime}
                      onChange={(e) => updateItineraryItem(index, "endTime", e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>景點</Label>
                  <Select
                    value={item.locationId?.toString() || ""}
                    onValueChange={(value) =>
                      updateItineraryItem(index, "locationId", parseInt(value))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="選擇景點" />
                    </SelectTrigger>
                    <SelectContent>
                      {attractions.map((attraction: any) => (
                        <SelectItem key={attraction.id} value={attraction.id.toString()}>
                          {attraction.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>備註（可選）</Label>
                  <Input
                    placeholder="例如：參觀展覽、交流活動等"
                    value={item.description}
                    onChange={(e) => updateItineraryItem(index, "description", e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* 操作按鈕 */}
      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button variant="outline" onClick={onClose}>
          取消
        </Button>
        <Button onClick={handleSubmit} disabled={batchCreateMutation.isPending}>
          {batchCreateMutation.isPending
            ? "添加中..."
            : `確認添加 ${itineraryItems.length} 個行程點`}
        </Button>
      </div>
    </div>
  );
}
