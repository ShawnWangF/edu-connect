import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Loader2 } from "lucide-react";
import { format, addDays } from "date-fns";

export default function GroupNew() {
  const [, setLocation] = useLocation();
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    startDate: format(new Date(), "yyyy-MM-dd"),
    endDate: format(addDays(new Date(), 7), "yyyy-MM-dd"),
    days: 7,
    type: "middle" as "elementary" | "middle" | "vip",
    studentCount: 0,
    teacherCount: 0,
    totalCount: 0,
    hotel: "",
    color: "#52c41a",
    contact: "",
    phone: "",
    emergencyContact: "",
    emergencyPhone: "",
    notes: "",
  });

  const createMutation = trpc.groups.create.useMutation({
    onSuccess: () => {
      toast.success("團組創建成功！");
      setLocation("/groups");
    },
    onError: (error) => {
      toast.error(error.message || "創建失敗");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.code) {
      toast.error("請填寫團組名稱和編號");
      return;
    }

    createMutation.mutate(formData);
  };

  const updateField = (field: string, value: any) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };
      
      // 自動計算總人數
      if (field === "studentCount" || field === "teacherCount") {
        updated.totalCount = (updated.studentCount || 0) + (updated.teacherCount || 0);
      }
      
      // 自動計算天數
      if (field === "startDate" || field === "endDate") {
        const start = new Date(updated.startDate);
        const end = new Date(updated.endDate);
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        updated.days = diffDays;
      }
      
      return updated;
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/groups")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">新建團組</h1>
          <p className="text-muted-foreground mt-1">填寫團組基本信息</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>基本信息</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">團組名稱 *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  placeholder="例如：深圳中學2024春季交流團"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="code">團組編號 *</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => updateField("code", e.target.value)}
                  placeholder="例如：SZ2024001"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">開始日期</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => updateField("startDate", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">結束日期</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => updateField("endDate", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="days">行程天數</Label>
                <Input
                  id="days"
                  type="number"
                  value={formData.days}
                  readOnly
                  className="bg-muted"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type">團組類型</Label>
                <Select value={formData.type} onValueChange={(value: any) => updateField("type", value)}>
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
              <div className="space-y-2">
                <Label htmlFor="hotel">住宿酒店</Label>
                <Input
                  id="hotel"
                  value={formData.hotel}
                  onChange={(e) => updateField("hotel", e.target.value)}
                  placeholder="例如：香港九龍酒店"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="studentCount">學生人數</Label>
                <Input
                  id="studentCount"
                  type="number"
                  value={formData.studentCount}
                  onChange={(e) => updateField("studentCount", parseInt(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="teacherCount">教師人數</Label>
                <Input
                  id="teacherCount"
                  type="number"
                  value={formData.teacherCount}
                  onChange={(e) => updateField("teacherCount", parseInt(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="totalCount">總人數</Label>
                <Input
                  id="totalCount"
                  type="number"
                  value={formData.totalCount}
                  readOnly
                  className="bg-muted"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contact">聯系人</Label>
                <Input
                  id="contact"
                  value={formData.contact}
                  onChange={(e) => updateField("contact", e.target.value)}
                  placeholder="聯系人姓名"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">聯系電話</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => updateField("phone", e.target.value)}
                  placeholder="聯系電話"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="emergencyContact">緊急聯系人</Label>
                <Input
                  id="emergencyContact"
                  value={formData.emergencyContact}
                  onChange={(e) => updateField("emergencyContact", e.target.value)}
                  placeholder="緊急聯系人姓名"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="emergencyPhone">緊急電話</Label>
                <Input
                  id="emergencyPhone"
                  value={formData.emergencyPhone}
                  onChange={(e) => updateField("emergencyPhone", e.target.value)}
                  placeholder="緊急聯系電話"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">備註</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => updateField("notes", e.target.value)}
                placeholder="其他備註信息..."
                rows={4}
              />
            </div>

            <div className="flex gap-3 justify-end">
              <Button type="button" variant="outline" onClick={() => setLocation("/groups")}>
                取消
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    創建中...
                  </>
                ) : (
                  "創建團組"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
