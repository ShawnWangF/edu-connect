import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Plus, MapPin, Users, Phone, Edit, Trash2 } from "lucide-react";

export default function Locations() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    capacity: 100,
    applicableType: "all" as "all" | "elementary" | "middle" | "vip",
    contact: "",
    phone: "",
  });

  const { data: locations, refetch } = trpc.locations.list.useQuery();
  const utils = trpc.useUtils();

  const createMutation = trpc.locations.create.useMutation({
    onSuccess: () => {
      toast.success("景點創建成功！");
      setIsDialogOpen(false);
      resetForm();
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "創建失敗");
    },
  });

  const updateMutation = trpc.locations.update.useMutation({
    onSuccess: () => {
      toast.success("景點更新成功！");
      setIsDialogOpen(false);
      setEditingLocation(null);
      resetForm();
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "更新失敗");
    },
  });

  const deleteMutation = trpc.locations.delete.useMutation({
    onSuccess: () => {
      toast.success("景點已刪除");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "刪除失敗");
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      address: "",
      capacity: 100,
      applicableType: "all",
      contact: "",
      phone: "",
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name) {
      toast.error("請填寫景點名稱");
      return;
    }

    if (editingLocation) {
      updateMutation.mutate({ id: editingLocation.id, ...formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (location: any) => {
    setEditingLocation(location);
    setFormData({
      name: location.name,
      address: location.address || "",
      capacity: location.capacity,
      applicableType: location.applicableType,
      contact: location.contact || "",
      phone: location.phone || "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("確定要刪除這個景點嗎？")) {
      deleteMutation.mutate({ id });
    }
  };

  const typeMap = {
    all: "全部",
    elementary: "小學",
    middle: "中學",
    vip: "VIP",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">景點資源管理</h1>
          <p className="text-muted-foreground mt-1">管理可參訪的景點和場館</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            setEditingLocation(null);
            resetForm();
          }
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              添加景點
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingLocation ? "編輯景點" : "添加景點"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">景點名稱 *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="例如：香港科學館"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="capacity">容量</Label>
                  <Input
                    id="capacity"
                    type="number"
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">地址</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="詳細地址"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="applicableType">適用團組類型</Label>
                <Select
                  value={formData.applicableType}
                  onValueChange={(value: any) => setFormData({ ...formData, applicableType: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部</SelectItem>
                    <SelectItem value="elementary">小學</SelectItem>
                    <SelectItem value="middle">中學</SelectItem>
                    <SelectItem value="vip">VIP</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contact">聯系人</Label>
                  <Input
                    id="contact"
                    value={formData.contact}
                    onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                    placeholder="聯系人姓名"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">聯系電話</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="聯系電話"
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsDialogOpen(false);
                    setEditingLocation(null);
                    resetForm();
                  }}
                >
                  取消
                </Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingLocation ? "更新" : "創建"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {locations && locations.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {locations.map((location) => (
            <Card key={location.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-primary" />
                      {location.name}
                    </CardTitle>
                  </div>
                  <Badge variant={location.isActive ? "default" : "secondary"}>
                    {location.isActive ? "啟用" : "停用"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {location.address && (
                  <p className="text-sm text-muted-foreground">{location.address}</p>
                )}
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>容量: {location.capacity}</span>
                  </div>
                  <Badge variant="outline">{typeMap[location.applicableType]}</Badge>
                </div>
                {(location.contact || location.phone) && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    <span>
                      {location.contact} {location.phone && `· ${location.phone}`}
                    </span>
                  </div>
                )}
                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEdit(location)}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    編輯
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDelete(location.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    刪除
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            還沒有景點資源，點擊上方按鈕添加第一個景點
          </CardContent>
        </Card>
      )}
    </div>
  );
}
