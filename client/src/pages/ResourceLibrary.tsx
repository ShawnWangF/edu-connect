import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { MapPin, UtensilsCrossed, School, Building2, Plus, Edit, Trash2, Search, Phone, Mail, Users } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// 週日對應數字（0=週日, 1=週一, ..., 6=週六）
const WEEKDAYS = [
  { label: '週日', value: 0 },
  { label: '週一', value: 1 },
  { label: '週二', value: 2 },
  { label: '週三', value: 3 },
  { label: '週四', value: 4 },
  { label: '週五', value: 5 },
  { label: '週六', value: 6 },
];

export default function ResourceLibrary() {
  const [activeTab, setActiveTab] = useState("attractions");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClosedDays, setSelectedClosedDays] = useState<number[]>([]); // 休館日選擇

  const utils = trpc.useUtils();

  // 查詢所有資源
  const { data: attractions = [] } = trpc.locations.list.useQuery();
  const { data: restaurants = [] } = trpc.restaurants.list.useQuery();
  const { data: exchangeSchools = [] } = trpc.exchangeSchools.list.useQuery();
  const { data: domesticSchools = [] } = trpc.domesticSchools.list.useQuery();

  // 景點 mutations
  const createAttractionMutation = trpc.locations.create.useMutation({
    onSuccess: () => { toast.success("景點創建成功"); utils.locations.list.invalidate(); handleCloseDialog(); },
    onError: (error) => toast.error(error.message),
  });
  const updateAttractionMutation = trpc.locations.update.useMutation({
    onSuccess: () => { toast.success("景點更新成功"); utils.locations.list.invalidate(); handleCloseDialog(); },
    onError: (error) => toast.error(error.message),
  });
  const deleteAttractionMutation = trpc.locations.delete.useMutation({
    onSuccess: () => { toast.success("景點刪除成功"); utils.locations.list.invalidate(); },
    onError: (error) => toast.error(error.message),
  });

  // 餐廳 mutations
  const createRestaurantMutation = trpc.restaurants.create.useMutation({
    onSuccess: () => { toast.success("餐廳創建成功"); utils.restaurants.list.invalidate(); handleCloseDialog(); },
    onError: (error) => toast.error(error.message),
  });
  const updateRestaurantMutation = trpc.restaurants.update.useMutation({
    onSuccess: () => { toast.success("餐廳更新成功"); utils.restaurants.list.invalidate(); handleCloseDialog(); },
    onError: (error) => toast.error(error.message),
  });
  const deleteRestaurantMutation = trpc.restaurants.delete.useMutation({
    onSuccess: () => { toast.success("餐廳刪除成功"); utils.restaurants.list.invalidate(); },
    onError: (error) => toast.error(error.message),
  });

  // 姊妹學校（港澳交流學校）mutations
  const createExchangeSchoolMutation = trpc.exchangeSchools.create.useMutation({
    onSuccess: () => { toast.success("姊妹學校創建成功"); utils.exchangeSchools.list.invalidate(); handleCloseDialog(); },
    onError: (error) => toast.error(error.message),
  });
  const updateExchangeSchoolMutation = trpc.exchangeSchools.update.useMutation({
    onSuccess: () => { toast.success("姊妹學校更新成功"); utils.exchangeSchools.list.invalidate(); handleCloseDialog(); },
    onError: (error) => toast.error(error.message),
  });
  const deleteExchangeSchoolMutation = trpc.exchangeSchools.delete.useMutation({
    onSuccess: () => { toast.success("姊妹學校刪除成功"); utils.exchangeSchools.list.invalidate(); },
    onError: (error) => toast.error(error.message),
  });

  // 前來交流學校（內地）mutations
  const createDomesticSchoolMutation = trpc.domesticSchools.create.useMutation({
    onSuccess: () => { toast.success("前來交流學校創建成功"); utils.domesticSchools.list.invalidate(); handleCloseDialog(); },
    onError: (error) => toast.error(error.message),
  });
  const updateDomesticSchoolMutation = trpc.domesticSchools.update.useMutation({
    onSuccess: () => { toast.success("前來交流學校更新成功"); utils.domesticSchools.list.invalidate(); handleCloseDialog(); },
    onError: (error) => toast.error(error.message),
  });
  const deleteDomesticSchoolMutation = trpc.domesticSchools.delete.useMutation({
    onSuccess: () => { toast.success("前來交流學校刪除成功"); utils.domesticSchools.list.invalidate(); },
    onError: (error) => toast.error(error.message),
  });

  const handleOpenDialog = (type: string, item?: any) => {
    setActiveTab(type);
    setEditingItem(item || null);
    setIsDialogOpen(true);
    // 初始化休館日選擇
    if (type === 'attractions' && item?.closedDays) {
      try {
        const days = typeof item.closedDays === 'string' ? JSON.parse(item.closedDays) : item.closedDays;
        setSelectedClosedDays(Array.isArray(days) ? days : []);
      } catch { setSelectedClosedDays([]); }
    } else {
      setSelectedClosedDays([]);
    }
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingItem(null);
    setSelectedClosedDays([]);
  };

  const toggleClosedDay = (day: number) => {
    setSelectedClosedDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data: any = {};
    formData.forEach((value, key) => {
      if (["capacity", "maxGroupSize", "studentCount", "teacherCount"].includes(key)) {
        data[key] = parseInt(value as string) || 0;
      } else {
        data[key] = value;
      }
    });

    if (activeTab === "attractions") {
      data.requiresBooking = data.requiresBooking === "true";
      // 最大承接量轉數字
      if (data.maxCapacity) data.maxCapacity = parseInt(data.maxCapacity) || undefined;
      // 加入結構化休館日（來自 state，不是 FormData）
      data.closedDays = selectedClosedDays;
      if (editingItem) updateAttractionMutation.mutate({ id: editingItem.id, ...data });
      else createAttractionMutation.mutate(data);
    } else if (activeTab === "restaurants") {
      if (editingItem) updateRestaurantMutation.mutate({ id: editingItem.id, ...data });
      else createRestaurantMutation.mutate(data);
    } else if (activeTab === "exchangeSchools") {
      // availableDates 以逗號分隔的字符串轉為數組
      if (data.availableDates) {
        data.availableDates = data.availableDates.split(/[,，\s]+/).map((s: string) => s.trim()).filter(Boolean);
      }
      if (editingItem) updateExchangeSchoolMutation.mutate({ id: editingItem.id, ...data });
      else createExchangeSchoolMutation.mutate(data);
    } else if (activeTab === "domesticSchools") {
      if (editingItem) updateDomesticSchoolMutation.mutate({ id: editingItem.id, ...data });
      else createDomesticSchoolMutation.mutate(data);
    }
  };

  const handleDelete = (type: string, id: number) => {
    if (!confirm("確定要刪除此資源嗎？")) return;
    if (type === "attractions") deleteAttractionMutation.mutate({ id });
    else if (type === "restaurants") deleteRestaurantMutation.mutate({ id });
    else if (type === "exchangeSchools") deleteExchangeSchoolMutation.mutate({ id });
    else if (type === "domesticSchools") deleteDomesticSchoolMutation.mutate({ id });
  };

  const filterItems = (items: any[]) => {
    if (!searchQuery) return items;
    return items.filter((item) =>
      item.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.address?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const getTabLabel = () => {
    if (activeTab === "attractions") return "景點";
    if (activeTab === "restaurants") return "餐廳";
    if (activeTab === "exchangeSchools") return "姊妹學校";
    if (activeTab === "domesticSchools") return "前來交流學校";
    return "";
  };

  return (
    <div className="container py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">資源庫</h1>
          <p className="text-muted-foreground mt-1">
            統一管理景點、餐廳、姊妹學校及前來交流學校，支持行程快速選擇
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
          <TabsTrigger value="exchangeSchools" className="gap-2">
            <School className="h-4 w-4" />
            姊妹學校
            {exchangeSchools.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs">{exchangeSchools.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="domesticSchools" className="gap-2">
            <Building2 className="h-4 w-4" />
            前來交流學校
            {domesticSchools.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs">{domesticSchools.length}</Badge>
            )}
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
                    <Input placeholder="搜索景點..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-8 w-64" />
                  </div>
                  <Button onClick={() => handleOpenDialog("attractions")}>
                    <Plus className="h-4 w-4 mr-2" />添加景點
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {attractions.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">暫無景點資源，點擊右上角「添加景點」開始創建</div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {filterItems(attractions).map((item: any) => (
                    <Card key={item.id} className="border-2">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center justify-between">
                          <span>{item.name}</span>
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleOpenDialog("attractions", item)}><Edit className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete("attractions", item.id)}><Trash2 className="h-4 w-4" /></Button>
                          </div>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        {item.address && <div className="text-muted-foreground">{item.address}</div>}
                        <div className="flex flex-wrap gap-2">
                          {item.maxCapacity > 0 && (
                            <span className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded px-2 py-0.5">
                              <Users className="h-3 w-3" />最大 {item.maxCapacity} 人
                            </span>
                          )}
                          {item.closedDays && (() => {
                            try {
                              const days = typeof item.closedDays === 'string' ? JSON.parse(item.closedDays) : item.closedDays;
                              if (Array.isArray(days) && days.length > 0) {
                                const dayNames = ['週日','週一','週二','週三','週四','週五','週六'];
                                return (
                                  <span className="inline-flex items-center gap-1 text-xs bg-red-50 text-red-700 border border-red-200 rounded px-2 py-0.5">
                                    休：{days.sort().map((d: number) => dayNames[d]).join('、')}
                                  </span>
                                );
                              }
                            } catch {}
                            return null;
                          })()}
                          {item.requiresBooking && <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 rounded px-2 py-0.5">需預約</span>}
                        </div>
                        {(item.contact || item.contactPerson) && <div className="text-muted-foreground">對接：{item.contact || item.contactPerson}</div>}
                        {item.openingHours && <div className="text-muted-foreground">開放：{item.openingHours}</div>}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
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
                    <Input placeholder="搜索餐廳..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-8 w-64" />
                  </div>
                  <Button onClick={() => handleOpenDialog("restaurants")}>
                    <Plus className="h-4 w-4 mr-2" />添加餐廳
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {restaurants.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">暫無餐廳資源，點擊右上角「添加餐廳」開始創建</div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {filterItems(restaurants).map((item: any) => (
                    <Card key={item.id} className="border-2">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center justify-between">
                          <span>{item.name}</span>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleOpenDialog("restaurants", item)}><Edit className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete("restaurants", item.id)}><Trash2 className="h-4 w-4" /></Button>
                          </div>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        {item.address && <div className="text-muted-foreground">{item.address}</div>}
                        <div className="flex gap-4">
                          {item.capacity > 0 && <span className="text-muted-foreground">容量：{item.capacity}人</span>}
                          {item.cuisine && <span className="text-muted-foreground">菜系：{item.cuisine}</span>}
                        </div>
                        {item.phone && <div className="text-muted-foreground">電話：{item.phone}</div>}
                        {item.priceRange && <div className="text-muted-foreground">價格：{item.priceRange}</div>}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 姊妹學校（港澳） */}
        <TabsContent value="exchangeSchools">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>姊妹學校列表</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">港澳地區接待交流的學校，可在團組管理中為每所學校指定對應的姊妹學校</p>
                </div>
                <div className="flex gap-2">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="搜索姊妹學校..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-8 w-64" />
                  </div>
                  <Button onClick={() => handleOpenDialog("exchangeSchools")}>
                    <Plus className="h-4 w-4 mr-2" />添加姊妹學校
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {exchangeSchools.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <School className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>暫無姊妹學校，點擊右上角「添加姊妹學校」開始創建</p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {filterItems(exchangeSchools).map((item: any) => (
                    <Card key={item.id} className="border-2 hover:border-primary/50 transition-colors">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold truncate">{item.name}</div>
                            <div className="flex gap-2 mt-1 flex-wrap">
                              {item.region && <Badge variant="outline" className="text-xs">{item.region}</Badge>}
                              {item.schoolType && <Badge variant="secondary" className="text-xs">{item.schoolType}</Badge>}
                            </div>
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleOpenDialog("exchangeSchools", item)}><Edit className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete("exchangeSchools", item.id)}><Trash2 className="h-4 w-4" /></Button>
                          </div>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        {item.address && <div className="text-muted-foreground text-xs">{item.address}</div>}
                        <div className="flex flex-wrap gap-3">
                          {item.capacity > 0 && (
                            <span className="flex items-center gap-1 text-muted-foreground">
                              <Users className="h-3 w-3" />容量 {item.capacity} 人
                            </span>
                          )}
                          {item.maxGroupSize > 0 && (
                            <span className="text-muted-foreground">最大團組 {item.maxGroupSize} 人</span>
                          )}
                        </div>
                        {item.contactPerson && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Phone className="h-3 w-3" />{item.contactPerson}{item.contactPhone && ` · ${item.contactPhone}`}
                          </div>
                        )}
                        {item.availableDates && Array.isArray(item.availableDates) && item.availableDates.length > 0 && (
                          <div className="text-xs text-blue-600">
                            可交流日：{item.availableDates.join("、")}
                          </div>
                        )}
                        {item.receptionProcess && (
                          <div className="text-xs text-muted-foreground line-clamp-2">{item.receptionProcess}</div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 前來交流學校（內地） */}
        <TabsContent value="domesticSchools">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>前來交流學校列表</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">內地前來港澳交流的學校，可在團組的學校分組中選擇</p>
                </div>
                <div className="flex gap-2">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="搜索學校..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-8 w-64" />
                  </div>
                  <Button onClick={() => handleOpenDialog("domesticSchools")}>
                    <Plus className="h-4 w-4 mr-2" />添加學校
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {domesticSchools.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Building2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>暫無前來交流學校，點擊右上角「添加學校」開始創建</p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {filterItems(domesticSchools).map((item: any) => (
                    <Card key={item.id} className="border-2 hover:border-primary/50 transition-colors">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-start justify-between gap-2">
                          <div className="font-semibold">{item.name}</div>
                          <div className="flex gap-1 shrink-0">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleOpenDialog("domesticSchools", item)}><Edit className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete("domesticSchools", item.id)}><Trash2 className="h-4 w-4" /></Button>
                          </div>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        {item.address && <div className="text-muted-foreground text-xs">{item.address}</div>}
                        <div className="flex gap-4">
                          {(item.studentCount > 0 || item.teacherCount > 0) && (
                            <span className="flex items-center gap-1 text-muted-foreground">
                              <Users className="h-3 w-3" />
                              學生 {item.studentCount || 0} 人 · 教師 {item.teacherCount || 0} 人
                            </span>
                          )}
                        </div>
                        {item.contactPerson && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Phone className="h-3 w-3" />{item.contactPerson}{item.contactPhone && ` · ${item.contactPhone}`}
                          </div>
                        )}
                        {item.contactEmail && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Mail className="h-3 w-3" />{item.contactEmail}
                          </div>
                        )}
                        {item.notes && <div className="text-xs text-muted-foreground line-clamp-2">{item.notes}</div>}
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
              {editingItem ? "編輯" : "添加"}{getTabLabel()}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* 景點表單 */}
            {activeTab === "attractions" && (
              <>
                <div>
                  <Label htmlFor="name">景點名稱 *</Label>
                  <Input id="name" name="name" defaultValue={editingItem?.name} required disabled={!!editingItem} />
                  {editingItem && <p className="text-xs text-muted-foreground mt-1">景點名稱不可修改</p>}
                </div>
                <div>
                  <Label htmlFor="address">地址</Label>
                  <Textarea id="address" name="address" defaultValue={editingItem?.address} rows={2} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="contactPerson">對接人姓名</Label>
                    <Input id="contactPerson" name="contactPerson" defaultValue={editingItem?.contactPerson} placeholder="如：張三" />
                  </div>
                  <div>
                    <Label htmlFor="contactPhone">對接人電話</Label>
                    <Input id="contactPhone" name="contactPhone" defaultValue={editingItem?.contactPhone} placeholder="如：+852 1234 5678" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="openingHours">開放時間</Label>
                    <Input id="openingHours" name="openingHours" defaultValue={editingItem?.openingHours} placeholder="如：09:00-18:00" />
                  </div>
                  <div>
                    <Label htmlFor="maxCapacity">最大承接量（人）</Label>
                    <Input id="maxCapacity" name="maxCapacity" type="number" min={0} defaultValue={editingItem?.maxCapacity || ''} placeholder="如：300" />
                  </div>
                </div>
                <div>
                  <Label>每週固定休館日</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {WEEKDAYS.map(day => (
                      <button
                        key={day.value}
                        type="button"
                        onClick={() => toggleClosedDay(day.value)}
                        className={`px-3 py-1 rounded-full text-sm font-medium border transition-colors ${
                          selectedClosedDays.includes(day.value)
                            ? 'bg-destructive text-destructive-foreground border-destructive'
                            : 'bg-background text-foreground border-border hover:bg-muted'
                        }`}
                      >
                        {day.label}
                      </button>
                    ))}
                  </div>
                  {selectedClosedDays.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      已選：{selectedClosedDays.sort().map(d => WEEKDAYS[d].label).join('、')} 休館
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="requiresBooking">是否需要預約</Label>
                  <Select name="requiresBooking" defaultValue={editingItem?.requiresBooking ? "true" : "false"}>
                    <SelectTrigger><SelectValue placeholder="選擇" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">需要預約</SelectItem>
                      <SelectItem value="false">不需預約</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="notes">特殊說明</Label>
                  <Textarea id="notes" name="notes" defaultValue={editingItem?.notes} rows={3} placeholder="如：太空館逢二休、需提前三天預約" />
                </div>
              </>
            )}

            {/* 餐廳表單 */}
            {activeTab === "restaurants" && (
              <>
                <div>
                  <Label htmlFor="name">餐廳名稱 *</Label>
                  <Input id="name" name="name" defaultValue={editingItem?.name} required />
                </div>
                <div>
                  <Label htmlFor="address">地址</Label>
                  <Textarea id="address" name="address" defaultValue={editingItem?.address} rows={2} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="phone">聯繫電話</Label>
                    <Input id="phone" name="phone" defaultValue={editingItem?.phone} />
                  </div>
                  <div>
                    <Label htmlFor="capacity">容量（人數）</Label>
                    <Input id="capacity" name="capacity" type="number" defaultValue={editingItem?.capacity || 0} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="cuisine">菜系</Label>
                    <Input id="cuisine" name="cuisine" defaultValue={editingItem?.cuisine} placeholder="如：粤菜、川菜" />
                  </div>
                  <div>
                    <Label htmlFor="priceRange">價格區間</Label>
                    <Input id="priceRange" name="priceRange" defaultValue={editingItem?.priceRange} placeholder="如：50-100元/人" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="businessHours">營業時間</Label>
                  <Input id="businessHours" name="businessHours" defaultValue={editingItem?.businessHours} placeholder="如：11:00-22:00" />
                </div>
                <div>
                  <Label htmlFor="notes">備註</Label>
                  <Textarea id="notes" name="notes" defaultValue={editingItem?.notes} rows={3} />
                </div>
              </>
            )}

            {/* 姊妹學校表單（港澳） */}
            {activeTab === "exchangeSchools" && (
              <>
                <div>
                  <Label htmlFor="name">學校名稱 *</Label>
                  <Input id="name" name="name" defaultValue={editingItem?.name} required placeholder="如：香港培道中學" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="region">所在地區</Label>
                    <Select name="region" defaultValue={editingItem?.region || ""}>
                      <SelectTrigger><SelectValue placeholder="選擇地區" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="香港">香港</SelectItem>
                        <SelectItem value="澳門">澳門</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="schoolType">學校類型</Label>
                    <Select name="schoolType" defaultValue={editingItem?.schoolType || ""}>
                      <SelectTrigger><SelectValue placeholder="選擇類型" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="小學">小學</SelectItem>
                        <SelectItem value="中學">中學</SelectItem>
                        <SelectItem value="大學">大學</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="address">學校地址</Label>
                  <Textarea id="address" name="address" defaultValue={editingItem?.address} rows={2} placeholder="如：香港九龍培道道1號" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="contactPerson">對接人姓名</Label>
                    <Input id="contactPerson" name="contactPerson" defaultValue={editingItem?.contactPerson} placeholder="如：李老師" />
                  </div>
                  <div>
                    <Label htmlFor="contactPhone">對接人電話</Label>
                    <Input id="contactPhone" name="contactPhone" defaultValue={editingItem?.contactPhone} placeholder="如：+852 2345 6789" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="contactEmail">對接人郵箱</Label>
                  <Input id="contactEmail" name="contactEmail" type="email" defaultValue={editingItem?.contactEmail} placeholder="如：contact@school.edu.hk" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="capacity">接待容量（人）</Label>
                    <Input id="capacity" name="capacity" type="number" defaultValue={editingItem?.capacity || 0} />
                  </div>
                  <div>
                    <Label htmlFor="maxGroupSize">最大團組人數</Label>
                    <Input id="maxGroupSize" name="maxGroupSize" type="number" defaultValue={editingItem?.maxGroupSize || 50} />
                  </div>
                </div>
                <div>
                  <Label htmlFor="availableDates">可交流日期</Label>
                  <Input
                    id="availableDates"
                    name="availableDates"
                    defaultValue={
                      editingItem?.availableDates
                        ? (Array.isArray(editingItem.availableDates)
                          ? editingItem.availableDates.join("、")
                          : editingItem.availableDates)
                        : ""
                    }
                    placeholder="如：週一、週三、週五（以逗號或頓號分隔）"
                  />
                  <p className="text-xs text-muted-foreground mt-1">填入可接待交流的星期或具體日期，多個用逗號分隔</p>
                </div>
                <div>
                  <Label htmlFor="receptionProcess">接待流程說明</Label>
                  <Textarea id="receptionProcess" name="receptionProcess" defaultValue={editingItem?.receptionProcess} rows={3} placeholder="如：09:00 到達學校門口 → 09:30 校長致辭 → 10:00 參觀校園..." />
                </div>
                <div>
                  <Label htmlFor="notes">備註</Label>
                  <Textarea id="notes" name="notes" defaultValue={editingItem?.notes} rows={2} />
                </div>
              </>
            )}

            {/* 前來交流學校表單（內地） */}
            {activeTab === "domesticSchools" && (
              <>
                <div>
                  <Label htmlFor="name">學校名稱 *</Label>
                  <Input id="name" name="name" defaultValue={editingItem?.name} required placeholder="如：蘇州工業園區星灣學校" />
                </div>
                <div>
                  <Label htmlFor="address">學校地址</Label>
                  <Textarea id="address" name="address" defaultValue={editingItem?.address} rows={2} placeholder="如：江蘇省蘇州市工業園區..." />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="studentCount">學生人數</Label>
                    <Input id="studentCount" name="studentCount" type="number" defaultValue={editingItem?.studentCount || 0} />
                  </div>
                  <div>
                    <Label htmlFor="teacherCount">教師人數</Label>
                    <Input id="teacherCount" name="teacherCount" type="number" defaultValue={editingItem?.teacherCount || 0} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="contactPerson">聯繫人姓名</Label>
                    <Input id="contactPerson" name="contactPerson" defaultValue={editingItem?.contactPerson} placeholder="如：王老師" />
                  </div>
                  <div>
                    <Label htmlFor="contactPhone">聯繫電話</Label>
                    <Input id="contactPhone" name="contactPhone" defaultValue={editingItem?.contactPhone} placeholder="如：0512-12345678" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="contactEmail">電子郵箱</Label>
                  <Input id="contactEmail" name="contactEmail" type="email" defaultValue={editingItem?.contactEmail} placeholder="如：contact@school.edu.cn" />
                </div>
                <div>
                  <Label htmlFor="notes">備註</Label>
                  <Textarea id="notes" name="notes" defaultValue={editingItem?.notes} rows={3} />
                </div>
              </>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>取消</Button>
              <Button type="submit">{editingItem ? "保存" : "創建"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
