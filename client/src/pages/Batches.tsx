import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Plus, Pencil, Trash2, Users, Calendar, Plane, ChevronDown, ChevronRight, Layers } from "lucide-react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";

interface BatchFormData {
  projectId: number;
  code: string;
  name: string;
  arrivalDate: string;
  departureDate: string;
  arrivalFlight: string;
  departureFlight: string;
  arrivalTime: string;
  departureTime: string;
  notes: string;
}

const defaultForm = (projectId: number): BatchFormData => ({
  projectId,
  code: "",
  name: "",
  arrivalDate: "",
  departureDate: "",
  arrivalFlight: "",
  departureFlight: "",
  arrivalTime: "",
  departureTime: "",
  notes: "",
});

export default function Batches() {
  const [, setLocation] = useLocation();
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(() => {
    const saved = localStorage.getItem("edu-connect-project-id");
    return saved ? parseInt(saved) : null;
  });
  const [expandedBatches, setExpandedBatches] = useState<Set<number>>(new Set());
  const [createOpen, setCreateOpen] = useState(false);
  const [editBatch, setEditBatch] = useState<any | null>(null);
  const [form, setForm] = useState<BatchFormData>(defaultForm(selectedProjectId || 0));

  const { data: projects } = trpc.projects.list.useQuery();
  const { data: batches, refetch } = trpc.batches.listByProject.useQuery(
    { projectId: selectedProjectId! },
    { enabled: !!selectedProjectId }
  );

  const utils = trpc.useUtils();

  const createMutation = trpc.batches.create.useMutation({
    onSuccess: () => {
      toast.success("批次創建成功");
      setCreateOpen(false);
      setForm(defaultForm(selectedProjectId || 0));
      refetch();
    },
    onError: (e) => toast.error(e.message || "創建失敗"),
  });

  const updateMutation = trpc.batches.update.useMutation({
    onSuccess: () => {
      toast.success("批次已更新");
      setEditBatch(null);
      refetch();
    },
    onError: (e) => toast.error(e.message || "更新失敗"),
  });

  const deleteMutation = trpc.batches.delete.useMutation({
    onSuccess: () => {
      toast.success("批次已刪除");
      refetch();
    },
    onError: (e) => toast.error(e.message || "刪除失敗"),
  });

  const handleProjectChange = (id: number) => {
    setSelectedProjectId(id);
    localStorage.setItem("edu-connect-project-id", String(id));
    setForm(defaultForm(id));
  };

  const toggleExpand = (id: number) => {
    setExpandedBatches(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCreate = () => {
    if (!form.code) { toast.error("請填寫批次編號"); return; }
    if (!selectedProjectId) { toast.error("請先選擇項目"); return; }
    createMutation.mutate({ ...form, projectId: selectedProjectId });
  };

  const handleUpdate = () => {
    if (!editBatch) return;
    const { id, ...data } = editBatch;
    updateMutation.mutate({ id, ...data });
  };

  const openEdit = (batch: any) => {
    setEditBatch({
      id: batch.id,
      code: batch.code || "",
      name: batch.name || "",
      arrivalDate: batch.arrivalDate ? format(new Date(batch.arrivalDate), "yyyy-MM-dd") : "",
      departureDate: batch.departureDate ? format(new Date(batch.departureDate), "yyyy-MM-dd") : "",
      arrivalFlight: batch.arrivalFlight || "",
      departureFlight: batch.departureFlight || "",
      arrivalTime: batch.arrivalTime || "",
      departureTime: batch.departureTime || "",
      notes: batch.notes || "",
    });
  };

  const typeColors: Record<string, string> = {
    "小學": "bg-blue-100 text-blue-700",
    "中學": "bg-orange-100 text-orange-700",
  };

  return (
    <div className="space-y-6">
      {/* 頁面標題 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">批次管理</h1>
          <p className="text-muted-foreground mt-1">管理項目中的批次，每個批次包含多個同時抵離的團組</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button disabled={!selectedProjectId}>
              <Plus className="mr-2 h-4 w-4" />
              新建批次
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>新建批次</DialogTitle>
            </DialogHeader>
            <BatchForm form={form} onChange={setForm} />
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>取消</Button>
              <Button onClick={handleCreate} disabled={createMutation.isPending}>
                {createMutation.isPending ? "創建中..." : "創建批次"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* 項目選擇 */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-3">
            <Label className="whitespace-nowrap">選擇項目：</Label>
            <select
              className="flex h-10 flex-1 max-w-sm rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={selectedProjectId || ""}
              onChange={(e) => e.target.value && handleProjectChange(parseInt(e.target.value))}
            >
              <option value="">請選擇項目...</option>
              {projects?.map((p: any) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            {selectedProjectId && (
              <span className="text-sm text-muted-foreground">
                共 {batches?.length || 0} 個批次
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 批次列表 */}
      {!selectedProjectId ? (
        <div className="text-center py-16 text-muted-foreground">
          <Layers className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p>請先選擇一個項目</p>
        </div>
      ) : !batches || batches.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Layers className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p>該項目暫無批次，點擊「新建批次」開始</p>
        </div>
      ) : (
        <div className="space-y-4">
          {batches.map((batch: any) => {
            const isExpanded = expandedBatches.has(batch.id);
            const totalStudents = batch.groups?.reduce((sum: number, g: any) => sum + (g.studentCount || 0), 0) || 0;
            const totalPeople = batch.groups?.reduce((sum: number, g: any) => sum + (g.totalCount || 0), 0) || 0;

            return (
              <Card key={batch.id} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => toggleExpand(batch.id)}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {isExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                      </button>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-semibold">{batch.code}</h3>
                          {batch.name && <span className="text-muted-foreground">· {batch.name}</span>}
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Users className="h-3.5 w-3.5" />
                            {batch.groups?.length || 0} 個團組 · {totalPeople} 人（學生 {totalStudents} 人）
                          </span>
                          {batch.arrivalDate && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5" />
                              {format(new Date(batch.arrivalDate), "M/d", { locale: zhCN })}
                              {batch.departureDate && ` ~ ${format(new Date(batch.departureDate), "M/d", { locale: zhCN })}`}
                            </span>
                          )}
                          {batch.arrivalFlight && (
                            <span className="flex items-center gap-1">
                              <Plane className="h-3.5 w-3.5" />
                              ↓{batch.arrivalFlight}
                              {batch.departureFlight && ` ↑${batch.departureFlight}`}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(batch)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>確認刪除批次？</AlertDialogTitle>
                            <AlertDialogDescription>
                              刪除批次後，該批次下的所有團組將解除關聯（不會刪除團組）。此操作不可撤銷。
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>取消</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              onClick={() => deleteMutation.mutate({ id: batch.id })}
                            >
                              確認刪除
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardHeader>

                {isExpanded && (
                  <CardContent className="pt-0">
                    <div className="border-t pt-4">
                      {batch.groups?.length === 0 ? (
                        <div className="text-center py-6 text-muted-foreground text-sm">
                          <p>該批次暫無團組</p>
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-2"
                            onClick={() => setLocation(`/groups/new?batchId=${batch.id}&projectId=${selectedProjectId}`)}
                          >
                            <Plus className="mr-1 h-3.5 w-3.5" />
                            添加團組
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-sm font-medium text-muted-foreground">團組列表</h4>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setLocation(`/groups/new?batchId=${batch.id}&projectId=${selectedProjectId}`)}
                            >
                              <Plus className="mr-1 h-3.5 w-3.5" />
                              添加團組
                            </Button>
                          </div>
                          {batch.groups.map((group: any) => {
                            const typeArr = Array.isArray(group.type) ? group.type : (group.type ? [group.type] : []);
                            return (
                              <div
                                key={group.id}
                                className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer transition-colors"
                                onClick={() => setLocation(`/groups/${group.id}`)}
                              >
                                <div className="flex items-center gap-3">
                                  <div className="font-mono text-sm font-medium w-8">{group.code}</div>
                                  <div>
                                    <div className="text-sm font-medium">{group.name}</div>
                                    <div className="text-xs text-muted-foreground">
                                      學生 {group.studentCount} + 教師 {group.teacherCount} = {group.totalCount} 人
                                      {group.startCity && ` · ${group.startCity === 'hk' ? '香港進' : '深圳進'}`}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  {typeArr.map((t: string) => (
                                    <Badge key={t} variant="secondary" className={typeColors[t] || ""}>
                                      {t}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    {batch.notes && (
                      <div className="mt-3 pt-3 border-t text-sm text-muted-foreground">
                        <span className="font-medium">備注：</span>{batch.notes}
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* 編輯批次對話框 */}
      {editBatch && (
        <Dialog open={!!editBatch} onOpenChange={(open) => !open && setEditBatch(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>編輯批次</DialogTitle>
            </DialogHeader>
            <BatchForm form={editBatch} onChange={setEditBatch} />
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditBatch(null)}>取消</Button>
              <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "保存中..." : "保存更改"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function BatchForm({ form, onChange }: { form: any; onChange: (f: any) => void }) {
  const update = (field: string, value: string) => onChange((prev: any) => ({ ...prev, [field]: value }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>批次編號 *</Label>
          <Input
            value={form.code}
            onChange={(e) => update("code", e.target.value)}
            placeholder="例如：批次1"
          />
        </div>
        <div className="space-y-2">
          <Label>批次名稱</Label>
          <Input
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            placeholder="可選，例如：小學批次"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>抵達日期</Label>
          <Input
            type="date"
            value={form.arrivalDate}
            onChange={(e) => update("arrivalDate", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>離開日期</Label>
          <Input
            type="date"
            value={form.departureDate}
            onChange={(e) => update("departureDate", e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>抵達航班</Label>
          <Input
            value={form.arrivalFlight}
            onChange={(e) => update("arrivalFlight", e.target.value)}
            placeholder="例如：CZ3456"
          />
        </div>
        <div className="space-y-2">
          <Label>抵達時間</Label>
          <Input
            type="time"
            value={form.arrivalTime}
            onChange={(e) => update("arrivalTime", e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>離開航班</Label>
          <Input
            value={form.departureFlight}
            onChange={(e) => update("departureFlight", e.target.value)}
            placeholder="例如：CZ3457"
          />
        </div>
        <div className="space-y-2">
          <Label>離開時間</Label>
          <Input
            type="time"
            value={form.departureTime}
            onChange={(e) => update("departureTime", e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>備注</Label>
        <Textarea
          value={form.notes}
          onChange={(e) => update("notes", e.target.value)}
          placeholder="可選備注..."
          rows={2}
        />
      </div>
    </div>
  );
}
