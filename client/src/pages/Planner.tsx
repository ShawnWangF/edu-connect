import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, ChevronLeft, ChevronRight, AlertCircle } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { format, addDays, startOfWeek, endOfWeek, isSameDay } from "date-fns";
import { zhCN } from "date-fns/locale";
import { toast } from "sonner";

export default function Planner() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [draggedItem, setDraggedItem] = useState<any>(null);
  const [resizingItem, setResizingItem] = useState<any>(null);
  const [resizeMode, setResizeMode] = useState<'top' | 'bottom' | null>(null);
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });

  const { data: groups } = trpc.groups.list.useQuery();
  const { data: allItineraries } = trpc.itineraries.listAll.useQuery();
  const utils = trpc.useUtils();

  const updateItinerary = trpc.itineraries.update.useMutation({
    onSuccess: () => {
      utils.itineraries.listAll.invalidate();
      toast.success("行程已更新");
    },
    onError: (error) => {
      toast.error(error.message || "更新失敗");
    },
  });

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  
  // 生成24小時時段（00:00-23:00）
  const hours = Array.from({ length: 24 }, (_, i) => i);

  const goToPreviousWeek = () => setCurrentDate(addDays(currentDate, -7));
  const goToNextWeek = () => setCurrentDate(addDays(currentDate, 7));
  const goToToday = () => setCurrentDate(new Date());

  // 計算行程在時間軸上的位置和高度
  const calculatePosition = (startTime: string, endTime: string) => {
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime ? endTime.split(':').map(Number) : [startHour + 1, 0];
    
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    const duration = endMinutes - startMinutes;
    
    return {
      top: (startMinutes / 60) * 60, // 每小時60px
      height: Math.max((duration / 60) * 60, 30), // 最小30px
    };
  };

  // 獲取指定日期的行程
  const getItinerariesForDay = (day: Date) => {
    if (!allItineraries) return [];
    return allItineraries.filter((itinerary) => {
      const itineraryDate = itinerary.date instanceof Date ? itinerary.date : new Date(itinerary.date);
      return isSameDay(itineraryDate, day);
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
    "bg-yellow-100 text-yellow-700 border-yellow-300",
    "bg-red-100 text-red-700 border-red-300",
    "bg-indigo-100 text-indigo-700 border-indigo-300",
  ];

  groups?.forEach((group, index) => {
    groupColors[group.id] = colorPalette[index % colorPalette.length];
  });

  // 處理拖拽開始
  const handleDragStart = (e: React.DragEvent, item: any) => {
    setDraggedItem(item);
    e.dataTransfer.effectAllowed = 'move';
  };

  // 處理拖拽放置
  const handleDrop = (e: React.DragEvent, day: Date, hour: number) => {
    e.preventDefault();
    if (!draggedItem) return;

    const newDate = format(day, 'yyyy-MM-dd');
    const newStartTime = `${hour.toString().padStart(2, '0')}:00`;
    
    // 計算結束時間（保持原有時長）
    const [oldStartHour, oldStartMin] = draggedItem.startTime.split(':').map(Number);
    const [oldEndHour, oldEndMin] = draggedItem.endTime ? draggedItem.endTime.split(':').map(Number) : [oldStartHour + 1, 0];
    const duration = (oldEndHour * 60 + oldEndMin) - (oldStartHour * 60 + oldStartMin);
    const newEndMinutes = hour * 60 + duration;
    const newEndTime = `${Math.floor(newEndMinutes / 60).toString().padStart(2, '0')}:${(newEndMinutes % 60).toString().padStart(2, '0')}`;

    updateItinerary.mutate({
      id: draggedItem.id,
      startTime: newStartTime,
      endTime: newEndTime,
    });

    setDraggedItem(null);
  };

  // 處理調整大小（拖拽邊緣）
  const handleResizeStart = (e: React.MouseEvent, item: any, mode: 'top' | 'bottom') => {
    e.stopPropagation();
    e.preventDefault();
    setResizingItem(item);
    setResizeMode(mode);
  };

  useEffect(() => {
    if (!resizingItem || !resizeMode) return;

    const handleMouseMove = (e: MouseEvent) => {
      const container = document.getElementById('planner-grid');
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const hour = Math.floor(y / 60);
      const minutes = Math.round(((y % 60) / 60) * 60);

      const [startHour, startMin] = resizingItem.startTime.split(':').map(Number);
      const [endHour, endMin] = resizingItem.endTime ? resizingItem.endTime.split(':').map(Number) : [startHour + 1, 0];

      let newStartTime = resizingItem.startTime;
      let newEndTime = resizingItem.endTime;

      if (resizeMode === 'top') {
        // 調整開始時間
        const newStartMinutes = Math.max(0, Math.min(hour * 60 + minutes, endHour * 60 + endMin - 30));
        newStartTime = `${Math.floor(newStartMinutes / 60).toString().padStart(2, '0')}:${(newStartMinutes % 60).toString().padStart(2, '0')}`;
      } else {
        // 調整結束時間
        const newEndMinutes = Math.max(startHour * 60 + startMin + 30, Math.min((hour * 60 + minutes), 24 * 60));
        newEndTime = `${Math.floor(newEndMinutes / 60).toString().padStart(2, '0')}:${(newEndMinutes % 60).toString().padStart(2, '0')}`;
      }

      // 實時更新UI（通過重新設置resizingItem觸發重渲染）
      setResizingItem({ ...resizingItem, startTime: newStartTime, endTime: newEndTime });
    };

    const handleMouseUp = () => {
      if (resizingItem) {
        updateItinerary.mutate({
          id: resizingItem.id,
          startTime: resizingItem.startTime,
          endTime: resizingItem.endTime,
        });
      }
      setResizingItem(null);
      setResizeMode(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizingItem, resizeMode]);

  // 獲取本週關注事項
  const thisWeekItineraries = allItineraries?.filter((item: any) => {
    const itemDate = new Date(item.date);
    return itemDate >= weekStart && itemDate <= weekEnd;
  }) || [];

  const upcomingItems = thisWeekItineraries
    .filter((item: any) => {
      const itemDate = new Date(item.date);
      return itemDate >= new Date();
    })
    .sort((a: any, b: any) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return dateA.getTime() - dateB.getTime();
    })
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              行程設計器
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
            {/* 表頭 */}
            <div className="grid grid-cols-8 bg-muted border-b">
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

            {/* 時間網格 */}
            <div className="relative max-h-[600px] overflow-y-auto" id="planner-grid">
              <div className="grid grid-cols-8">
                {/* 時間列 */}
                <div className="border-r">
                  {hours.map((hour) => (
                    <div
                      key={hour}
                      className="h-[60px] border-b p-2 text-center text-sm text-muted-foreground bg-muted/50"
                    >
                      {hour.toString().padStart(2, '0')}:00
                    </div>
                  ))}
                </div>

                {/* 日期列 */}
                {weekDays.map((day) => (
                  <div key={day.toISOString()} className="border-r last:border-r-0 relative">
                    {/* 時間槽背景 */}
                    {hours.map((hour) => (
                      <div
                        key={hour}
                        className="h-[60px] border-b hover:bg-muted/30 transition-colors"
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.currentTarget.classList.add('bg-primary/10');
                        }}
                        onDragLeave={(e) => {
                          e.currentTarget.classList.remove('bg-primary/10');
                        }}
                        onDrop={(e) => {
                          e.currentTarget.classList.remove('bg-primary/10');
                          handleDrop(e, day, hour);
                        }}
                      />
                    ))}

                    {/* 行程卡片（絕對定位） */}
                    <div className="absolute top-0 left-0 right-0 pointer-events-none">
                      {getItinerariesForDay(day).map((item: any) => {
                        const displayItem = resizingItem?.id === item.id ? resizingItem : item;
                        const position = calculatePosition(
                          displayItem.startTime || '09:00',
                          displayItem.endTime || '10:00'
                        );
                        const group = groups?.find((g) => g.id === item.groupId);
                        const colorClass = groupColors[item.groupId] || colorPalette[0];

                        return (
                          <div
                            key={item.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, item)}
                            className={`absolute left-1 right-1 border-l-4 rounded p-2 text-xs cursor-move pointer-events-auto ${colorClass} ${
                              draggedItem?.id === item.id ? 'opacity-50' : ''
                            }`}
                            style={{
                              top: `${position.top}px`,
                              height: `${position.height}px`,
                            }}
                          >
                            {/* 頂部調整手柄 */}
                            <div
                              className="absolute top-0 left-0 right-0 h-2 cursor-ns-resize hover:bg-black/10"
                              onMouseDown={(e) => handleResizeStart(e, item, 'top')}
                            />

                            {/* 內容 */}
                            <div className="font-medium truncate">{item.locationName || '未命名'}</div>
                            <div className="text-xs opacity-75">
                              {item.startTime} - {item.endTime || '未設定'}
                            </div>
                            {group && (
                              <div className="text-xs opacity-75 truncate">{group.name}</div>
                            )}

                            {/* 底部調整手柄 */}
                            <div
                              className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize hover:bg-black/10"
                              onMouseDown={(e) => handleResizeStart(e, item, 'bottom')}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 本週關注事項 */}
      {upcomingItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              本週關注事項
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upcomingItems.map((item: any) => {
                const group = groups?.find((g) => g.id === item.groupId);
                const itemDate = new Date(item.date);
                return (
                  <div
                    key={item.id}
                    className="flex items-start gap-3 p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{item.locationName || '未指定地點'}</p>
                      <p className="text-sm text-muted-foreground">
                        {group?.name || '未知團組'} · {format(itemDate, 'MM月dd日 EEE', { locale: zhCN })}
                        {item.startTime && ` · ${item.startTime}`}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
