import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Hotel, Car, Users, Shield, Plus, Edit, Trash2 } from "lucide-react";

export default function Resources() {
  const [activeTab, setActiveTab] = useState("hotels");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [resourceType, setResourceType] = useState<"hotels" | "vehicles" | "guides" | "securities">("hotels");

  const utils = trpc.useUtils();

  // 查詢所有資源
  const { data: hotels = [] } = trpc.hotels.list.useQuery();
  const { data: vehicles = [] } = trpc.vehicles.list.useQuery();
  const { data: guides = [] } = trpc.guides.list.useQuery();
  const { data: securities = [] } = trpc.securities.list.useQuery();

  // 創建mutations
  const createHotelMutation = trpc.hotels.create.useMutation({
    onSuccess: () => {
      toast.success("酒店創建成功");
      utils.hotels.list.invalidate();
      handleCloseDialog();
    },
    onError: (error) => toast.error(error.message),
  });

  const createVehicleMutation = trpc.vehicles.create.useMutation({
    onSuccess: () => {
      toast.success("車輛創建成功");
      utils.vehicles.list.invalidate();
      handleCloseDialog();
    },
    onError: (error) => toast.error(error.message),
  });

  const createGuideMutation = trpc.guides.create.useMutation({
    onSuccess: () => {
      toast.success("導遊創建成功");
      utils.guides.list.invalidate();
      handleCloseDialog();
    },
    onError: (error) => toast.error(error.message),
  });

  const createSecurityMutation = trpc.securities.create.useMutation({
    onSuccess: () => {
      toast.success("安保人員創建成功");
      utils.securities.list.invalidate();
      handleCloseDialog();
    },
    onError: (error) => toast.error(error.message),
  });

  // 更新mutations
  const updateHotelMutation = trpc.hotels.update.useMutation({
    onSuccess: () => {
      toast.success("酒店更新成功");
      utils.hotels.list.invalidate();
      handleCloseDialog();
    },
    onError: (error) => toast.error(error.message),
  });

  const updateVehicleMutation = trpc.vehicles.update.useMutation({
    onSuccess: () => {
      toast.success("車輛更新成功");
      utils.vehicles.list.invalidate();
      handleCloseDialog();
    },
    onError: (error) => toast.error(error.message),
  });

  const updateGuideMutation = trpc.guides.update.useMutation({
    onSuccess: () => {
      toast.success("導遊更新成功");
      utils.guides.list.invalidate();
      handleCloseDialog();
    },
    onError: (error) => toast.error(error.message),
  });

  const updateSecurityMutation = trpc.securities.update.useMutation({
    onSuccess: () => {
      toast.success("安保人員更新成功");
      utils.securities.list.invalidate();
      handleCloseDialog();
    },
    onError: (error) => toast.error(error.message),
  });

  // 刪除mutations
  const deleteHotelMutation = trpc.hotels.delete.useMutation({
    onSuccess: () => {
      toast.success("酒店刪除成功");
      utils.hotels.list.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteVehicleMutation = trpc.vehicles.delete.useMutation({
    onSuccess: () => {
      toast.success("車輛刪除成功");
      utils.vehicles.list.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteGuideMutation = trpc.guides.delete.useMutation({
    onSuccess: () => {
      toast.success("導遊刪除成功");
      utils.guides.list.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteSecurityMutation = trpc.securities.delete.useMutation({
    onSuccess: () => {
      toast.success("安保人員刪除成功");
      utils.securities.list.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const handleOpenDialog = (type: typeof resourceType, item?: any) => {
    setResourceType(type);
    setEditingItem(item || null);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingItem(null);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data: any = {};
    
    formData.forEach((value, key) => {
      if (value) {
        data[key] = key === "roomCount" || key === "capacity" ? parseInt(value as string) : value;
      }
    });

    if (editingItem) {
      data.id = editingItem.id;
      switch (resourceType) {
        case "hotels":
          updateHotelMutation.mutate(data);
          break;
        case "vehicles":
          updateVehicleMutation.mutate(data);
          break;
        case "guides":
          updateGuideMutation.mutate(data);
          break;
        case "securities":
          updateSecurityMutation.mutate(data);
          break;
      }
    } else {
      switch (resourceType) {
        case "hotels":
          createHotelMutation.mutate(data);
          break;
        case "vehicles":
          createVehicleMutation.mutate(data);
          break;
        case "guides":
          createGuideMutation.mutate(data);
          break;
        case "securities":
          createSecurityMutation.mutate(data);
          break;
      }
    }
  };

  const handleDelete = (type: typeof resourceType, id: number) => {
    if (!confirm("確定要刪除嗎？")) return;
    
    switch (type) {
      case "hotels":
        deleteHotelMutation.mutate({ id });
        break;
      case "vehicles":
        deleteVehicleMutation.mutate({ id });
        break;
      case "guides":
        deleteGuideMutation.mutate({ id });
        break;
      case "securities":
        deleteSecurityMutation.mutate({ id });
        break;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">資源管理</h1>
        <p className="text-muted-foreground mt-1">管理酒店、車輛、導遊、安保等資源信息</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="hotels" className="flex items-center gap-2">
            <Hotel className="h-4 w-4" />
            酒店
          </TabsTrigger>
          <TabsTrigger value="vehicles" className="flex items-center gap-2">
            <Car className="h-4 w-4" />
            車輛
          </TabsTrigger>
          <TabsTrigger value="guides" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            導遊
          </TabsTrigger>
          <TabsTrigger value="securities" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            安保
          </TabsTrigger>
        </TabsList>

        {/* 酒店 */}
        <TabsContent value="hotels" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => handleOpenDialog("hotels")}>
              <Plus className="mr-2 h-4 w-4" />
              添加酒店
            </Button>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {hotels.map((hotel: any) => (
              <Card key={hotel.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{hotel.name}</span>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => handleOpenDialog("hotels", hotel)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => handleDelete("hotels", hotel.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {hotel.address && <p className="text-muted-foreground">{hotel.address}</p>}
                  {hotel.contact && <p>聯繫人：{hotel.contact}</p>}
                  {hotel.phone && <p>電話：{hotel.phone}</p>}
                  {hotel.roomCount && <p>房間數：{hotel.roomCount}</p>}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* 車輛 */}
        <TabsContent value="vehicles" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => handleOpenDialog("vehicles")}>
              <Plus className="mr-2 h-4 w-4" />
              添加車輛
            </Button>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {vehicles.map((vehicle: any) => (
              <Card key={vehicle.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{vehicle.plate}</span>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => handleOpenDialog("vehicles", vehicle)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => handleDelete("vehicles", vehicle.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {vehicle.driverName && <p>司機：{vehicle.driverName}</p>}
                  {vehicle.driverPhone && <p>電話：{vehicle.driverPhone}</p>}
                  {vehicle.capacity && <p>座位數：{vehicle.capacity}</p>}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* 導遊 */}
        <TabsContent value="guides" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => handleOpenDialog("guides")}>
              <Plus className="mr-2 h-4 w-4" />
              添加導遊
            </Button>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {guides.map((guide: any) => (
              <Card key={guide.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{guide.name}</span>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => handleOpenDialog("guides", guide)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => handleDelete("guides", guide.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {guide.phone && <p>電話：{guide.phone}</p>}
                  {guide.languages && <p>語言：{guide.languages}</p>}
                  {guide.specialties && <p>專長：{guide.specialties}</p>}
                  {guide.notes && <p className="text-muted-foreground">{guide.notes}</p>}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* 安保 */}
        <TabsContent value="securities" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => handleOpenDialog("securities")}>
              <Plus className="mr-2 h-4 w-4" />
              添加安保人員
            </Button>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {securities.map((security: any) => (
              <Card key={security.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{security.name}</span>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => handleOpenDialog("securities", security)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => handleDelete("securities", security.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {security.phone && <p>電話：{security.phone}</p>}
                  {security.idCard && <p>證件號：{security.idCard}</p>}
                  {security.company && <p>公司：{security.company}</p>}
                  {security.notes && <p className="text-muted-foreground">{security.notes}</p>}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* 通用對話框 */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingItem ? "編輯" : "添加"}
              {resourceType === "hotels" && "酒店"}
              {resourceType === "vehicles" && "車輛"}
              {resourceType === "guides" && "導遊"}
              {resourceType === "securities" && "安保人員"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {resourceType === "hotels" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="name">酒店名稱 *</Label>
                  <Input id="name" name="name" defaultValue={editingItem?.name} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">地址</Label>
                  <Input id="address" name="address" defaultValue={editingItem?.address} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact">聯繫人</Label>
                  <Input id="contact" name="contact" defaultValue={editingItem?.contact} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">電話</Label>
                  <Input id="phone" name="phone" defaultValue={editingItem?.phone} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="roomCount">房間數</Label>
                  <Input id="roomCount" name="roomCount" type="number" defaultValue={editingItem?.roomCount} />
                </div>
              </>
            )}

            {resourceType === "vehicles" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="plate">車牌號 *</Label>
                  <Input id="plate" name="plate" defaultValue={editingItem?.plate} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="driverName">司機姓名</Label>
                  <Input id="driverName" name="driverName" defaultValue={editingItem?.driverName} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="driverPhone">司機電話</Label>
                  <Input id="driverPhone" name="driverPhone" defaultValue={editingItem?.driverPhone} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="capacity">座位數</Label>
                  <Input id="capacity" name="capacity" type="number" defaultValue={editingItem?.capacity} />
                </div>
              </>
            )}

            {resourceType === "guides" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="name">姓名 *</Label>
                  <Input id="name" name="name" defaultValue={editingItem?.name} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">電話</Label>
                  <Input id="phone" name="phone" defaultValue={editingItem?.phone} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="languages">語言能力</Label>
                  <Input id="languages" name="languages" defaultValue={editingItem?.languages} placeholder="例如：粵語、普通話、英語" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="specialties">專長領域</Label>
                  <Input id="specialties" name="specialties" defaultValue={editingItem?.specialties} placeholder="例如：歷史文化、自然景觀" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">備註</Label>
                  <Textarea id="notes" name="notes" defaultValue={editingItem?.notes} rows={3} />
                </div>
              </>
            )}

            {resourceType === "securities" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="name">姓名 *</Label>
                  <Input id="name" name="name" defaultValue={editingItem?.name} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">電話</Label>
                  <Input id="phone" name="phone" defaultValue={editingItem?.phone} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="idCard">證件號</Label>
                  <Input id="idCard" name="idCard" defaultValue={editingItem?.idCard} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company">所屬公司</Label>
                  <Input id="company" name="company" defaultValue={editingItem?.company} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">備註</Label>
                  <Textarea id="notes" name="notes" defaultValue={editingItem?.notes} rows={3} />
                </div>
              </>
            )}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                取消
              </Button>
              <Button type="submit">
                {editingItem ? "保存" : "創建"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
