import { useMemo } from 'react';
import { trpc } from '../lib/trpc';
import { AlertCircle } from 'lucide-react';

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
  // 獲取所有團組的行程點
  const itinerariesQueries = groups.map((group) =>
    trpc.itineraries.listByGroup.useQuery({ groupId: group.id })
  );

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

  // 檢測資源衝突：同一地點在同一時段被多個團組佔用
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
                className="border border-border p-2 min-w-[120px] text-center bg-muted/50"
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
            <tr key={group.id} className="hover:bg-muted/30">
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
                    className={`border border-border p-1 align-top ${
                      !isInRange ? 'bg-muted/20' : ''
                    }`}
                  >
                    {isInRange && itineraries.length > 0 && (
                      <div className="space-y-1">
                        {itineraries.map((itinerary) => {
                          const hasConflict = detectConflicts(
                            date,
                            itinerary.locationName || '',
                            itinerary.startTime || ''
                          );
                          
                          return (
                            <div
                              key={itinerary.id}
                              className={`text-xs p-1 rounded ${
                                hasConflict
                                  ? 'bg-red-100 border border-red-300 text-red-800'
                                  : 'bg-blue-50 border border-blue-200 text-blue-800'
                              }`}
                            >
                              {hasConflict && (
                                <AlertCircle className="w-3 h-3 inline mr-1 text-red-600" />
                              )}
                              <div className="font-semibold truncate">{itinerary.locationName}</div>
                              <div className="text-[10px] text-muted-foreground">
                                {itinerary.startTime} - {itinerary.endTime}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
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
          <div className="w-4 h-4 bg-blue-50 border border-blue-200 rounded"></div>
          <span>正常行程</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-100 border border-red-300 rounded"></div>
          <AlertCircle className="w-3 h-3 text-red-600" />
          <span>資源衝突</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-muted/20 border border-border rounded"></div>
          <span>非團組時間</span>
        </div>
      </div>
    </div>
  );
}
