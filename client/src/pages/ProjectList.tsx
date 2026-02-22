import { useState } from 'react';
import { useLocation } from 'wouter';
import { trpc } from '../lib/trpc';
import { Button } from '../components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Plus, Calendar, Users, FileText } from 'lucide-react';
import { toast as showToast } from 'sonner';

export function ProjectList() {
  const [, setLocation] = useLocation();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  
  const { data: projects, isLoading } = trpc.projects.list.useQuery();
  const createMutation = trpc.projects.create.useMutation({
    onSuccess: () => {
      showToast.success('項目創建成功');
      setIsCreateDialogOpen(false);
      window.location.reload();
    },
    onError: (error) => {
      showToast.error(`創建失敗：${error.message}`);
    },
  });

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    startDate: '',
    endDate: '',
  });

  const handleCreate = () => {
    if (!formData.code || !formData.name || !formData.startDate || !formData.endDate) {
      showToast.error('請填寫必填字段');
      return;
    }
    createMutation.mutate(formData);
  };

  if (isLoading) {
    return <div className="p-8">加載中...</div>;
  }

  return (
    <div className="container py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 bg-clip-text text-transparent">
            項目總覽
          </h1>
          <p className="text-muted-foreground mt-2">管理多個團組的統籌項目</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600">
              <Plus className="w-4 h-4 mr-2" />
              創建項目
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>創建新項目</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>項目編號 *</Label>
                <Input
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="例：JS202410"
                />
              </div>
              <div>
                <Label>項目名稱 *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="例：10月江蘇交流團"
                />
              </div>
              <div>
                <Label>項目描述</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="項目簡介..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>開始日期 *</Label>
                  <Input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  />
                </div>
                <div>
                  <Label>結束日期 *</Label>
                  <Input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  />
                </div>
              </div>
              <Button onClick={handleCreate} className="w-full" disabled={createMutation.isPending}>
                {createMutation.isPending ? '創建中...' : '創建項目'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects?.map((project) => (
          <Card
            key={project.id}
            className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-purple-300"
            onClick={() => setLocation(`/projects/${project.id}`)}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-purple-500" />
                {project.name}
              </CardTitle>
              <CardDescription>{project.code}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  {new Date(project.startDate).toLocaleDateString()} 至 {new Date(project.endDate).toLocaleDateString()}
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Users className="w-4 h-4" />
                  學生 {project.totalStudents} 人 · 教師 {project.totalTeachers} 人
                </div>
                {project.description && (
                  <p className="text-muted-foreground line-clamp-2 mt-2">{project.description}</p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {projects?.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <FileText className="w-16 h-16 mx-auto mb-4 opacity-20" />
          <p>還沒有項目，點擊右上角創建第一個項目</p>
        </div>
      )}
    </div>
  );
}
