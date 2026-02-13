import { useState } from "react";
import { useLocation, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, X } from "lucide-react";
import { toast } from "sonner";

export default function GroupEdit() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const groupId = parseInt(id || "0");

  const { data: group, isLoading } = trpc.groups.get.useQuery({ id: groupId });
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [customType, setCustomType] = useState("");

  // 初始化選中的類型
  useState(() => {
    if (group && Array.isArray(group.type)) {
      setSelectedTypes(group.type);
    }
  });

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
      type: selectedTypes,
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

  const toggleType = (type: string) => {
    setSelectedTypes(prev =>
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const addCustomType = () => {
    if (customType.trim() && !selectedTypes.includes(customType.trim())) {
      setSelectedTypes(prev => [...prev, customType.trim()]);
      setCustomType("");
    }
  };

  const removeType = (type: string) => {
    setSelectedTypes(prev => prev.filter(t => t !== type));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">加載中...</p>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">團組不存在</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => setLocation(`/groups/${groupId}`)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">編輯團組</h1>
          <p className="text-muted-foreground mt-1">{group.name}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>基本信息</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">團組名稱 *</Label>
                <Input id="name" name="name" defaultValue={group.name} required />
              </div>
              <div className="space-y-2">
                <Label>團組類型 *</Label>
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {["小學", "中學", "VIP"].map((type) => (
                      <div key={type} className="flex items-center gap-2">
                        <Checkbox
                          id={`type-${type}`}
                          checked={selectedTypes.includes(type)}
                          onCheckedChange={() => toggleType(type)}
                        />
                        <Label htmlFor={`type-${type}`} className="cursor-pointer">
                          {type}
                        </Label>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="自定義類型"
                      value={customType}
                      onChange={(e) => setCustomType(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addCustomType();
                        }
                      }}
                    />
                    <Button type="button" onClick={addCustomType}>
                      添加
                    </Button>
                  </div>
                  {selectedTypes.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {selectedTypes.map((type) => (
                        <Badge key={type} variant="secondary" className="gap-1">
                          {type}
                          <X
                            className="h-3 w-3 cursor-pointer"
                            onClick={() => removeType(type)}
                          />
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">開始日期 *</Label>
                <Input
                  id="startDate"
                  name="startDate"
                  type="date"
                  defaultValue={group.startDate.toString()}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">結束日期 *</Label>
                <Input
                  id="endDate"
                  name="endDate"
                  type="date"
                  defaultValue={group.endDate.toString()}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
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
              <div className="space-y-2">
                <Label htmlFor="color">標識顏色</Label>
                <Input
                  id="color"
                  name="color"
                  type="color"
                  defaultValue={group.color || "#52c41a"}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="studentCount">學生人數</Label>
                <Input
                  id="studentCount"
                  name="studentCount"
                  type="number"
                  defaultValue={group.studentCount}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="teacherCount">教師人數</Label>
                <Input
                  id="teacherCount"
                  name="teacherCount"
                  type="number"
                  defaultValue={group.teacherCount}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="totalCount">總人數</Label>
                <Input
                  id="totalCount"
                  name="totalCount"
                  type="number"
                  defaultValue={group.totalCount}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="hotel">住宿酒店</Label>
              <Input id="hotel" name="hotel" defaultValue={group.hotel || ""} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tags">標籤</Label>
              <Input
                id="tags"
                name="tags"
                defaultValue={group.tags || ""}
                placeholder="用逗號分隔多個標籤"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contact">聯系人</Label>
                <Input id="contact" name="contact" defaultValue={group.contact || ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">聯系電話</Label>
                <Input id="phone" name="phone" defaultValue={group.phone || ""} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="emergencyContact">緊急聯系人</Label>
                <Input
                  id="emergencyContact"
                  name="emergencyContact"
                  defaultValue={group.emergencyContact || ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="emergencyPhone">緊急電話</Label>
                <Input
                  id="emergencyPhone"
                  name="emergencyPhone"
                  defaultValue={group.emergencyPhone || ""}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">備註</Label>
              <Textarea
                id="notes"
                name="notes"
                defaultValue={group.notes || ""}
                rows={4}
              />
            </div>

            <div className="flex gap-4">
              <Button type="submit" disabled={updateMutation.isPending || selectedTypes.length === 0}>
                {updateMutation.isPending ? "保存中..." : "保存更改"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setLocation(`/groups/${groupId}`)}
              >
                取消
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
