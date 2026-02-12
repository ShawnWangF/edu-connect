import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, ChevronLeft, ChevronRight, Plus, AlertCircle } from "lucide-react";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { format, addDays, startOfWeek, endOfWeek, isSameDay, parseISO } from "date-fns";
import { zhCN } from "date-fns/locale";
import { toast } from "sonner";

export default function Planner() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [draggedItem, setDraggedItem] = useState<any>(null);
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 }); // 週一開始
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });

  const { data: groups } = trpc.groups.list.useQuery();
  const { data: allItineraries } = trpc.itineraries.listAll.useQuery();
  const utils = trpc.useUtils();

  // 更新行程時間
  const updateItinerary = trpc.itineraries.update.useMutation({
    onSuccess: () => {
      utils.itineraries.listAll.invalidate();
      toast.success("行程已移動");
    },
    onError: (error) => {
      toast.error(error.message || "移動失敗");
    },
  });

  // 生成本週的日期
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const goToPreviousWeek = () => {
    setCurrentDate(addDays(currentDate, -7));
  };

  const goToNextWeek = () => {
    setCurrentDate(addDays(currentDate, 7));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // 動態時段定義（根據實際行程時間生成）
  const getTimePeriods = () => {
    const periods = [
      { id: "early_morning", label: "早晨", time: "00:00-06:59", startHour: 0, endHour: 7 },
      { id: "morning", label: "上午", time: "07:00-11:59", startHour: 7, endHour: 12 },
      { id: "afternoon", label: "下午", time: "12:00-17:59", startHour: 12, endHour: 18 },
      { id: "evening", label: "晚上", time: "18:00-23:59", startHour: 18, endHour: 24 },
    ];
    
    // 檢查是否有行程在每個時段
    return periods.filter(period => {
      if (!allItineraries) return false;
      return allItineraries.some(itinerary => {
        const hour = itinerary.startTime ? parseInt(itinerary.startTime.split(":")[0]) : null;
        if (hour === null) return false;
        return hour >= period.startHour && hour < period.endHour;
      });
    });
  };

  const timePeriods = getTimePeriods();

  // 根據時間判斷行程屬於哪個時段
  const getTimePeriod = (time: string | null) => {
    if (!time) return null;
    const hour = parseInt(time.split(":")[0]);
    for (const period of timePeriods) {
      if (hour >= period.startHour && hour < period.endHour) {
        return period.id;
      }
    }
    return null;
  };

  // 獲取指定日期和時段的行程
  const getItinerariesForDayAndPeriod = (day: Date, periodId: string) => {
    if (!allItineraries) return [];
    
    return allItineraries.filter((itinerary) => {
      const itineraryDate = itinerary.date instanceof Date ? itinerary.date : new Date(itinerary.date);
      const matchesDay = isSameDay(itineraryDate, day);
      const matchesPeriod = getTimePeriod(itinerary.startTime) === periodId;
      return matchesDay && matchesPeriod;
    });
  };

  // 團組顏色映射
  const groupColors: Record<number, string> = {};
  const colorPalette = [
    "bg-blue-100 text-blue-700 border-blue-300",
    "bg-green-100 text-green-700 border-green-300",
    "bg-purple-100 text-purple-700 border-purple-300",
    "bg-orange-100 text-orange-700 border-orange-300",
    "bg-pink-100 text-pink-700 border-pink-300",
    "bg-cyan-100 text-cyan-700 border-cyan-300",
  ];

  // 為每個團組分配顏色
  if (groups) {
    groups.forEach((group, index) => {
      if (!groupColors[group.id]) {
        groupColors[group.id] = colorPalette[index % colorPalette.length];
      }
    });
  }

  // 獲取團組名稱
  const getGroupName = (groupId: number) => {
    return groups?.find((g) => g.id === groupId)?.name || "未知團組";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">行程設計器</h1>
          <p className="text-muted-foreground mt-1">週視圖統籌多團組行程安排</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={goToPreviousWeek}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={goToToday}>
            今天
          </Button>
          <Button variant="outline" onClick={goToNextWeek}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {format(weekStart, "yyyy年MM月dd日", { locale: zhCN })} -{" "}
            {format(weekEnd, "MM月dd日", { locale: zhCN })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="border p-2 bg-muted/50 w-32">時段</th>
                  {weekDays.map((day) => (
                    <th key={day.toISOString()} className="border p-2 bg-muted/50 min-w-[150px]">
                      <div className="text-center">
                        <div className="font-medium">
                          {format(day, "MM-dd", { locale: zhCN })}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {format(day, "EEEE", { locale: zhCN })}
                        </div>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {timePeriods.map((period) => (
                  <tr key={period.id}>
                    <td className="border p-2 bg-muted/30">
                      <div className="text-sm font-medium">{period.label}</div>
                      <div className="text-xs text-muted-foreground">{period.time}</div>
                    </td>
                    {weekDays.map((day) => {
                      const itineraries = getItinerariesForDayAndPeriod(day, period.id);
                      return (
                        <td
                          key={`${period.id}-${day.toISOString()}`}
                          className="border p-2 min-h-[120px] align-top hover:bg-accent/30 transition-colors"
                          onDragOver={(e) => {
                            e.preventDefault();
                            e.currentTarget.classList.add('bg-primary/10');
                          }}
                          onDragLeave={(e) => {
                            e.currentTarget.classList.remove('bg-primary/10');
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            e.currentTarget.classList.remove('bg-primary/10');
                            if (draggedItem) {
                              // 計算新的時間基於時段
                              const newStartHour = period.startHour;
                              const newStartTime = `${newStartHour.toString().padStart(2, '0')}:00`;
                              const oldStartHour = draggedItem.startTime ? parseInt(draggedItem.startTime.split(':')[0]) : 0;
                              const oldEndHour = draggedItem.endTime ? parseInt(draggedItem.endTime.split(':')[0]) : oldStartHour + 1;
                              const duration = oldEndHour - oldStartHour;
                              const newEndTime = `${(newStartHour + duration).toString().padStart(2, '0')}:00`;
                              
                              updateItinerary.mutate({
                                id: draggedItem.id,
                                startTime: newStartTime,
                                endTime: newEndTime,
                              });
                            }
                          }}
                        >
                          {itineraries.length > 0 ? (
                            <div className="space-y-1">
                              {itineraries.map((itinerary) => (
                                <div
                                  key={itinerary.id}
                                  draggable
                                  onDragStart={(e) => {
                                    setDraggedItem(itinerary);
                                    e.dataTransfer.effectAllowed = "move";
                                  }}
                                  onDragEnd={() => setDraggedItem(null)}
                                  className={`p-2 rounded border text-xs cursor-move ${groupColors[itinerary.groupId] || "bg-gray-100 text-gray-700 border-gray-300"} ${draggedItem?.id === itinerary.id ? 'opacity-50' : ''}`}
                                >
                                  <div className="font-medium truncate">{itinerary.locationName || "未命名地點"}</div>
                                  <div className="text-xs opacity-80 truncate">
                                    {getGroupName(itinerary.groupId)}
                                  </div>
                                  <div className="text-xs opacity-70">{itinerary.startTime || "未設定時間"}</div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-xs text-muted-foreground text-center py-6 opacity-50">
                              暫無行程
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>進行中的團組</CardTitle>
          </CardHeader>
          <CardContent>
            {groups && groups.filter((g) => g.status === "ongoing").length > 0 ? (
              <div className="space-y-2">
                {groups
                  .filter((g) => g.status === "ongoing")
                  .map((group) => (
                    <div
                      key={group.id}
                      className={`p-3 border rounded-lg transition-colors ${groupColors[group.id]}`}
                    >
                      <p className="font-medium">{group.name}</p>
                      <p className="text-sm opacity-80">
                        {format(new Date(group.startDate), "MM-dd")} 至{" "}
                        {format(new Date(group.endDate), "MM-dd")} · {group.totalCount} 人
                      </p>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">暫無進行中的團組</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>本週關注事項</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {groups && groups.filter((g) => {
                const start = new Date(g.startDate);
                const end = new Date(g.endDate);
                return (start >= weekStart && start <= weekEnd) || 
                       (end >= weekStart && end <= weekEnd) ||
                       (start <= weekStart && end >= weekEnd);
              }).length > 0 ? (
                <div className="space-y-2">
                  {groups
                    .filter((g) => {
                      const start = new Date(g.startDate);
                      const end = new Date(g.endDate);
                      return (start >= weekStart && start <= weekEnd) || 
                             (end >= weekStart && end <= weekEnd) ||
                             (start <= weekStart && end >= weekEnd);
                    })
                    .map((group) => (
                      <div key={group.id} className="p-3 border-l-4 border-blue-500 bg-blue-50 dark:bg-blue-950/20">
                        <p className="text-sm font-medium">{group.name}</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {format(new Date(group.startDate), "MM月dd日")} 出發 · {group.totalCount} 人
                        </p>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="p-3 border rounded-lg">
                  <p className="text-sm text-muted-foreground text-center py-4">
                    本週暫無需要關注的團組
                  </p>
                </div>
              )}
              
              <div className="p-3 border-l-4 border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">使用提示</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      • 不同顏色代表不同團組<br />
                      • 行程按時段（上午/下午/晚上）劃分<br />
                      • 點擊團組詳情可查看完整行程
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
