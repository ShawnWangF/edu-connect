import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from '../lib/trpc';
import { Button } from '../components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import {
  ArrowLeft, Calendar, Users, Plus, UtensilsCrossed, LayoutGrid,
  Plane, MapPin, Star, ArrowRight, ChevronLeft, ChevronRight
} from 'lucide-react';
import { CalendarMatrix } from '../components/CalendarMatrix';

// ===== 色塊類型定義（與 ScheduleOverview 一致）=====
type BlockType = 'sz_arrive' | 'sz_stay' | 'hk_arrive' | 'hk_stay' | 'exchange' | 'border_sz_hk' | 'border_hk_sz' | 'departure' | 'free';

const BLOCK_CONFIG: Record<BlockType, { label: string; shortLabel: string; bg: string; text: string; border: string; icon?: string }> = {
  sz_arrive:    { label: '抵達深圳', shortLabel: '抵深', bg: '#DAEEF3', text: '#1a5276', border: '#9DC3E6', icon: '✈️' },
  sz_stay:      { label: '深圳住宿', shortLabel: '深圳', bg: '#BDD7EE', text: '#1a5276', border: '#7fb3d3', icon: '🏨' },
  hk_arrive:    { label: '抵達香港', shortLabel: '抵港', bg: '#9DC3E6', text: '#1a5276', border: '#5b9bd5', icon: '✈️' },
  hk_stay:      { label: '香港住宿', shortLabel: '香港', bg: '#5b9bd5', text: '#fff', border: '#2e75b6', icon: '🏨' },
  exchange:     { label: '交流日', shortLabel: '交流★', bg: '#1F4E79', text: '#fff', border: '#1a3f63', icon: '⭐' },
  border_sz_hk: { label: '過關 深→港', shortLabel: '過關↑', bg: '#FFE699', text: '#7d6608', border: '#f0c040', icon: '🚌' },
  border_hk_sz: { label: '過關 港→深', shortLabel: '過關↓', bg: '#FFD966', text: '#7d6608', border: '#f0b030', icon: '🚌' },
  departure:    { label: '離境', shortLabel: '離境', bg: '#E2EFDA', text: '#375623', border: '#a9d18e', icon: '✈️' },
  free:         { label: '空閒', shortLabel: '', bg: '#f3f4f6', text: '#9ca3af', border: '#e5e7eb', icon: '' },
};

// ===== 當日行程卡片組件 =====
function TodayScheduleTab({ projectId, groups, project }: any) {
  const today = new Date().toISOString().split('T')[0];
  const projectStart = project?.startDate ? new Date(project.startDate).toISOString().split('T')[0] : '';
  const projectEnd = project?.endDate ? new Date(project.endDate).toISOString().split('T')[0] : '';

  // 生成日期列表
  const dateList: string[] = [];
  if (projectStart && projectEnd) {
    for (let d = new Date(projectStart + 'T00:00:00'); d.toISOString().split('T')[0] <= projectEnd; d.setDate(d.getDate() + 1)) {
      dateList.push(d.toISOString().split('T')[0]);
    }
  }

  // 選擇查看的日期（默認今天，如果今天在項目範圍內）
  const defaultDate = dateList.includes(today) ? today : (dateList[0] || today);
  const [selectedDate, setSelectedDate] = useState(defaultDate);

  const { data: blocks = [] } = trpc.scheduleBlocks.listByProject.useQuery(
    { projectId },
    { enabled: !!projectId }
  );

  // 找到選定日期的所有色塊
  const todayBlocks = blocks.filter((b: any) => {
    const blockDate = b.date instanceof Date
      ? b.date.toISOString().split('T')[0]
      : typeof b.date === 'string' ? b.date.split('T')[0] : '';
    return blockDate === selectedDate;
  });

  // 按批次分組
  const groupMap = new Map((groups || []).map((g: any) => [g.id, g]));
  const batchMap = new Map<string, { groups: any[]; blocks: any[] }>();

  todayBlocks.forEach((block: any) => {
    const group = groupMap.get(block.groupId) as any;
    if (!group) return;
    const batchKey = group.batch_code || group.name;
    if (!batchMap.has(batchKey)) {
      batchMap.set(batchKey, { groups: [], blocks: [] });
    }
    const entry = batchMap.get(batchKey)!;
    if (!entry.groups.find((g: any) => g.id === group.id)) {
      entry.groups.push(group);
    }
    entry.blocks.push({ ...block, group });
  });

  // 統計
  const totalInHK = todayBlocks.filter((b: any) => ['hk_arrive', 'hk_stay', 'exchange', 'border_sz_hk'].includes(b.blockType)).length;
  const totalInSZ = todayBlocks.filter((b: any) => ['sz_arrive', 'sz_stay', 'border_hk_sz'].includes(b.blockType)).length;
  const totalPeopleHK = todayBlocks
    .filter((b: any) => ['hk_arrive', 'hk_stay', 'exchange', 'border_sz_hk'].includes(b.blockType))
    .reduce((sum: number, b: any) => {
      const g = groupMap.get(b.groupId) as any;
      return sum + (g?.totalCount || (g?.studentCount || 0) + (g?.teacherCount || 0));
    }, 0);
  const totalPeopleSZ = todayBlocks
    .filter((b: any) => ['sz_arrive', 'sz_stay', 'border_hk_sz'].includes(b.blockType))
    .reduce((sum: number, b: any) => {
      const g = groupMap.get(b.groupId) as any;
      return sum + (g?.totalCount || (g?.studentCount || 0) + (g?.teacherCount || 0));
    }, 0);

  // 日期導航
  const currentIdx = dateList.indexOf(selectedDate);
  const prevDate = currentIdx > 0 ? dateList[currentIdx - 1] : null;
  const nextDate = currentIdx < dateList.length - 1 ? dateList[currentIdx + 1] : null;
  const isToday = selectedDate === today;

  return (
    <div className="space-y-4">
      {/* 日期導航欄 */}
      <div className="flex items-center justify-between bg-gradient-to-r from-[#1F4E79] to-[#2e75b6] rounded-xl px-4 py-3">
        <button
          onClick={() => prevDate && setSelectedDate(prevDate)}
          disabled={!prevDate}
          className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="text-center">
          <div className="text-white font-bold text-lg">
            {new Date(selectedDate + 'T00:00:00').toLocaleDateString('zh-TW', { month: 'long', day: 'numeric', weekday: 'long' })}
          </div>
          {isToday && (
            <div className="text-blue-200 text-xs mt-0.5">今天</div>
          )}
        </div>
        <button
          onClick={() => nextDate && setSelectedDate(nextDate)}
          disabled={!nextDate}
          className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* 快速日期選擇（月曆條） */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {dateList.map(date => {
          const d = new Date(date + 'T00:00:00');
          const dayBlocks = blocks.filter((b: any) => {
            const bd = b.date instanceof Date ? b.date.toISOString().split('T')[0] : typeof b.date === 'string' ? b.date.split('T')[0] : '';
            return bd === date;
          });
          const hasActivity = dayBlocks.length > 0;
          const isSelected = date === selectedDate;
          const isTodayDate = date === today;
          return (
            <button
              key={date}
              onClick={() => setSelectedDate(date)}
              className={`flex-shrink-0 w-12 rounded-lg py-1.5 text-center transition-all border ${
                isSelected
                  ? 'bg-[#1F4E79] text-white border-[#1F4E79] shadow-md'
                  : isTodayDate
                  ? 'bg-blue-50 text-blue-700 border-blue-300 font-semibold'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
              }`}
            >
              <div className="text-[10px] text-current opacity-70">{d.toLocaleDateString('zh-TW', { month: 'numeric' })}月</div>
              <div className="text-sm font-bold">{d.getDate()}</div>
              {hasActivity && !isSelected && (
                <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mx-auto mt-0.5" />
              )}
              {!hasActivity && <div className="w-1.5 h-1.5 mx-auto mt-0.5" />}
            </button>
          );
        })}
      </div>

      {/* 住宿統計 */}
      {todayBlocks.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-[#5b9bd5] rounded-xl p-3 text-white">
            <div className="text-xs opacity-80 mb-1">🏨 香港住宿</div>
            <div className="text-2xl font-bold">{totalPeopleHK}</div>
            <div className="text-xs opacity-70">人 · {totalInHK} 個團組</div>
          </div>
          <div className="bg-[#BDD7EE] rounded-xl p-3 text-[#1a5276]">
            <div className="text-xs opacity-80 mb-1">🏨 深圳住宿</div>
            <div className="text-2xl font-bold">{totalPeopleSZ}</div>
            <div className="text-xs opacity-70">人 · {totalInSZ} 個團組</div>
          </div>
        </div>
      )}

      {/* 批次行程卡片 */}
      {batchMap.size === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">此日期暫無排程</p>
          <p className="text-xs mt-1 text-gray-300">請先在排程總覽中設置各團組的行程色塊</p>
        </div>
      ) : (
        <div className="space-y-3">
          {Array.from(batchMap.entries()).map(([batchKey, { groups: batchGroups, blocks: batchBlocks }]) => {
            const isSecondary = batchGroups.some((g: any) => {
              const types: string[] = Array.isArray(g.type) ? g.type : [];
              return types.some(t => t.includes('中學') || t.includes('中学'));
            });
            const batchBg = isSecondary ? '#FFF0E6' : '#EBF5FB';
            const batchBorder = isSecondary ? '#fed7aa' : '#bfdbfe';

            return (
              <div
                key={batchKey}
                className="rounded-xl border overflow-hidden"
                style={{ borderColor: batchBorder, backgroundColor: batchBg }}
              >
                {/* 批次標題 */}
                <div
                  className="px-3 py-2 flex items-center justify-between"
                  style={{ backgroundColor: isSecondary ? '#fdba74' : '#93c5fd', color: isSecondary ? '#7c2d12' : '#1e3a5f' }}
                >
                  <div className="font-semibold text-sm">{batchKey}</div>
                  <div className="text-xs opacity-80">
                    {batchGroups.reduce((s: number, g: any) => s + (g.totalCount || (g.studentCount || 0) + (g.teacherCount || 0)), 0)} 人
                  </div>
                </div>

                {/* 各團組行程 */}
                <div className="divide-y" style={{ borderColor: batchBorder }}>
                  {batchBlocks.map((block: any) => {
                    const bt: BlockType = block.blockType || 'free';
                    const cfg = BLOCK_CONFIG[bt];
                    const group = block.group as any;
                    const schoolList: any[] = group.school_list || [];

                    return (
                      <div key={`${block.groupId}_${block.date}`} className="px-3 py-2.5 flex items-start gap-3">
                        {/* 色塊指示器 */}
                        <div
                          className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center text-sm font-bold border mt-0.5"
                          style={{ backgroundColor: cfg.bg, borderColor: cfg.border, color: cfg.text }}
                        >
                          {cfg.icon || cfg.shortLabel.charAt(0)}
                        </div>
                        {/* 行程信息 */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-gray-800">{group.name}</span>
                            <span
                              className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                              style={{ backgroundColor: cfg.bg, color: cfg.text, border: `1px solid ${cfg.border}` }}
                            >
                              {bt === 'exchange' ? '★ 交流日' : cfg.label}
                            </span>
                          </div>
                          {/* 航班信息 */}
                          {block.flightNumber && (
                            <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                              <Plane className="w-3 h-3" />
                              <span>{block.flightNumber}</span>
                              {block.flightTime && <span>· {block.flightTime}</span>}
                            </div>
                          )}
                          {/* 學校列表 */}
                          {schoolList.length > 0 && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {schoolList.map((s: any, i: number) => (
                                <span key={i} className="text-[10px] bg-white/70 border border-gray-200 rounded px-1.5 py-0.5 text-gray-600">
                                  {s.name}（{s.studentCount}人）
                                </span>
                              ))}
                            </div>
                          )}
                          {/* 備注 */}
                          {block.notes && (
                            <div className="mt-1 text-xs text-gray-400 italic">{block.notes}</div>
                          )}
                        </div>
                        {/* 人數 */}
                        <div className="text-right flex-shrink-0">
                          <div className="text-sm font-bold text-gray-700">
                            {group.totalCount || (group.studentCount || 0) + (group.teacherCount || 0)}
                          </div>
                          <div className="text-[10px] text-gray-400">人</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ===== 餐飲統籌 Tab 組件 =====
function DiningCoordinationTab({ projectId, groups, project }: any) {
  const utils = trpc.useUtils();
  
  const dailyCardsQueries = groups.map((group: any) => 
    trpc.dailyCards.listByGroup.useQuery({ groupId: group.id })
  );
  
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
                  {dateList.map((date) => (
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
                {groups.map((group: any, gi: number) => {
                  const { data: cards = [] } = dailyCardsQueries[gi];
                  const cardMap = new Map(cards.map((c: any) => [
                    new Date(c.date).toISOString().split('T')[0], c
                  ]));
                  return (
                    <tr key={group.id}>
                      <td className="border p-2 sticky left-0 bg-background font-medium">
                        {group.name}
                      </td>
                      {dateList.map((date) => {
                        const card = cardMap.get(date) as any;
                        return (
                          <td key={date} className="border p-2 text-sm">
                            {card ? (
                              <div className="space-y-1">
                                {card.breakfast && (
                                  <div className="text-xs">🌅 {card.breakfast}</div>
                                )}
                                {card.lunch && (
                                  <div className="text-xs">☀️ {card.lunch}</div>
                                )}
                                {card.dinner && (
                                  <div className="text-xs">🌙 {card.dinner}</div>
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

// ===== 主組件 =====
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
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setLocation(`/projects/${projectId}/schedule`)}
            >
              <LayoutGrid className="w-4 h-4 mr-2" />
              排程總覽
            </Button>
            <Button
              className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600"
              onClick={() => setLocation(`/groups/new?projectId=${projectId}`)}
            >
              <Plus className="w-4 h-4 mr-2" />
              添加團組
            </Button>
          </div>
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
      <Tabs defaultValue="today" className="space-y-4">
        <TabsList>
          <TabsTrigger value="today" className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            當日行程
          </TabsTrigger>
          <TabsTrigger value="calendar" className="flex items-center gap-2">
            <LayoutGrid className="w-4 h-4" />
            行程儀表板
          </TabsTrigger>
          <TabsTrigger value="dining" className="flex items-center gap-2">
            <UtensilsCrossed className="w-4 h-4" />
            餐飲統籌
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="today">
          <TodayScheduleTab projectId={projectId} groups={groups || []} project={project} />
        </TabsContent>

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
