import { useState } from "react";
import { format, startOfWeek, addDays, isSameDay } from "date-fns";
import { zhCN } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { toast } from "sonner";

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [draggedItem, setDraggedItem] = useState<any>(null);
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 }); // 週一開始

  // 獲取所有團組和行程
  const { data: groups } = trpc.groups.list.useQuery();
  const { data: allItineraries } = trpc.itineraries.listAll.useQuery();
  const utils = trpc.useUtils();

  // 更新行程時間
  const updateItinerary = trpc.itineraries.update.useMutation({
    onSuccess: () => {
      utils.itineraries.listAll.invalidate();
      toast.success("行程時間已更新");
    },
    onError: (error) => {
      toast.error(error.message || "更新失敗");
    },
  });

  // 生成一週的日期
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // 生成時間槽（7:00 - 22:00）
  const timeSlots = Array.from({ length: 16 }, (_, i) => i + 7);

  // 獲取指定日期和時間的行程
  const getItinerariesForDateTime = (date: Date, hour: number) => {
    if (!allItineraries) return [];
    
    return allItineraries.filter((item: any) => {
      const itemDate = new Date(item.date);
      if (!isSameDay(itemDate, date)) return false;
      
      // 使用 startTime 字段進行時間匹配
      if (!item.startTime) return false;
      const itemHour = parseInt(item.startTime.split(':')[0]);
      return itemHour === hour;
    });
  };

  // 獲取團組顏色
  const getGroupColor = (groupId: number) => {
    const colors = [
      'bg-blue-500',
      'bg-green-500',
      'bg-purple-500',
      'bg-orange-500',
      'bg-pink-500',
      'bg-teal-500',
      'bg-red-500',
      'bg-yellow-500',
    ];
    return colors[groupId % colors.length];
  };

  const goToPreviousWeek = () => {
    setCurrentDate(addDays(currentDate, -7));
  };

  const goToNextWeek = () => {
    setCurrentDate(addDays(currentDate, 7));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto py-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5" />
                日曆視圖
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={goToPreviousWeek}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={goToToday}>
                  今天
                </Button>
                <Button variant="outline" size="sm" onClick={goToNextWeek}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <span className="ml-4 font-medium">
                  {format(weekStart, "yyyy年MM月", { locale: zhCN })}
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-hidden">
              {/* 日曆表頭 */}
              <div className="grid grid-cols-8 bg-muted">
                <div className="p-3 border-r font-medium text-center">時間</div>
                {weekDays.map((day) => (
                  <div
                    key={day.toISOString()}
                    className={`p-3 border-r last:border-r-0 text-center ${
                      isSameDay(day, new Date()) ? 'bg-primary/10' : ''
                    }`}
                  >
                    <div className="font-medium">
                      {format(day, "EEE", { locale: zhCN })}
                    </div>
                    <div className={`text-sm ${isSameDay(day, new Date()) ? 'text-primary font-bold' : 'text-muted-foreground'}`}>
                      {format(day, "MM/dd")}
                    </div>
                  </div>
                ))}
              </div>

              {/* 日曆網格 */}
              <div className="max-h-[600px] overflow-y-auto">
                {timeSlots.map((hour) => (
                  <div key={hour} className="grid grid-cols-8 border-t">
                    <div className="p-2 border-r text-center text-sm text-muted-foreground bg-muted/50">
                      {hour}:00
                    </div>
                    {weekDays.map((day) => {
                      const itineraries = getItinerariesForDateTime(day, hour);
                      return (
                        <div
                          key={`${day.toISOString()}-${hour}`}
                          className="p-1 border-r last:border-r-0 min-h-[60px] hover:bg-muted/30 transition-colors"
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
                              const newStartTime = `${hour.toString().padStart(2, '0')}:00`;
                              const oldStartHour = draggedItem.startTime ? parseInt(draggedItem.startTime.split(':')[0]) : 0;
                              const oldEndHour = draggedItem.endTime ? parseInt(draggedItem.endTime.split(':')[0]) : oldStartHour + 1;
                              const duration = oldEndHour - oldStartHour;
                              const newEndTime = `${(hour + duration).toString().padStart(2, '0')}:00`;
                              
                              updateItinerary.mutate({
                                id: draggedItem.id,
                                startTime: newStartTime,
                                endTime: newEndTime,
                              });
                            }
                          }}
                        >
                          {itineraries.map((item: any) => {
                            const group = groups?.find((g: any) => g.id === item.groupId);
                            return (
                              <div
                                key={item.id}
                                draggable
                                onDragStart={(e) => {
                                  setDraggedItem(item);
                                  e.dataTransfer.effectAllowed = "move";
                                }}
                                onDragEnd={() => setDraggedItem(null)}
                                className={`${getGroupColor(item.groupId)} text-white text-xs p-1 rounded mb-1 cursor-move hover:opacity-80 transition-opacity ${draggedItem?.id === item.id ? 'opacity-50' : ''}`}
                                title={`${group?.name || '未知團組'} - ${item.locationName || '未指定地點'}`}
                              >
                                <div className="font-medium truncate">{group?.name}</div>
                                <div className="truncate">{item.locationName || '未指定地點'}</div>
                                {item.startTime && item.endTime && (
                                  <div className="text-[10px] opacity-80">{item.startTime}-{item.endTime}</div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            {/* 圖例 */}
            <div className="mt-4 flex flex-wrap gap-4">
              <div className="text-sm font-medium">團組圖例：</div>
              {groups?.slice(0, 8).map((group: any) => (
                <div key={group.id} className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded ${getGroupColor(group.id)}`}></div>
                  <span className="text-sm">{group.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
