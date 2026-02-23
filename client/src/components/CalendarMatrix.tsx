import { useMemo, useState, useRef, useEffect } from 'react';
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
  const [draggedItem, setDraggedItem] = useState<{ itinerary: Itinerary; offsetY: number } | null>(null);
  const [resizingItem, setResizingItem] = useState<{ itinerary: Itinerary; edge: 'top' | 'bottom' } | null>(null);
  const [tempPosition, setTempPosition] = useState<{ id: number; top: number; height: number; startTime: string; endTime: string } | null>(null);
  const [selectedItinerary, setSelectedItinerary] = useState<number | null>(null);
  const [hourHeight, setHourHeight] = useState(25);
  const containerRef = useRef<HTMLDivElement>(null);
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

  // 刪除行程
  const deleteItinerary = trpc.itineraries.delete.useMutation({
    onSuccess: () => {
      groups.forEach((group) => {
        utils.itineraries.listByGroup.invalidate({ groupId: group.id });
      });
      toast.success("行程已刪除");
      setSelectedItinerary(null);
    },
    onError: (error) => {
      toast.error(error.message || "刪除失敗");
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

  // 時間軸配置
  const TIME_START = 6.5; // 6:30
  const TIME_END = 24; // 23:59

  // 自動計算時間軸高度，確保一屏可見
  useEffect(() => {
    const calculateHourHeight = () => {
      if (!containerRef.current) return;
      
      const viewportHeight = window.innerHeight;
      const headerHeight = 300; // 頁面頭部高度
      const footerHeight = 100; // 底部圖例高度
      const availableHeight = viewportHeight - headerHeight - footerHeight;
      
      const groupCount = groups.length;
      const timeHours = TIME_END - TIME_START;
      
      // 計算每個團組的可用高度
      const heightPerGroup = availableHeight / groupCount;
      // 計算每小時的高度
      const calculatedHourHeight = Math.floor(heightPerGroup / timeHours);
      
      // 設置最小和最大高度限制，確保 1-1.5 小時行程卡片信息可見
      const minHeight = 40; // 增加最小高度，確保 1 小時行程可見
      const maxHeight = 80; // 增加最大高度
      const finalHeight = Math.max(minHeight, Math.min(maxHeight, calculatedHourHeight));
      
      setHourHeight(finalHeight);
    };

    calculateHourHeight();
    window.addEventListener('resize', calculateHourHeight);
    return () => window.removeEventListener('resize', calculateHourHeight);
  }, [groups.length]);

  // 鍵盤刪除事件監聽
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'Backspace' || e.key === 'Delete') && selectedItinerary) {
        e.preventDefault();
        const itinerary = allItineraries.find(it => it.id === selectedItinerary);
        if (!itinerary) return;
        
        const confirmed = window.confirm(`確認刪除行程「${itinerary.locationName}」？`);
        if (confirmed) {
          deleteItinerary.mutate({ id: selectedItinerary });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedItinerary, allItineraries, deleteItinerary]);

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
    // 如果正在拖拽或拉伸這個卡片，使用臨時位置
    if (tempPosition && tempPosition.id === itinerary.id) {
      return { 
        top: tempPosition.top, 
        height: tempPosition.height,
        startTime: tempPosition.startTime,
        endTime: tempPosition.endTime
      };
    }
    
    const startHours = timeToHours(itinerary.startTime);
    const endHours = timeToHours(itinerary.endTime);
    const top = (startHours - TIME_START) * hourHeight;
    const height = (endHours - startHours) * hourHeight;
    return { 
      top, 
      height,
      startTime: itinerary.startTime || '',
      endTime: itinerary.endTime || ''
    };
  };

  // 檢測資源衝突，返回衝突的團組列表
  const detectConflicts = (date: Date, location: string, time: string, currentGroupId: number) => {
    const dateStr = date.toISOString().split('T')[0];
    const conflicts = allItineraries.filter((itinerary) => {
      const itineraryDateStr = new Date(itinerary.date).toISOString().split('T')[0];
      return (
        itineraryDateStr === dateStr &&
        itinerary.locationName === location &&
        itinerary.startTime === time &&
        itinerary.groupId !== currentGroupId
      );
    });
    
    if (conflicts.length === 0) return null;
    
    // 返回衝突的團組名稱列表
    const conflictGroups = conflicts.map(c => {
      const group = groups.find(g => g.id === c.groupId);
      return group?.name || '未知團組';
    });
    
    return conflictGroups;
  };

  // 獲取某個團組在某一天的行程點
  const getItinerariesForGroupAndDate = (groupId: number, date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return allItineraries.filter((itinerary) => {
      const itineraryDateStr = new Date(itinerary.date).toISOString().split('T')[0];
      return itinerary.groupId === groupId && itineraryDateStr === dateStr;
    });
  };

  // 處理拖拽移動行程
  const handleDrag = (e: React.MouseEvent, itinerary: Itinerary) => {
    e.stopPropagation();
    e.preventDefault();
    const startY = e.clientY;
    const offsetY = startY - e.currentTarget.getBoundingClientRect().top;
    setDraggedItem({ itinerary, offsetY });

    // 在函數開始時保存 parentElement 引用
    const parentElement = e.currentTarget.parentElement;
    if (!parentElement) return;

    const startTime = timeToHours(itinerary.startTime);
    const endTime = timeToHours(itinerary.endTime);
    const duration = endTime - startTime;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const cellRect = parentElement.getBoundingClientRect();
      if (!cellRect) return;
      
      const y = moveEvent.clientY - cellRect.top - offsetY;
      const hours = TIME_START + y / hourHeight;
      const newStartHours = Math.max(TIME_START, Math.min(TIME_END - duration, hours));
      const newEndHours = newStartHours + duration;

      const newTop = (newStartHours - TIME_START) * hourHeight;
      const newHeight = duration * hourHeight;

      setTempPosition({
        id: itinerary.id,
        top: newTop,
        height: newHeight,
        startTime: hoursToTime(newStartHours),
        endTime: hoursToTime(newEndHours)
      });
    };

    const handleMouseUp = (upEvent: MouseEvent) => {
      const cellRect = parentElement.getBoundingClientRect();
      if (!cellRect) return;

      const y = upEvent.clientY - cellRect.top - offsetY;
      const hours = TIME_START + y / hourHeight;
      const newStartHours = Math.max(TIME_START, Math.min(TIME_END - duration, hours));
      const newEndHours = newStartHours + duration;

      updateItinerary.mutate({
        id: itinerary.id,
        startTime: hoursToTime(newStartHours),
        endTime: hoursToTime(newEndHours),
      });

      setDraggedItem(null);
      setTempPosition(null);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // 處理拉伸調整時間
  const handleResize = (e: React.MouseEvent, itinerary: Itinerary, edge: 'top' | 'bottom') => {
    e.stopPropagation();
    e.preventDefault();
    setResizingItem({ itinerary, edge });

    const startY = e.clientY;
    const startTime = timeToHours(itinerary.startTime);
    const endTime = timeToHours(itinerary.endTime);
    const initialTop = (startTime - TIME_START) * hourHeight;
    const initialHeight = (endTime - startTime) * hourHeight;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaY = moveEvent.clientY - startY;
      const deltaHours = deltaY / hourHeight;

      let newStartTime = startTime;
      let newEndTime = endTime;
      let newTop = initialTop;
      let newHeight = initialHeight;

      if (edge === 'top') {
        newStartTime = Math.max(TIME_START, Math.min(endTime - 0.5, startTime + deltaHours));
        newTop = (newStartTime - TIME_START) * hourHeight;
        newHeight = (endTime - newStartTime) * hourHeight;
      } else {
        newEndTime = Math.max(startTime + 0.5, Math.min(TIME_END, endTime + deltaHours));
        newHeight = (newEndTime - startTime) * hourHeight;
      }

      // 實時更新視覺反饋和時間顯示
      setTempPosition({ 
        id: itinerary.id, 
        top: newTop, 
        height: newHeight,
        startTime: hoursToTime(newStartTime),
        endTime: hoursToTime(newEndTime)
      });
    };

    const handleMouseUp = (upEvent: MouseEvent) => {
      const deltaY = upEvent.clientY - startY;
      const deltaHours = deltaY / hourHeight;

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
      setTempPosition(null);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div className="overflow-x-auto" ref={containerRef}>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="sticky left-0 z-20 bg-background border border-border p-2 min-w-[150px] text-left font-semibold">
              團組
            </th>
            {dates.map((date, index) => (
              <th
                key={index}
                className="border border-border p-2 min-w-[140px] text-center bg-muted/50"
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
                      style={{ height: `${(TIME_END - TIME_START) * hourHeight}px` }}
                    >
                      {/* 時間刻度線 */}
                      {Array.from({ length: TIME_END - TIME_START + 1 }, (_, i) => TIME_START + i).map((hour) => (
                        <div
                          key={hour}
                          className="absolute w-full border-t border-border/30"
                          style={{ top: `${(hour - TIME_START) * hourHeight}px` }}
                        />
                      ))}

                      {/* 行程卡片 */}
                      {isInRange && itineraries.map((itinerary) => {
                        const { top, height, startTime, endTime } = getItineraryStyle(itinerary);
                        const conflictGroups = detectConflicts(
                          date,
                          itinerary.locationName || '',
                          itinerary.startTime || '',
                          group.id
                        );
                        const hasConflict = conflictGroups !== null;

                        return (
                          <div
                            key={itinerary.id}
                            onClick={() => setSelectedItinerary(itinerary.id)}
                            className={`absolute left-0.5 right-0.5 rounded hover:shadow-lg transition-all select-none cursor-pointer ${
                              selectedItinerary === itinerary.id ? 'shadow-xl ring-2 ring-purple-500 z-10' : ''
                            } ${
                              resizingItem?.itinerary.id === itinerary.id || draggedItem?.itinerary.id === itinerary.id ? 'shadow-xl ring-2 ring-blue-500 z-10' : ''
                            } ${
                              hasConflict
                                ? 'bg-red-100 border-2 border-red-400 text-red-900'
                                : 'bg-blue-100 border-2 border-blue-400 text-blue-900'
                            }`}
                            style={{
                              top: `${top}px`,
                              height: `${height}px`,
                              minHeight: '30px',
                            }}
                          >
                            {/* 上邊緣拉伸手柄 */}
                            <div
                              className="absolute top-0 left-0 right-0 h-2 cursor-ns-resize hover:bg-blue-500/40 active:bg-blue-500/60 transition-colors z-10"
                              onMouseDown={(e) => handleResize(e, itinerary, 'top')}
                            />

                            {/* 中間區域：拖拽移動 */}
                            <div
                              className="absolute top-2 bottom-2 left-0 right-0 cursor-move px-1 py-0.5 flex flex-col justify-center overflow-hidden"
                              onMouseDown={(e) => handleDrag(e, itinerary)}
                              title={hasConflict ? `衝突：與 ${conflictGroups!.join('、')} 同時使用此場館` : ''}
                            >
                              {hasConflict && (
                                <AlertCircle className="w-3 h-3 inline mr-1 text-red-600" />
                              )}
                              <div className="font-semibold text-[10px] leading-tight break-words">{itinerary.locationName}</div>
                              <div className="text-[9px] text-muted-foreground leading-tight whitespace-nowrap">
                                {startTime}-{endTime}
                              </div>
                              {hasConflict && (
                                <div className="text-[8px] text-red-700 leading-tight mt-0.5">
                                  衝突：{conflictGroups!.join('、')}
                                </div>
                              )}
                            </div>

                            {/* 下邊緣拉伸手柄 */}
                            <div
                              className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize hover:bg-blue-500/40 active:bg-blue-500/60 transition-colors z-10"
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
          💡 提示：拖拽卡片中間移動時間，拉伸邊緣調整時長
        </div>
      </div>
    </div>
  );
}
