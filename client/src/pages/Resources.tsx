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
import { Hotel, Car, Users, Shield, MapPin, Plus, Edit, Trash2, Clock, X } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type TimeSlot = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
};

const WEEKDAYS = [
  { value: 0, label: "週日" },
  { value: 1, label: "週一" },
  { value: 2, label: "週二" },
  { value: 3, label: "週三" },
  { value: 4, label: "週四" },
  { value: 5, label: "週五" },
  { value: 6, label: "週六" },
];

export default function Resources() {
  const [activeTab, setActiveTab] = useState("hotels");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [resourceType, setResourceType] = useState<"hotels" | "vehicles" | "guides" | "securities" | "attractions">("hotels");
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [isAlwaysUnavailable, setIsAlwaysUnavailable] = useState(false);

  const utils = trpc.useUtils();

  // 查詢所有資源
  const { data: hotels = [] } = trpc.hotels.list.useQuery();
  const { data: vehicles = [] } = trpc.vehicles.list.useQuery();
  const { data: guides = [] } = trpc.guides.list.useQuery();
  const { data: securities = [] } = trpc.securities.list.useQuery();
  const { data: attractions = [] } = trpc.locations.list.useQuery();

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

  // 景點 mutations
  const createAttractionMutation = trpc.locations.create.useMutation({
    onSuccess: () => {
      toast.success("景點創建成功");
      utils.locations.list.invalidate();
      handleCloseDialog();
    },
    onError: (error) => toast.error(error.message),
  });

  const updateAttractionMutation = trpc.locations.update.useMutation({
    onSuccess: () => {
      toast.success("景點更新成功");
      utils.locations.list.invalidate();
      handleCloseDialog();
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteAttractionMutation = trpc.locations.delete.useMutation({
    onSuccess: () => {
      toast.success("景點刪除成功");
      utils.locations.list.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const handleOpenDialog = (type: typeof resourceType, item?: any) => {
    setResourceType(type);
    setEditingItem(item || null);
    
    // 如果是景點，初始化不可用時間狀態
    if (type === "attractions" && item) {
      setIsAlwaysUnavailable(item.isAlwaysUnavailable || false);
      setTimeSlots(Array.isArray(item.unavailableTimeSlots) ? item.unavailableTimeSlots : []);
    } else {
      setIsAlwaysUnavailable(false);
      setTimeSlots([]);
    }
    
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingItem(null);
    setTimeSlots([]);
    setIsAlwaysUnavailable(false);
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
        case "attractions":
          updateAttractionMutation.mutate({
            ...data,
            isAlwaysUnavailable,
            unavailableTimeSlots: timeSlots,
          });
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
        case "attractions":
          createAttractionMutation.mutate({
            ...data,
            isAlwaysUnavailable,
            unavailableTimeSlots: timeSlots,
          });
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
      case "attractions":
        deleteAttractionMutation.mutate({ id });
        break;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">資源管理</h1>
        <p className="text-muted-foreground mt-1">管理酒店、車輛、導遊、安保、景點等資源信息</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
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
          <TabsTrigger value="attractions" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            景點
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

        {/* 景點 */}
        <TabsContent value="attractions" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => handleOpenDialog("attractions")}>
              <Plus className="mr-2 h-4 w-4" />
              添加景點
            </Button>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {attractions.map((attraction: any) => (
              <Card key={attraction.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{attraction.name}</span>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => handleOpenDialog("attractions", attraction)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => handleDelete("attractions", attraction.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {attraction.address && <p>地址：{attraction.address}</p>}
                  {attraction.openingHours && <p>開放時間：{attraction.openingHours}</p>}
                  {attraction.capacity && <p>最大接待：{attraction.capacity}人</p>}
                  {attraction.isAlwaysUnavailable && (
                    <p className="text-destructive flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      永久不可用
                    </p>
                  )}
                  {!attraction.isAlwaysUnavailable && Array.isArray(attraction.unavailableTimeSlots) && attraction.unavailableTimeSlots.length > 0 && (
                    <p className="text-amber-600 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {attraction.unavailableTimeSlots.length}個不可用時間段
                    </p>
                  )}
                  {attraction.notes && <p className="text-muted-foreground">{attraction.notes}</p>}
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

            {resourceType === "attractions" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="name">景點名稱 *</Label>
                  <Input id="name" name="name" defaultValue={editingItem?.name} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">地址</Label>
                  <Input id="address" name="address" defaultValue={editingItem?.address} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="openingHours">開放時間</Label>
                  <Input id="openingHours" name="openingHours" defaultValue={editingItem?.openingHours} placeholder="例如：09:00-18:00" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="capacity">最大接待人數</Label>
                  <Input id="capacity" name="capacity" type="number" defaultValue={editingItem?.capacity} />
                </div>
                
                {/* 不可用時間管理 */}
                <div className="space-y-3 border-t pt-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="alwaysUnavailable"
                      checked={isAlwaysUnavailable}
                      onCheckedChange={(checked) => setIsAlwaysUnavailable(checked as boolean)}
                    />
                    <Label htmlFor="alwaysUnavailable" className="font-normal">
                      此景點永久不可用
                    </Label>
                  </div>

                  {!isAlwaysUnavailable && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>不可用時間段</Label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setTimeSlots([...timeSlots, { dayOfWeek: 1, startTime: "09:00", endTime: "17:00" }])}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          添加時間段
                        </Button>
                      </div>
                      {timeSlots.map((slot, index) => (
                        <div key={index} className="flex gap-2 items-center">
                          <Select
                            value={slot.dayOfWeek.toString()}
                            onValueChange={(value) => {
                              const newSlots = [...timeSlots];
                              newSlots[index].dayOfWeek = parseInt(value);
                              setTimeSlots(newSlots);
                            }}
                          >
                            <SelectTrigger className="w-24">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {WEEKDAYS.map((day) => (
                                <SelectItem key={day.value} value={day.value.toString()}>
                                  {day.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Input
                            type="time"
                            value={slot.startTime}
                            onChange={(e) => {
                              const newSlots = [...timeSlots];
                              newSlots[index].startTime = e.target.value;
                              setTimeSlots(newSlots);
                            }}
                            className="w-32"
                          />
                          <span>至</span>
                          <Input
                            type="time"
                            value={slot.endTime}
                            onChange={(e) => {
                              const newSlots = [...timeSlots];
                              newSlots[index].endTime = e.target.value;
                              setTimeSlots(newSlots);
                            }}
                            className="w-32"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => setTimeSlots(timeSlots.filter((_, i) => i !== index))}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
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
