import { useParams, useLocation } from 'wouter';
import { trpc } from '../lib/trpc';
import { Button } from '../components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { ArrowLeft, Calendar, Users, Plus } from 'lucide-react';
import { CalendarMatrix } from '../components/CalendarMatrix';

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

      {/* 多團組日曆矩陣 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-purple-500" />
            行程儀表盤
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-2">
            一覽所有團組的行程安排，紅色標記表示資源衝突
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
    </div>
  );
}
