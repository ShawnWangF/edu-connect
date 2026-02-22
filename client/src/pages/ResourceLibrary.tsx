import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { MapPin, UtensilsCrossed, School, Plus, Edit, Trash2, Search } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function ResourceLibrary() {
  const [activeTab, setActiveTab] = useState("attractions");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const utils = trpc.useUtils();

  // 查詢所有資源
  const { data: attractions = [] } = trpc.locations.list.useQuery();
  const { data: restaurants = [] } = trpc.restaurants.list.useQuery();
  const { data: schools = [] } = trpc.schools.list.useQuery();

  // 餐廳mutations
  const createRestaurantMutation = trpc.restaurants.create.useMutation({
    onSuccess: () => {
      toast.success("餐廳創建成功");
      utils.restaurants.list.invalidate();
      handleCloseDialog();
    },
    onError: (error) => toast.error(error.message),
  });

  const updateRestaurantMutation = trpc.restaurants.update.useMutation({
    onSuccess: () => {
      toast.success("餐廳更新成功");
      utils.restaurants.list.invalidate();
      handleCloseDialog();
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteRestaurantMutation = trpc.restaurants.delete.useMutation({
    onSuccess: () => {
      toast.success("餐廳刪除成功");
      utils.restaurants.list.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  // 學校mutations
  const createSchoolMutation = trpc.schools.create.useMutation({
    onSuccess: () => {
      toast.success("學校創建成功");
      utils.schools.list.invalidate();
      handleCloseDialog();
    },
    onError: (error) => toast.error(error.message),
  });

  const updateSchoolMutation = trpc.schools.update.useMutation({
    onSuccess: () => {
      toast.success("學校更新成功");
      utils.schools.list.invalidate();
      handleCloseDialog();
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteSchoolMutation = trpc.schools.delete.useMutation({
    onSuccess: () => {
      toast.success("學校刪除成功");
      utils.schools.list.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const handleOpenDialog = (type: string, item?: any) => {
    setActiveTab(type);
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
      if (key === "capacity") {
        data[key] = parseInt(value as string) || 0;
      } else {
        data[key] = value;
      }
    });

    if (activeTab === "restaurants") {
      if (editingItem) {
        updateRestaurantMutation.mutate({ id: editingItem.id, ...data });
      } else {
        createRestaurantMutation.mutate(data);
      }
    } else if (activeTab === "schools") {
      if (editingItem) {
        updateSchoolMutation.mutate({ id: editingItem.id, ...data });
      } else {
        createSchoolMutation.mutate(data);
      }
    }
  };

  const handleDelete = (type: string, id: number) => {
    if (!confirm("確定要刪除此資源嗎？")) return;
    
    if (type === "restaurants") {
      deleteRestaurantMutation.mutate({ id });
    } else if (type === "schools") {
      deleteSchoolMutation.mutate({ id });
    }
  };

  // 搜索過濾
  const filterItems = (items: any[]) => {
    if (!searchQuery) return items;
    return items.filter((item) =>
      item.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.address?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  return (
    <div className="container py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">資源庫</h1>
          <p className="text-muted-foreground mt-1">
            統一管理景點、餐廳、學校等資源，支持行程快速選擇
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="attractions" className="gap-2">
            <MapPin className="h-4 w-4" />
            景點資源
          </TabsTrigger>
          <TabsTrigger value="restaurants" className="gap-2">
            <UtensilsCrossed className="h-4 w-4" />
            餐廳資源
          </TabsTrigger>
          <TabsTrigger value="schools" className="gap-2">
            <School className="h-4 w-4" />
            學校資源
          </TabsTrigger>
        </TabsList>

        {/* 景點資源 */}
        <TabsContent value="attractions">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>景點列表</CardTitle>
                <div className="flex gap-2">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="搜索景點..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8 w-64"
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground mb-4">
                景點資源管理功能已在「資源管理」頁面實現，請前往該頁面進行操作
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filterItems(attractions).map((item: any) => (
                  <Card key={item.id} className="border-2">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center justify-between">
                        <span>{item.name}</span>
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      {item.address && (
                        <div className="text-muted-foreground">{item.address}</div>
                      )}
                      {item.capacity > 0 && (
                        <div className="text-muted-foreground">容量：{item.capacity}人</div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 餐廳資源 */}
        <TabsContent value="restaurants">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>餐廳列表</CardTitle>
                <div className="flex gap-2">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="搜索餐廳..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8 w-64"
                    />
                  </div>
                  <Button onClick={() => handleOpenDialog("restaurants")}>
                    <Plus className="h-4 w-4 mr-2" />
                    添加餐廳
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {restaurants.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  暫無餐廳資源，點擊右上角「添加餐廳」開始創建
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {filterItems(restaurants).map((item: any) => (
                    <Card key={item.id} className="border-2">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center justify-between">
                          <span>{item.name}</span>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleOpenDialog("restaurants", item)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive"
                              onClick={() => handleDelete("restaurants", item.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        {item.address && (
                          <div className="text-muted-foreground">{item.address}</div>
                        )}
                        <div className="flex gap-4">
                          {item.capacity > 0 && (
                            <span className="text-muted-foreground">容量：{item.capacity}人</span>
                          )}
                          {item.cuisine && (
                            <span className="text-muted-foreground">菜系：{item.cuisine}</span>
                          )}
                        </div>
                        {item.phone && (
                          <div className="text-muted-foreground">電話：{item.phone}</div>
                        )}
                        {item.priceRange && (
                          <div className="text-muted-foreground">價格：{item.priceRange}</div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 學校資源 */}
        <TabsContent value="schools">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>學校列表</CardTitle>
                <div className="flex gap-2">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="搜索學校..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8 w-64"
                    />
                  </div>
                  <Button onClick={() => handleOpenDialog("schools")}>
                    <Plus className="h-4 w-4 mr-2" />
                    添加學校
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {schools.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  暫無學校資源，點擊右上角「添加學校」開始創建
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {filterItems(schools).map((item: any) => (
                    <Card key={item.id} className="border-2">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center justify-between">
                          <span>{item.name}</span>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleOpenDialog("schools", item)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive"
                              onClick={() => handleDelete("schools", item.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        {item.region && (
                          <div className="inline-block px-2 py-1 rounded-full bg-primary/10 text-primary text-xs">
                            {item.region}
                          </div>
                        )}
                        {item.address && (
                          <div className="text-muted-foreground">{item.address}</div>
                        )}
                        {item.contactPerson && (
                          <div className="text-muted-foreground">
                            聯繫人：{item.contactPerson}
                            {item.contactPhone && ` (${item.contactPhone})`}
                          </div>
                        )}
                        {item.capacity > 0 && (
                          <div className="text-muted-foreground">可接待：{item.capacity}人</div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 添加/編輯對話框 */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? "編輯" : "添加"}
              {activeTab === "restaurants" ? "餐廳" : "學校"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {activeTab === "restaurants" && (
              <>
                <div>
                  <Label htmlFor="name">餐廳名稱 *</Label>
                  <Input
                    id="name"
                    name="name"
                    defaultValue={editingItem?.name}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="address">地址</Label>
                  <Textarea
                    id="address"
                    name="address"
                    defaultValue={editingItem?.address}
                    rows={2}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="phone">聯繫電話</Label>
                    <Input
                      id="phone"
                      name="phone"
                      defaultValue={editingItem?.phone}
                    />
                  </div>
                  <div>
                    <Label htmlFor="capacity">容量（人數）</Label>
                    <Input
                      id="capacity"
                      name="capacity"
                      type="number"
                      defaultValue={editingItem?.capacity || 0}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="cuisine">菜系</Label>
                    <Input
                      id="cuisine"
                      name="cuisine"
                      defaultValue={editingItem?.cuisine}
                      placeholder="如：粵菜、川菜"
                    />
                  </div>
                  <div>
                    <Label htmlFor="priceRange">價格區間</Label>
                    <Input
                      id="priceRange"
                      name="priceRange"
                      defaultValue={editingItem?.priceRange}
                      placeholder="如：50-100元/人"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="notes">備註</Label>
                  <Textarea
                    id="notes"
                    name="notes"
                    defaultValue={editingItem?.notes}
                    rows={3}
                  />
                </div>
              </>
            )}

            {activeTab === "schools" && (
              <>
                <div>
                  <Label htmlFor="name">學校名稱 *</Label>
                  <Input
                    id="name"
                    name="name"
                    defaultValue={editingItem?.name}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="region">地區</Label>
                  <Select name="region" defaultValue={editingItem?.region || "香港"}>
                    <SelectTrigger>
                      <SelectValue placeholder="選擇地區" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="香港">香港</SelectItem>
                      <SelectItem value="澳門">澳門</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="address">地址</Label>
                  <Textarea
                    id="address"
                    name="address"
                    defaultValue={editingItem?.address}
                    rows={2}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="contactPerson">聯繫人</Label>
                    <Input
                      id="contactPerson"
                      name="contactPerson"
                      defaultValue={editingItem?.contactPerson}
                    />
                  </div>
                  <div>
                    <Label htmlFor="contactPhone">聯繫電話</Label>
                    <Input
                      id="contactPhone"
                      name="contactPhone"
                      defaultValue={editingItem?.contactPhone}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="contactEmail">聯繫郵箱</Label>
                  <Input
                    id="contactEmail"
                    name="contactEmail"
                    type="email"
                    defaultValue={editingItem?.contactEmail}
                  />
                </div>
                <div>
                  <Label htmlFor="capacity">可接待人數</Label>
                  <Input
                    id="capacity"
                    name="capacity"
                    type="number"
                    defaultValue={editingItem?.capacity || 0}
                  />
                </div>
                <div>
                  <Label htmlFor="receptionProcess">接待流程</Label>
                  <Textarea
                    id="receptionProcess"
                    name="receptionProcess"
                    defaultValue={editingItem?.receptionProcess}
                    rows={3}
                    placeholder="描述接待流程、注意事項等"
                  />
                </div>
                <div>
                  <Label htmlFor="notes">備註</Label>
                  <Textarea
                    id="notes"
                    name="notes"
                    defaultValue={editingItem?.notes}
                    rows={2}
                  />
                </div>
              </>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                取消
              </Button>
              <Button type="submit">
                {editingItem ? "保存" : "創建"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
