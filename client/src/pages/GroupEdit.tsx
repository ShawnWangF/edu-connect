import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export default function GroupEdit() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const groupId = parseInt(id || "0");

  const { data: group, isLoading } = trpc.groups.get.useQuery({ id: groupId });
  const updateMutation = trpc.groups.update.useMutation({
    onSuccess: () => {
      toast.success("團組已更新");
      setLocation(`/groups/${groupId}`);
    },
    onError: (error) => {
      toast.error(error.message || "更新失敗");
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const startDate = formData.get("startDate") as string;
    const endDate = formData.get("endDate") as string;
    const days = Math.ceil(
      (new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)
    ) + 1;

    updateMutation.mutate({
      id: groupId,
      name: formData.get("name") as string,
      startDate,
      endDate,
      days,
      type: formData.get("type") as "elementary" | "middle" | "vip",
      status: formData.get("status") as "preparing" | "ongoing" | "completed" | "cancelled",
      studentCount: parseInt(formData.get("studentCount") as string) || undefined,
      teacherCount: parseInt(formData.get("teacherCount") as string) || undefined,
      totalCount: parseInt(formData.get("totalCount") as string) || undefined,
      hotel: (formData.get("hotel") as string) || undefined,
      color: (formData.get("color") as string) || undefined,
      tags: (formData.get("tags") as string) || undefined,
      contact: (formData.get("contact") as string) || undefined,
      phone: (formData.get("phone") as string) || undefined,
      emergencyContact: (formData.get("emergencyContact") as string) || undefined,
      emergencyPhone: (formData.get("emergencyPhone") as string) || undefined,
      notes: (formData.get("notes") as string) || undefined,
    });
  };

  if (isLoading) {
    return <div className="text-center py-12">加載中...</div>;
  }

  if (!group) {
    return <div className="text-center py-12">團組不存在</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => setLocation(`/groups/${groupId}`)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">編輯團組</h1>
          <p className="text-muted-foreground mt-1">修改團組基本信息</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>團組信息</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">團組名稱 *</Label>
                <Input id="name" name="name" defaultValue={group.name} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">團組類型 *</Label>
                <Select name="type" defaultValue={group.type} required>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="elementary">小學</SelectItem>
                    <SelectItem value="middle">中學</SelectItem>
                    <SelectItem value="vip">VIP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">開始日期 *</Label>
                <Input 
                  id="startDate" 
                  name="startDate" 
                  type="date" 
                  defaultValue={typeof group.startDate === 'string' ? (group.startDate as string).split('T')[0] : new Date(group.startDate as Date).toISOString().split('T')[0]} 
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">結束日期 *</Label>
                <Input 
                  id="endDate" 
                  name="endDate" 
                  type="date" 
                  defaultValue={typeof group.endDate === 'string' ? (group.endDate as string).split('T')[0] : new Date(group.endDate as Date).toISOString().split('T')[0]} 
                  required 
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">狀態</Label>
              <Select name="status" defaultValue={group.status}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="preparing">準備中</SelectItem>
                  <SelectItem value="ongoing">進行中</SelectItem>
                  <SelectItem value="completed">已完成</SelectItem>
                  <SelectItem value="cancelled">已取消</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="border-t pt-4">
              <h3 className="font-medium mb-3">人數統計</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="studentCount">學生人數</Label>
                  <Input id="studentCount" name="studentCount" type="number" defaultValue={group.studentCount || ""} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="teacherCount">教師人數</Label>
                  <Input id="teacherCount" name="teacherCount" type="number" defaultValue={group.teacherCount || ""} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="totalCount">總人數</Label>
                  <Input id="totalCount" name="totalCount" type="number" defaultValue={group.totalCount || ""} />
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="font-medium mb-3">聯系信息</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contact">聯系人</Label>
                  <Input id="contact" name="contact" defaultValue={group.contact || ""} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">聯系電話</Label>
                  <Input id="phone" name="phone" defaultValue={group.phone || ""} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emergencyContact">緊急聯系人</Label>
                  <Input id="emergencyContact" name="emergencyContact" defaultValue={group.emergencyContact || ""} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emergencyPhone">緊急聯系電話</Label>
                  <Input id="emergencyPhone" name="emergencyPhone" defaultValue={group.emergencyPhone || ""} />
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="font-medium mb-3">其他信息</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="hotel">住宿酒店</Label>
                  <Input id="hotel" name="hotel" defaultValue={group.hotel || ""} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tags">標籤（用逗號分隔）</Label>
                  <Input id="tags" name="tags" defaultValue={group.tags || ""} placeholder="例如：重點團組,需特別關注" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="color">顏色標記</Label>
                  <Input id="color" name="color" type="color" defaultValue={group.color || "#3b82f6"} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">備註</Label>
                  <Textarea id="notes" name="notes" defaultValue={group.notes || ""} rows={4} />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setLocation(`/groups/${groupId}`)}>
                取消
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "保存中..." : "保存更改"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
