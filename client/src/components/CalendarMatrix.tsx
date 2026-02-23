import { useMemo, useState, useRef } from 'react';
import { trpc } from '../lib/trpc';
import { AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface Group {
  id: number;
  name: string;
  code: string;
  startDate: string | Date;
  endDate: string | Date;
  color?: string | null;
}

interface CalendarMatrixProps {
  projectStartDate: string | Date;
  projectEndDate: string | Date;
  groups: Group[];
}

interface Itinerary {
  id: number;
  groupId: number;
  date: string | Date;
  startTime: string | null;
  endTime: string | null;
  locationName: string | null;
  description?: string | null;
  notes?: string | null;
}

export function CalendarMatrix({ projectStartDate, projectEndDate, groups }: CalendarMatrixProps) {
  const [draggedItem, setDraggedItem] = useState<Itinerary | null>(null);
  const [resizingItem, setResizingItem] = useState<{ itinerary: Itinerary; edge: 'top' | 'bottom' } | null>(null);
  const utils = trpc.useUtils();

  // 獲取所有團組的行程點
  const itinerariesQueries = groups.map((group) =>
    trpc.itineraries.listByGroup.useQuery({ groupId: group.id })
  );

  // 更新行程
  const updateItinerary = trpc.itineraries.update.useMutation({
    onSuccess: () => {
      groups.forEach((group) => {
        utils.itineraries.listByGroup.invalidate({ groupId: group.id });
      });
      toast.success("行程已更新");
    },
    onError: (error) => {
      toast.error(error.message || "更新失敗");
    },
  });

  const allItineraries = useMemo(() => {
    const result: Itinerary[] = [];
    itinerariesQueries.forEach((query) => {
      if (query.data) {
        result.push(...query.data);
      }
    });
    return result;
  }, [itinerariesQueries]);

  // 生成日期列表
  const dates = useMemo(() => {
    const start = new Date(projectStartDate);
    const end = new Date(projectEndDate);
    const dateList: Date[] = [];
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dateList.push(new Date(d));
    }
    
    return dateList;
  }, [projectStartDate, projectEndDate]);

  // 時間軸配置：8:00 - 22:00，每小時一個刻度
  const TIME_START = 8;
  const TIME_END = 22;
  const HOUR_HEIGHT = 40; // 每小時的像素高度

  // 將時間字符串轉換為小時數（支持小數）
  const timeToHours = (timeStr: string | null): number => {
    if (!timeStr) return TIME_START;
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours + minutes / 60;
  };

  // 將小時數轉換為時間字符串
  const hoursToTime = (hours: number): string => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  // 計算行程卡片的位置和高度
  const getItineraryStyle = (itinerary: Itinerary) => {
    const startHours = timeToHours(itinerary.startTime);
    const endHours = timeToHours(itinerary.endTime);
    const top = (startHours - TIME_START) * HOUR_HEIGHT;
    const height = (endHours - startHours) * HOUR_HEIGHT;
    return { top, height };
  };

  // 檢測資源衝突
  const detectConflicts = (date: Date, location: string, time: string) => {
    const dateStr = date.toISOString().split('T')[0];
    const conflicts = allItineraries.filter((itinerary) => {
      const itineraryDateStr = new Date(itinerary.date).toISOString().split('T')[0];
      return (
        itineraryDateStr === dateStr &&
        itinerary.locationName === location &&
        itinerary.startTime === time
      );
    });
    return conflicts.length > 1;
  };

  // 獲取某個團組在某一天的行程點
  const getItinerariesForGroupAndDate = (groupId: number, date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return allItineraries.filter((itinerary) => {
      const itineraryDateStr = new Date(itinerary.date).toISOString().split('T')[0];
      return itinerary.groupId === groupId && itineraryDateStr === dateStr;
    });
  };

  // 處理拖拽移動
  const handleDrop = (e: React.DragEvent, date: Date, isInRange: boolean) => {
    e.preventDefault();
    if (!draggedItem || !isInRange) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const hours = TIME_START + y / HOUR_HEIGHT;
    const startHours = Math.max(TIME_START, Math.min(TIME_END - 0.5, hours));
    
    const oldStart = timeToHours(draggedItem.startTime);
    const oldEnd = timeToHours(draggedItem.endTime);
    const duration = oldEnd - oldStart;
    const endHours = Math.min(TIME_END, startHours + duration);

    const newDate = date.toISOString().split('T')[0];
    updateItinerary.mutate({
      id: draggedItem.id,
      date: newDate,
      startTime: hoursToTime(startHours),
      endTime: hoursToTime(endHours),
    });
  };

  // 處理拉伸調整時間
  const handleResize = (e: React.MouseEvent, itinerary: Itinerary, edge: 'top' | 'bottom') => {
    e.stopPropagation();
    setResizingItem({ itinerary, edge });

    const startY = e.clientY;
    const startTime = timeToHours(itinerary.startTime);
    const endTime = timeToHours(itinerary.endTime);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaY = moveEvent.clientY - startY;
      const deltaHours = deltaY / HOUR_HEIGHT;

      let newStartTime = startTime;
      let newEndTime = endTime;

      if (edge === 'top') {
        newStartTime = Math.max(TIME_START, Math.min(endTime - 0.5, startTime + deltaHours));
      } else {
        newEndTime = Math.max(startTime + 0.5, Math.min(TIME_END, endTime + deltaHours));
      }

      // 實時更新（可選）
      // 為了性能，這裡只在鬆開鼠標時更新
    };

    const handleMouseUp = (upEvent: MouseEvent) => {
      const deltaY = upEvent.clientY - startY;
      const deltaHours = deltaY / HOUR_HEIGHT;

      let newStartTime = startTime;
      let newEndTime = endTime;

      if (edge === 'top') {
        newStartTime = Math.max(TIME_START, Math.min(endTime - 0.5, startTime + deltaHours));
      } else {
        newEndTime = Math.max(startTime + 0.5, Math.min(TIME_END, endTime + deltaHours));
      }

      updateItinerary.mutate({
        id: itinerary.id,
        startTime: hoursToTime(newStartTime),
        endTime: hoursToTime(newEndTime),
      });

      setResizingItem(null);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="sticky left-0 z-20 bg-background border border-border p-2 min-w-[150px] text-left font-semibold">
              團組
            </th>
            {dates.map((date, index) => (
              <th
                key={index}
                className="border border-border p-2 min-w-[160px] text-center bg-muted/50"
              >
                <div className="font-semibold">{date.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })}</div>
                <div className="text-xs text-muted-foreground">
                  {date.toLocaleDateString('zh-CN', { weekday: 'short' })}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {groups.map((group) => (
            <tr key={group.id}>
              <td
                className="sticky left-0 z-10 bg-background border border-border p-2 font-medium"
                style={{
                  borderLeftWidth: '4px',
                  borderLeftColor: group.color || '#8b5cf6',
                }}
              >
                <div className="font-semibold">{group.name}</div>
                <div className="text-xs text-muted-foreground">{group.code}</div>
              </td>
              {dates.map((date, dateIndex) => {
                const itineraries = getItinerariesForGroupAndDate(group.id, date);
                const groupStart = new Date(group.startDate);
                const groupEnd = new Date(group.endDate);
                const isInRange = date >= groupStart && date <= groupEnd;

                return (
                  <td
                    key={dateIndex}
                    className={`border border-border p-0 align-top ${
                      !isInRange ? 'bg-muted/20' : ''
                    }`}
                  >
                    <div
                      className="relative"
                      style={{ height: `${(TIME_END - TIME_START) * HOUR_HEIGHT}px` }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        if (isInRange) {
                          e.currentTarget.classList.add('bg-primary/5');
                        }
                      }}
                      onDragLeave={(e) => {
                        e.currentTarget.classList.remove('bg-primary/5');
                      }}
                      onDrop={(e) => {
                        e.currentTarget.classList.remove('bg-primary/5');
                        handleDrop(e, date, isInRange);
                      }}
                    >
                      {/* 時間刻度線 */}
                      {Array.from({ length: TIME_END - TIME_START + 1 }, (_, i) => TIME_START + i).map((hour) => (
                        <div
                          key={hour}
                          className="absolute w-full border-t border-border/30"
                          style={{ top: `${(hour - TIME_START) * HOUR_HEIGHT}px` }}
                        >
                          <span className="text-[10px] text-muted-foreground ml-1">{hour}:00</span>
                        </div>
                      ))}

                      {/* 行程卡片 */}
                      {isInRange && itineraries.map((itinerary) => {
                        const { top, height } = getItineraryStyle(itinerary);
                        const hasConflict = detectConflicts(
                          date,
                          itinerary.locationName || '',
                          itinerary.startTime || ''
                        );

                        return (
                          <div
                            key={itinerary.id}
                            draggable
                            onDragStart={(e) => {
                              setDraggedItem(itinerary);
                              e.dataTransfer.effectAllowed = "move";
                            }}
                            onDragEnd={() => setDraggedItem(null)}
                            className={`absolute left-1 right-1 rounded cursor-move hover:shadow-lg transition-all ${
                              draggedItem?.id === itinerary.id ? 'opacity-50' : ''
                            } ${
                              hasConflict
                                ? 'bg-red-100 border-2 border-red-400 text-red-900'
                                : 'bg-blue-100 border-2 border-blue-400 text-blue-900'
                            }`}
                            style={{
                              top: `${top}px`,
                              height: `${height}px`,
                              minHeight: '40px',
                            }}
                            title="拖拽移動，拉伸邊緣調整時間"
                          >
                            {/* 上邊緣拉伸手柄 */}
                            <div
                              className="absolute top-0 left-0 right-0 h-1.5 cursor-ns-resize hover:bg-blue-500/30"
                              onMouseDown={(e) => handleResize(e, itinerary, 'top')}
                            />

                            {/* 內容 */}
                            <div className="px-1.5 py-0.5 overflow-hidden">
                              {hasConflict && (
                                <AlertCircle className="w-3 h-3 inline mr-1 text-red-600" />
                              )}
                              <div className="font-semibold text-[11px] truncate leading-tight">{itinerary.locationName}</div>
                              <div className="text-[9px] text-muted-foreground leading-tight">
                                {itinerary.startTime}-{itinerary.endTime}
                              </div>
                            </div>

                            {/* 下邊緣拉伸手柄 */}
                            <div
                              className="absolute bottom-0 left-0 right-0 h-1.5 cursor-ns-resize hover:bg-blue-500/30"
                              onMouseDown={(e) => handleResize(e, itinerary, 'bottom')}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      {/* 圖例 */}
      <div className="mt-4 flex gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-100 border-2 border-blue-400 rounded"></div>
          <span>正常行程</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-100 border-2 border-red-400 rounded"></div>
          <AlertCircle className="w-3 h-3 text-red-600" />
          <span>資源衝突</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-muted/20 border border-border rounded"></div>
          <span>非團組時間</span>
        </div>
        <div className="text-muted-foreground">
          💡 提示：拖拽卡片移動時間，拉伸邊緣調整時長
        </div>
      </div>
    </div>
  );
}
