import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { Users, Calendar, MapPin, TrendingUp, Clock } from "lucide-react";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { useState } from "react";

export default function Home() {
  const [, setLocation] = useLocation();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { data: groups } = trpc.groups.list.useQuery();
  const { data: locations } = trpc.locations.list.useQuery();
  const { data: allItineraries } = trpc.itineraries.listAll.useQuery();
  const { data: allDailyCards } = trpc.dailyCards.listAll.useQuery();
  
  // 獲取本週關注事項（本週的行程）
  const thisWeekItineraries = allItineraries?.filter((item: any) => {
    const itemDate = new Date(item.date);
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay() + 1); // 週一
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);
    return itemDate >= weekStart && itemDate < weekEnd;
  }) || [];

  // 按狀態篩選團組
  const filteredGroups = statusFilter === "all" 
    ? groups 
    : groups?.filter(g => g.status === statusFilter);

  // 按出發時間排序團組（即將出發的在前）
  const sortedGroups = filteredGroups?.slice().sort((a, b) => {
    return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
  }) || [];

  // 為每個團組獲取行程點和食行卡片
  const groupsWithItineraries = sortedGroups.map(group => {
    const itineraries = allItineraries?.filter((item: any) => item.groupId === group.id) || [];
    const dailyCards = allDailyCards?.filter((card: any) => card.groupId === group.id) || [];
    
    // 合併行程點和餐飲信息
    const mergedItems: any[] = [];
    
    // 添加行程點
    itineraries.forEach((item: any) => {
      mergedItems.push({ type: 'itinerary', data: item, sortTime: item.startTime || '23:59', date: item.date });
    });
    
    // 添加餐飲信息
    dailyCards.forEach((card: any) => {
      if (card.breakfastRestaurant) {
        mergedItems.push({ type: 'meal', mealType: 'breakfast', data: card, sortTime: '07:00', date: card.date });
      }
      if (card.lunchRestaurant) {
        mergedItems.push({ type: 'meal', mealType: 'lunch', data: card, sortTime: '12:00', date: card.date });
      }
      if (card.dinnerRestaurant) {
        mergedItems.push({ type: 'meal', mealType: 'dinner', data: card, sortTime: '18:00', date: card.date });
      }
    });
    
    // 按日期和時間排序
    mergedItems.sort((a: any, b: any) => {
      const dateCompare = new Date(a.date).getTime() - new Date(b.date).getTime();
      if (dateCompare !== 0) return dateCompare;
      return a.sortTime.localeCompare(b.sortTime);
    });
    
    return { ...group, itineraries: mergedItems };
  });

  const stats = {
    totalGroups: groups?.length || 0,
    ongoingGroups: groups?.filter((g) => g.status === "ongoing").length || 0,
    totalLocations: locations?.length || 0,
    totalParticipants:
      groups?.reduce((sum, g) => sum + (g.totalCount || 0), 0) || 0,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-pink-500 via-blue-500 to-purple-600 bg-clip-text text-transparent">儀表板</h1>
        <p className="text-muted-foreground mt-1">教育團組行程管理系統概覽</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              團組總數
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalGroups}</div>
            <p className="text-xs text-muted-foreground mt-1">
              進行中: {stats.ongoingGroups}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              參訪地點
            </CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalLocations}</div>
            <p className="text-xs text-muted-foreground mt-1">可用資源</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              總參與人數
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalParticipants}</div>
            <p className="text-xs text-muted-foreground mt-1">所有團組</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              活動總數
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {groups?.reduce((sum, g) => sum + (g.days || 0), 0) || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">行程天數</p>
          </CardContent>
        </Card>
      </div>

      {/* 最近團組 - 橫向滾動時間軸視圖 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>最近團組</CardTitle>
              <p className="text-sm text-muted-foreground">按出發時間排序，點擊查看詳情</p>
            </div>
            {/* 狀態篩選按鈕組 */}
            <div className="flex gap-2">
              <Button
                variant={statusFilter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("all")}
                className={statusFilter === "all" ? "bg-gradient-to-r from-pink-500 via-blue-500 to-purple-600" : ""}
              >
                全部
              </Button>
              <Button
                variant={statusFilter === "preparing" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("preparing")}
                className={statusFilter === "preparing" ? "bg-gradient-to-r from-yellow-400 to-orange-500" : ""}
              >
                準備中
              </Button>
              <Button
                variant={statusFilter === "ongoing" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("ongoing")}
                className={statusFilter === "ongoing" ? "bg-gradient-to-r from-green-400 to-cyan-500" : ""}
              >
                進行中
              </Button>
              <Button
                variant={statusFilter === "completed" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("completed")}
                className={statusFilter === "completed" ? "bg-gradient-to-r from-blue-400 to-indigo-500" : ""}
              >
                已完成
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {groupsWithItineraries.length > 0 ? (
            <div className="overflow-x-auto pb-4">
              <div className="flex gap-4 min-w-max">
                {groupsWithItineraries.slice(0, 10).map((group) => (
                  <div
                    key={group.id}
                    onClick={() => setLocation(`/groups/${group.id}`)}
                    className="flex-shrink-0 w-80 border rounded-lg overflow-hidden cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-[1.02]"
                    style={{
                      backgroundColor: group.color || '#f3f4f6',
                    }}
                  >
                    {/* 團組標題 */}
                    <div className="p-4 text-white" style={{
                      backgroundColor: group.color || '#6b7280',
                    }}>
                      <h3 className="font-bold text-lg truncate">{group.name}</h3>
                      <div className="flex items-center gap-2 text-sm mt-1 opacity-90">
                        <span>{group.code}</span>
                        <span>·</span>
                        <span>{group.totalCount} 人</span>
                      </div>
                      <div className="flex items-center gap-1 text-sm mt-2 opacity-90">
                        <Calendar className="h-3 w-3" />
                        <span>
                          {format(new Date(group.startDate), "MM/dd", { locale: zhCN })} - {format(new Date(group.endDate), "MM/dd", { locale: zhCN })}
                        </span>
                      </div>
                    </div>

                    {/* 時間軸式行程點 */}
                    <div className="bg-white p-4 max-h-96 overflow-y-auto">
                      {group.itineraries.length > 0 ? (
                        <div className="space-y-3">
                          {group.itineraries.map((item: any, index: number) => {
                            if (item.type === 'itinerary') {
                              return (
                                <div key={`itinerary-${item.data.id}`} className="flex gap-3">
                                  {/* 時間軸線 */}
                                  <div className="flex flex-col items-center">
                                    <div 
                                      className="w-3 h-3 rounded-full border-2 flex-shrink-0"
                                      style={{
                                        borderColor: group.color || '#6b7280',
                                        backgroundColor: 'white',
                                      }}
                                    />
                                    {index < group.itineraries.length - 1 && (
                                      <div 
                                        className="w-0.5 flex-1 min-h-[40px]"
                                        style={{
                                          backgroundColor: group.color || '#e5e7eb',
                                        }}
                                      />
                                    )}
                                  </div>

                                  {/* 行程內容 */}
                                  <div className="flex-1 pb-2">
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="flex-1 min-w-0">
                                        <p className="font-medium text-sm truncate">
                                          {item.data.locationName || '未指定地點'}
                                        </p>
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                                          <Clock className="h-3 w-3" />
                                          <span>
                                            {format(new Date(item.data.date), "MM/dd", { locale: zhCN })}
                                            {item.data.startTime && ` ${item.data.startTime}`}
                                            {item.data.endTime && ` - ${item.data.endTime}`}
                                          </span>
                                        </div>
                                        {item.data.description && (
                                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                            {item.data.description}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            } else if (item.type === 'meal') {
                              const mealLabels = {
                                breakfast: '🍳 早餐',
                                lunch: '🍜 午餐',
                                dinner: '🍝 晚餐',
                              };
                              const mealLabel = mealLabels[item.mealType as keyof typeof mealLabels];
                              const restaurantField = `${item.mealType}Restaurant`;
                              const addressField = `${item.mealType}Address`;
                              const mealContent = `${item.data[restaurantField]}${item.data[addressField] ? ' - ' + item.data[addressField] : ''}`;
                              
                              return (
                                <div key={`meal-${item.mealType}-${index}`} className="flex gap-3">
                                  <div className="flex flex-col items-center">
                                    <div 
                                      className="w-3 h-3 rounded-full border-2 flex-shrink-0"
                                      style={{
                                        borderColor: '#f97316',
                                        backgroundColor: '#fed7aa',
                                      }}
                                    />
                                    {index < group.itineraries.length - 1 && (
                                      <div 
                                        className="w-0.5 flex-1 min-h-[40px]"
                                        style={{
                                          backgroundColor: group.color || '#e5e7eb',
                                        }}
                                      />
                                    )}
                                  </div>
                                  <div className="flex-1 pb-2">
                                    <p className="text-sm font-medium text-orange-700">{mealLabel}</p>
                                    <p className="text-xs text-muted-foreground mt-1">{mealContent}</p>
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          })}
                        </div>
                      ) : (
                        <p className="text-center text-muted-foreground text-sm py-8">
                          暫無行程安排
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              暫無團組數據
            </p>
          )}
        </CardContent>
      </Card>

      {/* 本週關注事項 */}
      {thisWeekItineraries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>本週關注事項</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {thisWeekItineraries.slice(0, 5).map((item: any) => {
                const group = groups?.find((g) => g.id === item.groupId);
                return (
                  <div
                    key={item.id}
                    onClick={() => setLocation(`/groups/${item.groupId}`)}
                    className="flex items-start gap-3 p-3 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{item.locationName || '未指定地點'}</p>
                      <p className="text-sm text-muted-foreground">
                        {group?.name || '未知團組'} · {format(new Date(item.date), "MM/dd EEE", { locale: zhCN })}
                        {item.startTime && ` · ${item.startTime}`}
                      </p>
                      {item.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                          {item.description}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>系統快捷操作</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <a
              href="/groups/new"
              className="block p-4 border rounded-lg hover:bg-accent transition-colors"
            >
              <p className="font-medium">新建團組</p>
              <p className="text-sm text-muted-foreground">創建新的教育團組</p>
            </a>
            <a
              href="/resources"
              className="block p-4 border rounded-lg hover:bg-accent transition-colors"
            >
              <p className="font-medium">管理景點</p>
              <p className="text-sm text-muted-foreground">添加或編輯參訪地點</p>
            </a>
            <a
              href="/settings"
              className="block p-4 border rounded-lg hover:bg-accent transition-colors"
            >
              <p className="font-medium">版本控制</p>
              <p className="text-sm text-muted-foreground">管理系統快照和備份</p>
            </a>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
