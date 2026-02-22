import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { FileText, Plus, Trash2, Eye, Calendar, Users } from "lucide-react";

export default function Templates() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);

  const utils = trpc.useUtils();

  // 查詢所有模板和團組
  const { data: templates = [] } = trpc.templates.list.useQuery();
  const { data: groups = [] } = trpc.groups.list.useQuery();
  const { data: templateItineraries = [] } = trpc.templates.getItineraries.useQuery(
    { templateId: selectedTemplate?.id || 0 },
    { enabled: !!selectedTemplate }
  );

  // 創建模板mutation
  const createTemplateMutation = trpc.templates.create.useMutation({
    onSuccess: () => {
      toast.success("模板創建成功");
      utils.templates.list.invalidate();
      setIsCreateDialogOpen(false);
    },
    onError: (error) => toast.error(error.message),
  });

  // 刪除模板mutation
  const deleteTemplateMutation = trpc.templates.delete.useMutation({
    onSuccess: () => {
      toast.success("模板刪除成功");
      utils.templates.list.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const handleCreateTemplate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const sourceGroupId = formData.get("sourceGroupId");
    const selectedGroup = groups.find((g: any) => g.id === parseInt(sourceGroupId as string));
    
    if (!selectedGroup) {
      toast.error("請選擇源團組");
      return;
    }

    createTemplateMutation.mutate({
      name: formData.get("name") as string,
      description: formData.get("description") as string || undefined,
      days: selectedGroup.days,
      applicableTypes: selectedGroup.type ? (Array.isArray(selectedGroup.type) ? selectedGroup.type : [selectedGroup.type]) : undefined,
      sourceGroupId: parseInt(sourceGroupId as string),
    });
  };

  const handleDeleteTemplate = (id: number) => {
    if (!confirm("確定要刪除此模板嗎？")) return;
    deleteTemplateMutation.mutate({ id });
  };

  const handlePreviewTemplate = (template: any) => {
    setSelectedTemplate(template);
    setIsPreviewDialogOpen(true);
  };

  return (
    <div className="container py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">行程模板</h1>
          <p className="text-muted-foreground mt-1">
            將成功的團組保存為模板，快速複製到新團組
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          創建模板
        </Button>
      </div>

      {templates.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>暫無行程模板</p>
            <p className="text-sm mt-2">點擊右上角「創建模板」從現有團組保存模板</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((template: any) => (
            <Card key={template.id} className="border-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center justify-between">
                  <span>{template.name}</span>
                  <FileText className="h-5 w-5 text-muted-foreground" />
                </CardTitle>
                {template.description && (
                  <CardDescription>{template.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>{template.days}天</span>
                  </div>
                  {template.applicableTypes && template.applicableTypes.length > 0 && (
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      <span>{template.applicableTypes.join(", ")}</span>
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handlePreviewTemplate(template)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    預覽
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => handleDeleteTemplate(template.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 創建模板對話框 */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>創建行程模板</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateTemplate} className="space-y-4">
            <div>
              <Label htmlFor="sourceGroupId">選擇源團組 *</Label>
              <Select name="sourceGroupId" required>
                <SelectTrigger>
                  <SelectValue placeholder="選擇要保存為模板的團組" />
                </SelectTrigger>
                <SelectContent>
                  {groups.map((group: any) => (
                    <SelectItem key={group.id} value={group.id.toString()}>
                      {group.name} ({group.days}天)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground mt-1">
                將複製該團組的所有行程點到模板
              </p>
            </div>
            <div>
              <Label htmlFor="name">模板名稱 *</Label>
              <Input
                id="name"
                name="name"
                placeholder="如：小學組港進澳出5天"
                required
              />
            </div>
            <div>
              <Label htmlFor="description">模板描述</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="描述模板的特點和適用場景"
                rows={3}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                取消
              </Button>
              <Button type="submit">創建模板</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 預覽模板對話框 */}
      <Dialog open={isPreviewDialogOpen} onOpenChange={setIsPreviewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedTemplate?.name}</DialogTitle>
            {selectedTemplate?.description && (
              <p className="text-sm text-muted-foreground">{selectedTemplate.description}</p>
            )}
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-4 text-sm">
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>{selectedTemplate?.days}天行程</span>
              </div>
              {selectedTemplate?.applicableTypes && selectedTemplate.applicableTypes.length > 0 && (
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>適用：{selectedTemplate.applicableTypes.join(", ")}</span>
                </div>
              )}
            </div>

            <div className="border rounded-lg p-4">
              <h3 className="font-semibold mb-3">行程點列表</h3>
              {templateItineraries.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  此模板暫無行程點
                </p>
              ) : (
                <div className="space-y-2">
                  {templateItineraries.map((item: any, index: number) => (
                    <div key={index} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                      <div className="flex-shrink-0 w-16 text-sm text-muted-foreground">
                        第{item.dayNumber}天
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">{item.locationName}</div>
                        {item.startTime && item.endTime && (
                          <div className="text-sm text-muted-foreground">
                            {item.startTime} - {item.endTime}
                          </div>
                        )}
                        {item.description && (
                          <div className="text-sm text-muted-foreground mt-1">
                            {item.description}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setIsPreviewDialogOpen(false)}>關閉</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
