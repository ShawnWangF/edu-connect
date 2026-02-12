import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { format, addDays, startOfWeek, endOfWeek } from "date-fns";
import { zhCN } from "date-fns/locale";

export default function Planner() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 }); // 週一開始
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });

  const { data: groups } = trpc.groups.list.useQuery();

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

  // 時段定義
  const timePeriods = [
    { id: "morning", label: "上午", time: "08:00-12:00" },
    { id: "afternoon", label: "下午", time: "13:00-17:00" },
    { id: "evening", label: "晚上", time: "18:00-21:00" },
  ];

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
                    <th key={day.toISOString()} className="border p-2 bg-muted/50 min-w-[120px]">
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
                    {weekDays.map((day) => (
                      <td
                        key={`${period.id}-${day.toISOString()}`}
                        className="border p-2 min-h-[100px] align-top hover:bg-accent/50 cursor-pointer transition-colors"
                      >
                        {/* 這裡可以顯示該時段的行程安排 */}
                        <div className="text-xs text-muted-foreground text-center py-4">
                          點擊添加行程
                        </div>
                      </td>
                    ))}
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
                      className="p-3 border rounded-lg hover:bg-accent transition-colors cursor-pointer"
                    >
                      <p className="font-medium">{group.name}</p>
                      <p className="text-sm text-muted-foreground">
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
              <div className="p-3 border-l-4 border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20">
                <p className="text-sm font-medium">提示</p>
                <p className="text-sm text-muted-foreground mt-1">
                  行程設計器功能正在開發中，即將支持拖拽式行程安排
                </p>
              </div>
              <div className="p-3 border rounded-lg">
                <p className="text-sm text-muted-foreground">
                  • 支持按上午/下午/晚上時段劃分
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  • 可視化週視圖統籌多團組
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  • 拖拽調整行程安排
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
