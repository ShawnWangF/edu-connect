import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Loader2, X } from "lucide-react";
import { format, addDays } from "date-fns";

export default function GroupNew() {
  const [, setLocation] = useLocation();
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    startDate: format(new Date(), "yyyy-MM-dd"),
    endDate: format(addDays(new Date(), 7), "yyyy-MM-dd"),
    days: 7,
    type: ["中學"] as string[],
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

  const [customType, setCustomType] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  
  // 獲取所有模板
  const { data: templates } = trpc.templates.list.useQuery();
  
  // 套用模板mutation
  const applyTemplateMutation = trpc.templates.applyTemplate.useMutation({
    onSuccess: (result) => {
      toast.success(`已從模板生成 ${result.createdCount} 個行程點！`);
    },
    onError: (error) => {
      toast.error(error.message || "套用模板失敗");
    },
  });

  const createMutation = trpc.groups.create.useMutation({
    onSuccess: async (data) => {
      toast.success("團組創建成功！");
      
      // 如果選擇了模板，套用模板
      if (selectedTemplateId) {
        await applyTemplateMutation.mutateAsync({
          templateId: selectedTemplateId,
          groupId: data.groupId,
          startDate: formData.startDate,
        });
      }
      
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

    if (formData.type.length === 0) {
      toast.error("請選擇至少一個團組類型");
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

  const toggleType = (type: string) => {
    setFormData(prev => ({
      ...prev,
      type: prev.type.includes(type)
        ? prev.type.filter(t => t !== type)
        : [...prev.type, type]
    }));
  };

  const addCustomType = () => {
    if (customType.trim() && !formData.type.includes(customType.trim())) {
      setFormData(prev => ({
        ...prev,
        type: [...prev.type, customType.trim()]
      }));
      setCustomType("");
    }
  };

  const removeType = (type: string) => {
    setFormData(prev => ({
      ...prev,
      type: prev.type.filter(t => t !== type)
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/groups")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">創建新團組</h1>
          <p className="text-muted-foreground mt-1">填寫團組基本信息</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>基本信息</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">團組名稱 *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  placeholder="例如：江蘇六天五夜粵港團"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="code">團組編號 *</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => updateField("code", e.target.value)}
                  placeholder="例如：TEST001"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>團組類型 *</Label>
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {["小學", "中學", "VIP"].map((type) => (
                    <div key={type} className="flex items-center gap-2">
                      <Checkbox
                        id={`type-${type}`}
                        checked={formData.type.includes(type)}
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
                {formData.type.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {formData.type.map((type) => (
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">開始日期 *</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => updateField("startDate", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">結束日期 *</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => updateField("endDate", e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="template">選擇行程模板（可選）</Label>
              <select
                id="template"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={selectedTemplateId || ""}
                onChange={(e) => setSelectedTemplateId(e.target.value ? Number(e.target.value) : null)}
              >
                <option value="">不使用模板（手動創建行程）</option>
                {templates?.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name} ({template.days}天)
                  </option>
                ))}
              </select>
              <p className="text-sm text-muted-foreground">
                選擇模板後，系統將自動根據開始日期生成完整行程框架
              </p>
            </div>

            <div className="space-y-2">
              <Label>行程天數</Label>
              <div className="text-2xl font-bold text-primary">{formData.days} 天</div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="studentCount">學生人數</Label>
                <Input
                  id="studentCount"
                  type="number"
                  min="0"
                  value={formData.studentCount}
                  onChange={(e) => updateField("studentCount", parseInt(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="teacherCount">教師人數</Label>
                <Input
                  id="teacherCount"
                  type="number"
                  min="0"
                  value={formData.teacherCount}
                  onChange={(e) => updateField("teacherCount", parseInt(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <Label>總人數</Label>
                <div className="text-2xl font-bold text-primary">{formData.totalCount}</div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="hotel">住宿酒店</Label>
              <Input
                id="hotel"
                value={formData.hotel}
                onChange={(e) => updateField("hotel", e.target.value)}
                placeholder="例如：香港迪士尼樂園酒店"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="color">標識顏色</Label>
              <div className="flex gap-4 items-center">
                <Input
                  id="color"
                  type="color"
                  value={formData.color}
                  onChange={(e) => updateField("color", e.target.value)}
                  className="w-20 h-10"
                />
                <div className="flex-1 h-10 rounded-md border" style={{ backgroundColor: formData.color }} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contact">聯系人</Label>
                <Input
                  id="contact"
                  value={formData.contact}
                  onChange={(e) => updateField("contact", e.target.value)}
                  placeholder="例如：張老師"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">聯系電話</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => updateField("phone", e.target.value)}
                  placeholder="例如：13800138000"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="emergencyContact">緊急聯系人</Label>
                <Input
                  id="emergencyContact"
                  value={formData.emergencyContact}
                  onChange={(e) => updateField("emergencyContact", e.target.value)}
                  placeholder="例如：李主任"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="emergencyPhone">緊急電話</Label>
                <Input
                  id="emergencyPhone"
                  value={formData.emergencyPhone}
                  onChange={(e) => updateField("emergencyPhone", e.target.value)}
                  placeholder="例如：13900139000"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">備註</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => updateField("notes", e.target.value)}
                placeholder="其他需要說明的信息..."
                rows={4}
              />
            </div>

            <div className="flex gap-4">
              <Button type="submit" disabled={createMutation.isPending || formData.type.length === 0}>
                {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                創建團組
              </Button>
              <Button type="button" variant="outline" onClick={() => setLocation("/groups")}>
                取消
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
