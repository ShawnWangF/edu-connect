import { useState } from 'react';
import { useParams, useLocation } from 'wouter';
import { trpc } from '../lib/trpc';
import { Button } from '../components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { ArrowLeft, Calendar, Users, Plus, UtensilsCrossed, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfWeek, addDays, isSameDay } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { toast } from 'sonner';

// 行程儀表板 Tab 組件（帶拖拽排程功能）
function ItineraryDashboardTab({ projectId, groups, project }: any) {
  const [currentDate, setCurrentDate] = useState(new Date(project.startDate));
  const [draggedItem, setDraggedItem] = useState<any>(null);
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 }); // 週一開始

  // 獲取所有行程
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
    const group = groups.find((g: any) => g.id === groupId);
    return group?.color || '#52c41a';
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
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-purple-500" />
              行程儀表板
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-2">
              一覽所有團組的行程安排，支持拖拽快速調整時間
            </p>
          </div>
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
        {groups.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Calendar className="w-16 h-16 mx-auto mb-4 opacity-20" />
            <p>還沒有團組，點擊右上角添加第一個團組</p>
          </div>
        ) : (
          <>
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
                                className={`text-white text-xs p-1 rounded mb-1 cursor-move hover:opacity-80 transition-opacity ${draggedItem?.id === item.id ? 'opacity-50' : ''}`}
                                style={{ backgroundColor: getGroupColor(item.groupId) }}
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
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: group.color }}></div>
                  <span className="text-sm">{group.name}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// 餐飲統籌 Tab 組件
function DiningCoordinationTab({ projectId, groups, project }: any) {
  const utils = trpc.useUtils();
  
  // 獲取所有團組的食行卡片
  const dailyCardsQueries = groups.map((group: any) => 
    trpc.dailyCards.listByGroup.useQuery({ groupId: group.id })
  );
  
  // 生成日期列表
  const dateList: string[] = [];
  const startDate = new Date(project.startDate);
  const endDate = new Date(project.endDate);
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    dateList.push(d.toISOString().split('T')[0]);
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UtensilsCrossed className="w-5 h-5 text-orange-500" />
          餐飲統籌矩陣
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-2">
          一覽所有團組的餐飲安排，方便統籌者協調餐廳資源
        </p>
      </CardHeader>
      <CardContent>
        {groups.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <UtensilsCrossed className="w-16 h-16 mx-auto mb-4 opacity-20" />
            <p>還沒有團組，點擊右上角添加第一個團組</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="border p-2 bg-muted text-left font-semibold sticky left-0 z-10 bg-background">
                    團組
                  </th>
                  {dateList.map((date, index) => (
                    <th key={date} className="border p-2 bg-muted text-center text-sm min-w-[200px]">
                      <div>{new Date(date).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(date).toLocaleDateString('zh-CN', { weekday: 'short' })}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {groups.map((group: any, groupIndex: number) => {
                  const dailyCards = dailyCardsQueries[groupIndex]?.data || [];
                  
                  return (
                    <tr key={group.id}>
                      <td className="border p-2 font-medium sticky left-0 z-10 bg-background">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full flex-shrink-0" 
                            style={{ backgroundColor: group.color }}
                          />
                          <span className="text-sm">{group.name}</span>
                        </div>
                      </td>
                      {dateList.map((date) => {
                        const card = dailyCards.find((c: any) => 
                          new Date(c.date).toISOString().split('T')[0] === date
                        );
                        
                        return (
                          <td key={date} className="border p-2 align-top">
                            {card ? (
                              <div className="space-y-1 text-xs">
                                {card.breakfast && (
                                  <div className="flex items-start gap-1">
                                    <span className="text-orange-600 font-medium">早:</span>
                                    <span className="text-muted-foreground">{card.breakfast}</span>
                                  </div>
                                )}
                                {card.lunch && (
                                  <div className="flex items-start gap-1">
                                    <span className="text-blue-600 font-medium">午:</span>
                                    <span className="text-muted-foreground">{card.lunch}</span>
                                  </div>
                                )}
                                {card.dinner && (
                                  <div className="flex items-start gap-1">
                                    <span className="text-purple-600 font-medium">晚:</span>
                                    <span className="text-muted-foreground">{card.dinner}</span>
                                  </div>
                                )}
                                {!card.breakfast && !card.lunch && !card.dinner && (
                                  <span className="text-muted-foreground">未安排</span>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-xs">未安排</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function ProjectDetail() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const projectId = parseInt(params.id);

  const { data: project, isLoading: projectLoading } = trpc.projects.get.useQuery({ id: projectId });
  const { data: groups, isLoading: groupsLoading } = trpc.projects.getGroups.useQuery({ projectId });

  if (projectLoading || groupsLoading) {
    return <div className="p-8">加載中...</div>;
  }

  if (!project) {
    return <div className="p-8">項目不存在</div>;
  }

  return (
    <div className="container py-8">
      {/* 頁面頭部 */}
      <div className="mb-8">
        <Button
          variant="ghost"
          onClick={() => setLocation('/projects')}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          返回項目列表
        </Button>
        
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 bg-clip-text text-transparent">
              {project.name}
            </h1>
            <p className="text-muted-foreground mt-2">{project.code}</p>
            {project.description && (
              <p className="text-sm text-muted-foreground mt-2">{project.description}</p>
            )}
          </div>
          <Button
            className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600"
            onClick={() => setLocation(`/groups/create?projectId=${projectId}`)}
          >
            <Plus className="w-4 h-4 mr-2" />
            添加團組
          </Button>
        </div>
      </div>

      {/* 項目統計卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">項目時間</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-purple-500" />
              <span className="text-sm">
                {new Date(project.startDate).toLocaleDateString()} - {new Date(project.endDate).toLocaleDateString()}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">團組數量</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{groups?.length || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">總學生數</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-500" />
              <span className="text-2xl font-bold text-blue-600">{project.totalStudents}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">總教師數</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-green-500" />
              <span className="text-2xl font-bold text-green-600">{project.totalTeachers}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs 切換 */}
      <Tabs defaultValue="calendar" className="space-y-4">
        <TabsList>
          <TabsTrigger value="calendar" className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            行程儀表板
          </TabsTrigger>
          <TabsTrigger value="dining" className="flex items-center gap-2">
            <UtensilsCrossed className="w-4 h-4" />
            餐飲統籌
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="calendar">
          <ItineraryDashboardTab projectId={projectId} groups={groups || []} project={project} />
        </TabsContent>
        
        <TabsContent value="dining">
          <DiningCoordinationTab projectId={projectId} groups={groups || []} project={project} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
