import { useParams, useLocation } from 'wouter';
import { trpc } from '../lib/trpc';
import { Button } from '../components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { ArrowLeft, Calendar, Users, Plus, UtensilsCrossed } from 'lucide-react';
import { CalendarMatrix } from '../components/CalendarMatrix';

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
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-purple-500" />
                行程儀表板
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-2">
                一覽所有團組的行程安排，支持拖拽快速調整時間
              </p>
            </CardHeader>
            <CardContent>
              {groups && groups.length > 0 ? (
                <CalendarMatrix
                  projectStartDate={project.startDate}
                  projectEndDate={project.endDate}
                  groups={groups}
                />
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Calendar className="w-16 h-16 mx-auto mb-4 opacity-20" />
                  <p>還沒有團組，點擊右上角添加第一個團組</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="dining">
          <DiningCoordinationTab projectId={projectId} groups={groups || []} project={project} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
