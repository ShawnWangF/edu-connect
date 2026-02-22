import { useState, useMemo } from "react";
import { useLocation, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { exportGroupToPDF } from "@/lib/pdfExport";
import { ArrowLeft, Calendar, Users, FileText, Utensils, User, Plus, Pencil, Trash2, Upload, Hotel, Car, UserCheck, Shield, Coffee, UtensilsCrossed, Soup, AlertCircle, Copy, FileSpreadsheet, MapPin, Download } from "lucide-react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { toast } from "sonner";


const statusMap = {
  preparing: { label: "準備中", color: "bg-yellow-500" },
  ongoing: { label: "進行中", color: "bg-green-500" },
  completed: { label: "已完成", color: "bg-gray-500" },
  cancelled: { label: "已取消", color: "bg-red-500" },
};

const typeMap = {
  elementary: "小學",
  middle: "中學",
  vip: "VIP",
};

export default function GroupDetail() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/groups/:id");
  const groupId = params?.id ? parseInt(params.id) : 0;

  const { data: group, isLoading } = trpc.groups.get.useQuery({ id: groupId });
  const { data: itineraries } = trpc.itineraries.listByGroup.useQuery({ groupId });
  const { data: members } = trpc.members.listByGroup.useQuery({ groupId });
  const { data: dailyCards } = trpc.dailyCards.listByGroup.useQuery({ groupId });
  const { data: files } = trpc.files.listByGroup.useQuery({ groupId });
  const { data: attractions } = trpc.locations.list.useQuery();

  const utils = trpc.useUtils();

  if (isLoading) {
    return <div className="text-center py-12">加載中...</div>;
  }

  if (!group) {
    return <div className="text-center py-12">團組不存在</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/groups")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">{group.name}</h1>
            <Badge className={`${statusMap[group.status].color} text-white`}>
              {statusMap[group.status].label}
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1">編號: {group.code}</p>
        </div>
        <Button 
          onClick={async () => {
            toast.loading("正在生成PDF...");
            const result = await exportGroupToPDF(group, itineraries || [], members || [], dailyCards || [], attractions || []);
            toast.dismiss();
            if (result.success) {
              toast.success(`PDF已成功導出：${result.fileName}`);
            } else {
              toast.error(`導出失敗：${result.error}`);
            }
          }}
          className="bg-gradient-to-r from-pink-500 via-blue-500 to-purple-600"
        >
          <Download className="mr-2 h-4 w-4" />
          導出PDF
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-muted-foreground">行程日期</p>
              <p className="text-lg font-medium mt-1">
                {format(new Date(group.startDate), "yyyy-MM-dd", { locale: zhCN })} 至{" "}
                {format(new Date(group.endDate), "yyyy-MM-dd", { locale: zhCN })}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">團組類型</p>
              <p className="text-lg font-medium mt-1">
                {Array.isArray(group.type) ? group.type.join(", ") : group.type} · {group.days} 天
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">參與人數</p>
              <p className="text-lg font-medium mt-1">
                共 {group.totalCount} 人 (學生 {group.studentCount} / 教師 {group.teacherCount})
              </p>
            </div>
            {group.hotel && (
              <div>
                <p className="text-sm text-muted-foreground">住宿酒店</p>
                <p className="text-lg font-medium mt-1">{group.hotel}</p>
              </div>
            )}
            {group.contact && (
              <div>
                <p className="text-sm text-muted-foreground">聯系人</p>
                <p className="text-lg font-medium mt-1">
                  {group.contact} {group.phone && `· ${group.phone}`}
                </p>
              </div>
            )}
            {group.emergencyContact && (
              <div>
                <p className="text-sm text-muted-foreground">緊急聯系人</p>
                <p className="text-lg font-medium mt-1">
                  {group.emergencyContact} {group.emergencyPhone && `· ${group.emergencyPhone}`}
                </p>
              </div>
            )}
          </div>
          {group.notes && (
            <div className="mt-6 pt-6 border-t">
              <p className="text-sm text-muted-foreground">備註</p>
              <p className="mt-2">{group.notes}</p>
            </div>
          )}
          <div className="mt-6 pt-6 border-t">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-muted-foreground">必去行程</p>
              <RequiredItinerariesDialog groupId={groupId} currentItineraries={group.requiredItineraries || []} utils={utils} />
            </div>
            {group.requiredItineraries && group.requiredItineraries.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {group.requiredItineraries.map((attractionId: number, index: number) => {
                  const attraction = attractions?.find(a => a.id === attractionId);
                  return (
                    <Badge key={index} variant="outline" className="text-sm">
                      <MapPin className="h-3 w-3 mr-1" />
                      {attraction?.name || `景點 ID: ${attractionId}`}
                    </Badge>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">未設置必去行程</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="itinerary" className="space-y-4">
        <TabsList>
          <TabsTrigger value="itinerary">
            <Calendar className="mr-2 h-4 w-4" />
            行程詳情
          </TabsTrigger>
          <TabsTrigger value="daily">
            <Utensils className="mr-2 h-4 w-4" />
            食行卡片
          </TabsTrigger>
          <TabsTrigger value="members">
            <User className="mr-2 h-4 w-4" />
            人員信息
          </TabsTrigger>
          <TabsTrigger value="files">
            <FileText className="mr-2 h-4 w-4" />
            文件管理
          </TabsTrigger>
        </TabsList>

        <TabsContent value="itinerary">
          <ItineraryTab groupId={groupId} itineraries={itineraries} utils={utils} group={group} attractions={attractions} dailyCards={dailyCards} />
        </TabsContent>

        <TabsContent value="daily">
          <DailyCardTab groupId={groupId} group={group} dailyCards={dailyCards} utils={utils} />
        </TabsContent>

        <TabsContent value="members">
          <MembersTab groupId={groupId} members={members} utils={utils} />
        </TabsContent>

        <TabsContent value="files">
          <FilesTab groupId={groupId} files={files} utils={utils} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// 行程詳情標籤頁
function ItineraryTab({ groupId, itineraries, utils, group, attractions, dailyCards }: any) {
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedAttractionId, setSelectedAttractionId] = useState<string>("");
  const [conflictWarning, setConflictWarning] = useState<string>("");
  
  const { data: itineraryAttractions = [] } = trpc.locations.list.useQuery();

  const createMutation = trpc.itineraries.create.useMutation({
    onSuccess: () => {
      toast.success("行程點已添加");
      utils.itineraries.listByGroup.invalidate({ groupId });
      setIsDialogOpen(false);
      setSelectedItem(null);
    },
    onError: (error) => {
      toast.error(error.message || "添加失敗");
    },
  });

  const updateMutation = trpc.itineraries.update.useMutation({
    onSuccess: () => {
      toast.success("行程點已更新");
      utils.itineraries.listByGroup.invalidate({ groupId });
      setIsDialogOpen(false);
      setSelectedItem(null);
    },
    onError: (error) => {
      toast.error(error.message || "更新失敗");
    },
  });

  const deleteMutation = trpc.itineraries.delete.useMutation({
    onSuccess: () => {
      toast.success("行程點已刪除");
      utils.itineraries.listByGroup.invalidate({ groupId });
    },
    onError: (error) => {
      toast.error(error.message || "刪除失敗");
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    // 當選擇景點時，手動設置locationName
    let locationName = formData.get("locationName") as string;
    if (selectedAttractionId && selectedAttractionId !== "manual") {
      const selectedAttraction = itineraryAttractions.find((a: any) => a.id.toString() === selectedAttractionId);
      if (selectedAttraction) {
        locationName = selectedAttraction.name;
      }
    }
    
    // 自動計算dayNumber（根據選擇的日期）
    const selectedDate = new Date(formData.get("date") as string);
    const startDate = new Date(group.startDate);
    const dayNumber = Math.floor((selectedDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
    const data = {
      groupId,
      date: formData.get("date") as string,
      dayNumber: dayNumber,
      startTime: (formData.get("startTime") as string) || undefined,
      endTime: (formData.get("endTime") as string) || undefined,
      locationName: locationName || undefined,
      description: (formData.get("description") as string) || undefined,
      notes: (formData.get("notes") as string) || undefined,
    };

    if (selectedItem) {
      updateMutation.mutate({ id: selectedItem.id, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  // 生成日期列表
  const dateList = [];
  const startDate = new Date(group.startDate);
  for (let i = 0; i < group.days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    dateList.push(date);
  }

  // 檢查未安排的必去行程
  const unscheduledRequired = useMemo(() => {
    if (!group.requiredItineraries || group.requiredItineraries.length === 0 || !attractions) {
      return [];
    }
    
    const scheduledAttractionIds = new Set(
      (itineraries || []).map((item: any) => item.attractionId).filter(Boolean)
    );
    
    const unscheduledIds = group.requiredItineraries.filter((attractionId: number) => 
      !scheduledAttractionIds.has(attractionId)
    );
    
    // 將ID轉換為完整的景點對象
    return unscheduledIds.map((attractionId: number) => 
      attractions.find((a: any) => a.id === attractionId)
    ).filter(Boolean);
  }, [group.requiredItineraries, itineraries, attractions]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>行程時間軸</CardTitle>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setSelectedItem(null)}>
              <Plus className="mr-2 h-4 w-4" />
              添加行程點
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{selectedItem ? "編輯行程點" : "添加行程點"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="date">日期 *</Label>
                <Input 
                  id="date" 
                  name="date" 
                  type="date" 
                  defaultValue={selectedItem?.date || dateList[0]?.toISOString().split('T')[0]} 
                  min={group.startDate}
                  max={group.endDate}
                  required 
                />
                <p className="text-xs text-muted-foreground">
                  團組日期範圍：{format(new Date(group.startDate), "yyyy-MM-dd")} 至 {format(new Date(group.endDate), "yyyy-MM-dd")} （第幾天將自動計算）
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startTime">開始時間</Label>
                  <Input id="startTime" name="startTime" type="time" defaultValue={selectedItem?.startTime || ""} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endTime">結束時間</Label>
                  <Input id="endTime" name="endTime" type="time" defaultValue={selectedItem?.endTime || ""} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="attractionSelect">景點選擇</Label>
                <Select
                  value={selectedAttractionId}
                  onValueChange={(value) => {
                    setSelectedAttractionId(value);
                    if (value === "manual") {
                      setConflictWarning("");
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="選擇景點或手動輸入" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        手動輸入地點
                      </div>
                    </SelectItem>
                    {itineraryAttractions.map((attraction: any) => (
                      <SelectItem key={attraction.id} value={attraction.id.toString()}>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          {attraction.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="locationName">地點名稱</Label>
                <Input 
                  id="locationName" 
                  name="locationName" 
                  defaultValue={selectedItem?.locationName || ""}
                  value={selectedAttractionId && selectedAttractionId !== "manual" 
                    ? itineraryAttractions.find((a: any) => a.id.toString() === selectedAttractionId)?.name || ""
                    : undefined
                  }
                  disabled={!!(selectedAttractionId && selectedAttractionId !== "manual")}
                  placeholder="已自動填充"
                />
              </div>

              {conflictWarning && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-yellow-800">{conflictWarning}</p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="description">活動描述</Label>
                <Textarea id="description" name="description" defaultValue={selectedItem?.description || ""} rows={3} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">備註</Label>
                <Textarea id="notes" name="notes" defaultValue={selectedItem?.notes || ""} rows={2} />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  取消
                </Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {(createMutation.isPending || updateMutation.isPending) ? "保存中..." : "保存"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {/* 未安排的必去行程提示 */}
        {unscheduledRequired.length > 0 && (
          <div className="mb-4 p-4 bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-900 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-yellow-900 dark:text-yellow-100 mb-2">
                  仍未安排的必去行程
                </h4>
                <div className="flex flex-wrap gap-2">
                  {unscheduledRequired.map((item: any, index: number) => (
                    <Badge 
                      key={index} 
                      variant="outline" 
                      className="bg-white dark:bg-gray-800 border-yellow-300 dark:border-yellow-700 text-yellow-800 dark:text-yellow-200"
                    >
                      {item.name}
                      {item.isCustom && <span className="ml-1 text-xs">(自定义)</span>}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
        
        {itineraries && itineraries.length > 0 ? (
          <div className="space-y-6">
            {(() => {
              // 按天分組行程
              const groupedByDay: Record<number, any[]> = {};
              itineraries.forEach((item: any) => {
                if (!groupedByDay[item.dayNumber]) {
                  groupedByDay[item.dayNumber] = [];
                }
                groupedByDay[item.dayNumber].push(item);
              });
              
              // 按時間排序
              Object.keys(groupedByDay).forEach(day => {
                groupedByDay[parseInt(day)].sort((a: any, b: any) => {
                  if (!a.startTime) return 1;
                  if (!b.startTime) return -1;
                  return a.startTime.localeCompare(b.startTime);
                });
              });
              
              return Object.keys(groupedByDay).sort((a, b) => parseInt(a) - parseInt(b)).map((dayNum) => {
                const dayNumber = parseInt(dayNum);
                const dayItems = groupedByDay[dayNumber];
                const dayDate = new Date(group.startDate);
                dayDate.setDate(dayDate.getDate() + dayNumber - 1);
                const dayDateStr = dayDate.toISOString().split('T')[0];
                
                // 找到當天的食行卡片
                const dayCard = dailyCards?.find((card: any) => {
                  const cardDate = new Date(card.date).toISOString().split('T')[0];
                  return cardDate === dayDateStr;
                });
                
                // 合併行程點和餐飲信息
                const mergedItems: any[] = [];
                
                // 添加行程點和餐飲
                dayItems.forEach((item: any) => {
                  mergedItems.push({ type: 'itinerary', data: item });
                });
                
                // 添加餐飲信息
                if (dayCard) {
                  if (dayCard.breakfast) {
                    mergedItems.push({ type: 'meal', mealType: 'breakfast', data: dayCard, time: '07:00' });
                  }
                  if (dayCard.lunch) {
                    mergedItems.push({ type: 'meal', mealType: 'lunch', data: dayCard, time: '12:00' });
                  }
                  if (dayCard.dinner) {
                    mergedItems.push({ type: 'meal', mealType: 'dinner', data: dayCard, time: '18:00' });
                  }
                }
                
                // 按時間排序所有項目
                mergedItems.sort((a, b) => {
                  const timeA = a.type === 'itinerary' ? (a.data.startTime || '23:59') : a.time;
                  const timeB = b.type === 'itinerary' ? (b.data.startTime || '23:59') : b.time;
                  return timeA.localeCompare(timeB);
                });
                
                return (
                  <div key={dayNumber} className="border-l-4 border-primary/30 pl-4">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-semibold">
                        第 {dayNumber} 天
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {format(dayDate, "yyyy-MM-dd (EEEE)", { locale: zhCN })}
                      </div>
                    </div>
                    <div className="space-y-3">
                      {mergedItems.map((item: any, index: number) => {
                        if (item.type === 'itinerary') {
                          return (
                            <div key={`itinerary-${item.data.id}`} className="flex gap-4 pb-3 border-b last:border-0">
                              <div className="flex-shrink-0 w-24 text-sm text-muted-foreground">
                                <div className="text-xs">
                                  {item.data.startTime && item.data.endTime
                                    ? `${item.data.startTime} - ${item.data.endTime}`
                                    : "全天"}
                                </div>
                              </div>
                              <div className="flex-1">
                                <p className="font-medium">{item.data.locationName || "未指定地點"}</p>
                                {item.data.description && (
                                  <p className="text-sm text-muted-foreground mt-1">{item.data.description}</p>
                                )}
                                {item.data.notes && (
                                  <p className="text-sm text-muted-foreground mt-1">備註: {item.data.notes}</p>
                                )}
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => {
                                    setSelectedItem(item.data);
                                    setIsDialogOpen(true);
                                  }}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="text-destructive hover:text-destructive"
                                  onClick={() => deleteMutation.mutate({ id: item.data.id })}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          );
                        } else if (item.type === 'meal') {
                          const mealIcons = {
                            breakfast: Coffee,
                            lunch: UtensilsCrossed,
                            dinner: Soup,
                          };
                          const mealLabels = {
                            breakfast: '早餐',
                            lunch: '午餐',
                            dinner: '晚餐',
                          };
                          const MealIcon = mealIcons[item.mealType as keyof typeof mealIcons];
                          const mealLabel = mealLabels[item.mealType as keyof typeof mealLabels];
                          const mealContent = item.data[item.mealType];
                          
                          return (
                            <div key={`meal-${item.mealType}-${index}`} className="flex gap-4 pb-3 border-b last:border-0 bg-orange-50/50 dark:bg-orange-950/20 -mx-2 px-2 py-2 rounded">
                              <div className="flex-shrink-0 w-24 text-sm text-muted-foreground">
                                <div className="text-xs">{item.time}</div>
                              </div>
                              <div className="flex-1 flex items-center gap-2">
                                <MealIcon className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                                <p className="font-medium text-orange-900 dark:text-orange-100">{mealLabel}</p>
                                <span className="text-sm text-muted-foreground">- {mealContent}</span>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      })}
                      
                      {/* 住宿信息 */}
                      {dayCard && dayCard.hotelName && (
                        <div className="flex gap-4 pb-3 bg-blue-50/50 dark:bg-blue-950/20 -mx-2 px-2 py-2 rounded mt-3">
                          <div className="flex-shrink-0 w-24 text-sm text-muted-foreground">
                            <div className="text-xs">晚上</div>
                          </div>
                          <div className="flex-1 flex items-start gap-2">
                            <Hotel className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5" />
                            <div>
                              <p className="font-medium text-blue-900 dark:text-blue-100">住宿: {dayCard.hotelName}</p>
                              {dayCard.hotelAddress && (
                                <p className="text-sm text-muted-foreground mt-1">{dayCard.hotelAddress}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-8">
            暫無行程安排，點擊上方按鈕添加
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// 食行卡片標籤頁
function DailyCardTab({ groupId, group, dailyCards, utils }: any) {
  const [selectedCard, setSelectedCard] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState<any>({});

  // 查詢所有資源
  const { data: hotels = [] } = trpc.hotels.list.useQuery();
  const { data: vehicles = [] } = trpc.vehicles.list.useQuery();
  const { data: guides = [] } = trpc.guides.list.useQuery();
  const { data: securities = [] } = trpc.securities.list.useQuery();

  const upsertMutation = trpc.dailyCards.upsert.useMutation({
    onSuccess: () => {
      toast.success("保存成功！");
      utils.dailyCards.listByGroup.invalidate({ groupId });
      setIsDialogOpen(false);
      setSelectedCard(null);
    },
    onError: (error) => {
      toast.error(error.message || "保存失敗");
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    upsertMutation.mutate({
      groupId,
      date: formData.get("date") as string,
      hotelName: formData.get("hotelName") as string,
      hotelAddress: formData.get("hotelAddress") as string,
      vehiclePlate: formData.get("vehiclePlate") as string,
      driverName: formData.get("driverName") as string,
      driverPhone: formData.get("driverPhone") as string,
      guideName: formData.get("guideName") as string,
      guidePhone: formData.get("guidePhone") as string,
      securityName: formData.get("securityName") as string,
      securityPhone: formData.get("securityPhone") as string,
      breakfastRestaurant: formData.get("breakfastRestaurant") as string,
      breakfastAddress: formData.get("breakfastAddress") as string,
      lunchRestaurant: formData.get("lunchRestaurant") as string,
      lunchAddress: formData.get("lunchAddress") as string,
      dinnerRestaurant: formData.get("dinnerRestaurant") as string,
      dinnerAddress: formData.get("dinnerAddress") as string,
      specialNotes: formData.get("specialNotes") as string,
    });
  };

  // 生成日期列表
  const dateList = [];
  const startDate = new Date(group.startDate);
  for (let i = 0; i < group.days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    dateList.push(date);
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>每日食行卡片</CardTitle>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setSelectedCard(null)}>
              <Plus className="mr-2 h-4 w-4" />
              編輯卡片
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>編輯食行卡片</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-1 space-y-2">
                  <Label htmlFor="date">日期</Label>
                  <Select name="date" defaultValue={selectedCard?.date || dateList[0]?.toISOString().split('T')[0]} required>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {dateList.map((date) => (
                        <SelectItem key={date.toISOString()} value={date.toISOString().split('T')[0]}>
                          {format(date, "yyyy-MM-dd EEEE", { locale: zhCN })}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      const currentDate = (document.querySelector('[name="date"]') as any)?.value;
                      if (!currentDate || !dailyCards) return;
                      
                      const currentDateObj = new Date(currentDate);
                      const previousDate = new Date(currentDateObj);
                      previousDate.setDate(previousDate.getDate() - 1);
                      const previousDateStr = previousDate.toISOString().split('T')[0];
                      
                      const previousCard = dailyCards.find((c: any) => c.date === previousDateStr);
                      if (!previousCard) {
                        toast.error("前一天沒有卡片數據");
                        return;
                      }
                      
                      setSelectedCard({ ...previousCard, date: currentDate });
                      toast.success("已複製上一日安排");
                    }}
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    複製上一日
                  </Button>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-medium mb-3">住宿信息</h3>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label>選擇酒店資源</Label>
                    <Select
                      value={formData.hotelId?.toString() || ""}
                      onValueChange={(value) => {
                        const hotel = hotels.find((h: any) => h.id.toString() === value);
                        if (hotel) {
                          setFormData((prev: any) => ({
                            ...prev,
                            hotelId: hotel.id,
                            hotelName: hotel.name,
                            hotelAddress: hotel.address || "",
                          }));
                          // 更新表單字段
                          (document.getElementById("hotelName") as HTMLInputElement).value = hotel.name;
                          (document.getElementById("hotelAddress") as HTMLInputElement).value = hotel.address || "";
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="從資源庫選擇酒店" />
                      </SelectTrigger>
                      <SelectContent>
                        {hotels.filter((h: any) => h.isActive !== false).map((hotel: any) => (
                          <SelectItem key={hotel.id} value={hotel.id.toString()}>
                            {hotel.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="hotelName">酒店名稱</Label>
                      <Input id="hotelName" name="hotelName" defaultValue={selectedCard?.hotelName} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="hotelAddress">酒店地址</Label>
                      <Input id="hotelAddress" name="hotelAddress" defaultValue={selectedCard?.hotelAddress} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-medium mb-3">車輛安排</h3>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label>選擇車輛資源</Label>
                    <Select
                      value={formData.vehicleId?.toString() || ""}
                      onValueChange={(value) => {
                        const vehicle = vehicles.find((v: any) => v.id.toString() === value);
                        if (vehicle) {
                          setFormData((prev: any) => ({
                            ...prev,
                            vehicleId: vehicle.id,
                            vehiclePlate: vehicle.plate,
                            driverName: vehicle.driverName || "",
                            driverPhone: vehicle.driverPhone || "",
                          }));
                          (document.getElementById("vehiclePlate") as HTMLInputElement).value = vehicle.plate;
                          (document.getElementById("driverName") as HTMLInputElement).value = vehicle.driverName || "";
                          (document.getElementById("driverPhone") as HTMLInputElement).value = vehicle.driverPhone || "";
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="從資源庫選擇車輛" />
                      </SelectTrigger>
                      <SelectContent>
                        {vehicles.filter((v: any) => v.isActive !== false).map((vehicle: any) => (
                          <SelectItem key={vehicle.id} value={vehicle.id.toString()}>
                            {vehicle.plate}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="vehiclePlate">車牌號</Label>
                      <Input id="vehiclePlate" name="vehiclePlate" defaultValue={selectedCard?.vehiclePlate} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="driverName">司機姓名</Label>
                      <Input id="driverName" name="driverName" defaultValue={selectedCard?.driverName} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="driverPhone">司機電話</Label>
                      <Input id="driverPhone" name="driverPhone" defaultValue={selectedCard?.driverPhone} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-medium mb-3">導遊和安保</h3>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>選擇導遊資源</Label>
                      <Select
                        value={formData.guideId?.toString() || ""}
                        onValueChange={(value) => {
                          const guide = guides.find((g: any) => g.id.toString() === value);
                          if (guide) {
                            setFormData((prev: any) => ({
                              ...prev,
                              guideId: guide.id,
                              guideName: guide.name,
                              guidePhone: guide.phone || "",
                            }));
                            (document.getElementById("guideName") as HTMLInputElement).value = guide.name;
                            (document.getElementById("guidePhone") as HTMLInputElement).value = guide.phone || "";
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="從資源庫選擇導遊" />
                        </SelectTrigger>
                        <SelectContent>
                          {guides.filter((g: any) => g.isActive !== false).map((guide: any) => (
                            <SelectItem key={guide.id} value={guide.id.toString()}>
                              {guide.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>選擇安保資源</Label>
                      <Select
                        value={formData.securityId?.toString() || ""}
                        onValueChange={(value) => {
                          const security = securities.find((s: any) => s.id.toString() === value);
                          if (security) {
                            setFormData((prev: any) => ({
                              ...prev,
                              securityId: security.id,
                              securityName: security.name,
                              securityPhone: security.phone || "",
                            }));
                            (document.getElementById("securityName") as HTMLInputElement).value = security.name;
                            (document.getElementById("securityPhone") as HTMLInputElement).value = security.phone || "";
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="從資源庫選擇安保" />
                        </SelectTrigger>
                        <SelectContent>
                          {securities.filter((s: any) => s.isActive !== false).map((security: any) => (
                            <SelectItem key={security.id} value={security.id.toString()}>
                              {security.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="guideName">導遊姓名</Label>
                      <Input id="guideName" name="guideName" defaultValue={selectedCard?.guideName} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="guidePhone">導遊電話</Label>
                      <Input id="guidePhone" name="guidePhone" defaultValue={selectedCard?.guidePhone} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="securityName">安保姓名</Label>
                      <Input id="securityName" name="securityName" defaultValue={selectedCard?.securityName} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="securityPhone">安保電話</Label>
                      <Input id="securityPhone" name="securityPhone" defaultValue={selectedCard?.securityPhone} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-medium mb-3">餐飲安排</h3>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="breakfastRestaurant">早餐餐廳</Label>
                      <Input id="breakfastRestaurant" name="breakfastRestaurant" defaultValue={selectedCard?.breakfastRestaurant} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="breakfastAddress">早餐地址</Label>
                      <Input id="breakfastAddress" name="breakfastAddress" defaultValue={selectedCard?.breakfastAddress} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="lunchRestaurant">午餐餐廳</Label>
                      <Input id="lunchRestaurant" name="lunchRestaurant" defaultValue={selectedCard?.lunchRestaurant} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lunchAddress">午餐地址</Label>
                      <Input id="lunchAddress" name="lunchAddress" defaultValue={selectedCard?.lunchAddress} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="dinnerRestaurant">晚餐餐廳</Label>
                      <Input id="dinnerRestaurant" name="dinnerRestaurant" defaultValue={selectedCard?.dinnerRestaurant} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dinnerAddress">晚餐地址</Label>
                      <Input id="dinnerAddress" name="dinnerAddress" defaultValue={selectedCard?.dinnerAddress} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="space-y-2">
                  <Label htmlFor="specialNotes">特殊備註</Label>
                  <Textarea id="specialNotes" name="specialNotes" defaultValue={selectedCard?.specialNotes} rows={3} />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  取消
                </Button>
                <Button type="submit" disabled={upsertMutation.isPending}>
                  {upsertMutation.isPending ? "保存中..." : "保存"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {dailyCards && dailyCards.length > 0 ? (
          <div className="space-y-4">
            {dailyCards.map((card: any) => (
              <Card key={card.id} className="cursor-pointer hover:bg-accent/50" onClick={() => {
                setSelectedCard(card);
                setIsDialogOpen(true);
              }}>
                <CardHeader>
                  <CardTitle className="text-lg">
                    {format(new Date(card.date), "yyyy-MM-dd EEEE", { locale: zhCN })}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* 住宿信息 */}
                    {card.hotelName && (
                      <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900">
                        <div className="flex-shrink-0 mt-0.5">
                          <Hotel className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1">住宿</p>
                          <p className="text-sm text-blue-700 dark:text-blue-300">{card.hotelName}</p>
                          {card.hotelAddress && (
                            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">{card.hotelAddress}</p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* 車輛信息 */}
                    {(card.vehiclePlate || card.driverName) && (
                      <div className="flex items-start gap-3 p-3 rounded-lg bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900">
                        <div className="flex-shrink-0 mt-0.5">
                          <Car className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-purple-900 dark:text-purple-100 mb-1">車輛</p>
                          <p className="text-sm text-purple-700 dark:text-purple-300">
                            {card.vehiclePlate || "未指定"}
                          </p>
                          {card.driverName && (
                            <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                              司機: {card.driverName} {card.driverPhone && `· ${card.driverPhone}`}
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* 導遊信息 */}
                    {card.guideName && (
                      <div className="flex items-start gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900">
                        <div className="flex-shrink-0 mt-0.5">
                          <UserCheck className="h-5 w-5 text-green-600 dark:text-green-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-green-900 dark:text-green-100 mb-1">導遊</p>
                          <p className="text-sm text-green-700 dark:text-green-300">{card.guideName}</p>
                          {card.guidePhone && (
                            <p className="text-xs text-green-600 dark:text-green-400 mt-1">{card.guidePhone}</p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* 安保信息 */}
                    {card.securityName && (
                      <div className="flex items-start gap-3 p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900">
                        <div className="flex-shrink-0 mt-0.5">
                          <Shield className="h-5 w-5 text-red-600 dark:text-red-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-red-900 dark:text-red-100 mb-1">安保</p>
                          <p className="text-sm text-red-700 dark:text-red-300">{card.securityName}</p>
                          {card.securityPhone && (
                            <p className="text-xs text-red-600 dark:text-red-400 mt-1">{card.securityPhone}</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 餐飲信息 */}
                  {(card.breakfastRestaurant || card.lunchRestaurant || card.dinnerRestaurant) && (
                    <div className="mt-4 p-4 rounded-lg bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-900">
                      <div className="flex items-center gap-2 mb-3">
                        <Utensils className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                        <p className="text-sm font-semibold text-orange-900 dark:text-orange-100">餐飲</p>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {card.breakfastRestaurant && (
                          <div className="flex items-start gap-2">
                            <Coffee className="h-4 w-4 text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-orange-800 dark:text-orange-200">早餐</p>
                              <p className="text-sm text-orange-700 dark:text-orange-300">{card.breakfastRestaurant}</p>
                              {card.breakfastAddress && (
                                <p className="text-xs text-orange-600 dark:text-orange-400 mt-0.5 truncate">{card.breakfastAddress}</p>
                              )}
                            </div>
                          </div>
                        )}
                        {card.lunchRestaurant && (
                          <div className="flex items-start gap-2">
                            <UtensilsCrossed className="h-4 w-4 text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-orange-800 dark:text-orange-200">午餐</p>
                              <p className="text-sm text-orange-700 dark:text-orange-300">{card.lunchRestaurant}</p>
                              {card.lunchAddress && (
                                <p className="text-xs text-orange-600 dark:text-orange-400 mt-0.5 truncate">{card.lunchAddress}</p>
                              )}
                            </div>
                          </div>
                        )}
                        {card.dinnerRestaurant && (
                          <div className="flex items-start gap-2">
                            <Soup className="h-4 w-4 text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-orange-800 dark:text-orange-200">晚餐</p>
                              <p className="text-sm text-orange-700 dark:text-orange-300">{card.dinnerRestaurant}</p>
                              {card.dinnerAddress && (
                                <p className="text-xs text-orange-600 dark:text-orange-400 mt-0.5 truncate">{card.dinnerAddress}</p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 特殊備註 */}
                  {card.specialNotes && (
                    <div className="mt-4 flex items-start gap-3 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-900">
                      <div className="flex-shrink-0 mt-0.5">
                        <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-yellow-900 dark:text-yellow-100 mb-1">特殊備註</p>
                        <p className="text-sm text-yellow-700 dark:text-yellow-300 whitespace-pre-wrap">{card.specialNotes}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-8">
            暫無食行卡片數據，點擊上方按鈕添加
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// 人員信息標籤頁
function MembersTab({ groupId, members, utils }: any) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<any>(null);
  const [isBatchImportOpen, setIsBatchImportOpen] = useState(false);
  const [importData, setImportData] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<Set<number>>(new Set());

  const createMutation = trpc.members.create.useMutation({
    onSuccess: () => {
      toast.success("添加成功！");
      utils.members.listByGroup.invalidate({ groupId });
      setIsDialogOpen(false);
    },
    onError: (error) => {
      toast.error(error.message || "添加失敗");
    },
  });

  const updateMutation = trpc.members.update.useMutation({
    onSuccess: () => {
      toast.success("更新成功！");
      utils.members.listByGroup.invalidate({ groupId });
      setIsDialogOpen(false);
      setEditingMember(null);
    },
    onError: (error) => {
      toast.error(error.message || "更新失敗");
    },
  });

  const deleteMutation = trpc.members.delete.useMutation({
    onSuccess: () => {
      toast.success("刪除成功！");
      utils.members.listByGroup.invalidate({ groupId });
    },
    onError: (error) => {
      toast.error(error.message || "刪除失敗");
    },
  });

  const batchCreateMutation = trpc.members.batchCreate.useMutation({
    onSuccess: async (data) => {
      console.log('Batch import response:', data);
      
      if (!data || !data.results) {
        toast.error("批量導入失敗：無效的響應數據");
        return;
      }
      
      const successCount = data.results.filter((r: any) => r.success).length;
      const totalCount = data.results.length;
      const failedCount = totalCount - successCount;
      
      if (failedCount > 0) {
        toast.warning(`批量導入完成！成功 ${successCount} 條，失敗 ${failedCount} 條，共 ${totalCount} 條記錄`);
      } else {
        toast.success(`批量導入成功！共導入 ${successCount} 條記錄`);
      }
      
      await utils.members.listByGroup.refetch({ groupId });
      setIsBatchImportOpen(false);
      setImportData([]);
    },
    onError: (error) => {
      console.error('Batch import error:', error);
      toast.error(error.message || "批量導入失敗");
    },
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    try {
      const XLSX = await import('xlsx');
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      // 直接使用表頭作為字段名，不做任何映射
      const mapped = jsonData.map((row: any) => {
        const member: Record<string, any> = {};
        Object.keys(row).forEach((key) => {
          const value = row[key];
          // 保留原始表頭作為字段名，只處理空值
          member[key] = value !== undefined && value !== null && value !== '' ? value : null;
        });
        return member;
      });

      setImportData(mapped);
      setIsBatchImportOpen(true);
      toast.success(`解析成功，共 ${mapped.length} 條記錄`);
    } catch (error) {
      toast.error("文件解析失敗：" + String(error));
    } finally {
      setIsProcessing(false);
      e.target.value = '';
    }
  };

  const handleBatchImport = () => {
    if (importData.length === 0) {
      toast.error("沒有有效的成員數據");
      return;
    }

    // 直接傳遞所有字段，不做任何過濾
    batchCreateMutation.mutate({
      groupId,
      members: importData,
    });
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const data = {
      groupId,
      name: formData.get("name") as string,
      identity: formData.get("identity") as "student" | "teacher" | "staff" | "other",
      gender: formData.get("gender") as "male" | "female" | "other" | undefined,
      phone: formData.get("phone") as string,
      idCard: formData.get("idCard") as string,
      notes: formData.get("notes") as string,
    };

    if (editingMember) {
      updateMutation.mutate({ id: editingMember.id, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>團組成員 {selectedMembers.size > 0 && `(已選中 ${selectedMembers.size} 項)`}</CardTitle>
        <div className="flex gap-2">
          {selectedMembers.size > 0 && (
            <Button
              variant="destructive"
              onClick={async () => {
                if (!confirm(`確定要刪除選中的 ${selectedMembers.size} 名成員嗎？`)) return;
                try {
                  for (const id of Array.from(selectedMembers)) {
                    await deleteMutation.mutateAsync({ id });
                  }
                  toast.success(`已刪除 ${selectedMembers.size} 名成員`);
                  setSelectedMembers(new Set());
                } catch (error) {
                  toast.error("批量刪除失敗");
                }
              }}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              批量刪除
            </Button>
          )}
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileUpload}
            className="hidden"
            id="excel-upload"
          />
          <Button
            variant="outline"
            onClick={() => document.getElementById('excel-upload')?.click()}
            disabled={isProcessing}
          >
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            {isProcessing ? "解析中..." : "批量導入"}
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditingMember(null)}>
                <Plus className="mr-2 h-4 w-4" />
                添加成員
              </Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingMember ? "編輯成員" : "添加成員"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">姓名 *</Label>
                <Input id="name" name="name" defaultValue={editingMember?.name} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="identity">身份 *</Label>
                <Select name="identity" defaultValue={editingMember?.identity || "student"} required>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student">學生</SelectItem>
                    <SelectItem value="teacher">教師</SelectItem>
                    <SelectItem value="staff">工作人員</SelectItem>
                    <SelectItem value="other">其他</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="gender">性別</Label>
                <Select name="gender" defaultValue={editingMember?.gender}>
                  <SelectTrigger>
                    <SelectValue placeholder="請選擇" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">男</SelectItem>
                    <SelectItem value="female">女</SelectItem>
                    <SelectItem value="other">其他</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">聯系電話</Label>
                <Input id="phone" name="phone" defaultValue={editingMember?.phone} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="idCard">身份證號</Label>
                <Input id="idCard" name="idCard" defaultValue={editingMember?.idCard} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">備註</Label>
                <Textarea id="notes" name="notes" defaultValue={editingMember?.notes} rows={3} />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  取消
                </Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {(createMutation.isPending || updateMutation.isPending) ? "保存中..." : "保存"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {members && members.length > 0 ? (
          <div className="border rounded-lg overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="px-3 py-2 text-center whitespace-nowrap w-12">
                    <input
                      type="checkbox"
                      checked={selectedMembers.size === members?.length && members?.length > 0}
                      onChange={() => {
                        if (selectedMembers.size === members?.length) {
                          setSelectedMembers(new Set());
                        } else {
                          setSelectedMembers(new Set(members?.map((m: any) => m.id) || []));
                        }
                      }}
                      className="cursor-pointer"
                    />
                  </th>
                  <th className="px-3 py-2 text-left whitespace-nowrap">姓名</th>
                  <th className="px-3 py-2 text-left whitespace-nowrap">身份</th>
                  <th className="px-3 py-2 text-left whitespace-nowrap">性別</th>
                  <th className="px-3 py-2 text-left whitespace-nowrap">聯系電話</th>
                  <th className="px-3 py-2 text-left whitespace-nowrap">身份證號</th>
                  {/* 動態顯示自定義字段表頭 */}
                  {(() => {
                    // 收集所有成員的自定義字段名
                    const allCustomFieldKeys = new Set<string>();
                    members.forEach((m: any) => {
                      if (m.customFields) {
                        try {
                          // customFields可能已經是對象（Drizzle自動解析）或字符串
                          const fields = typeof m.customFields === 'string' ? JSON.parse(m.customFields) : m.customFields;
                          Object.keys(fields).forEach(k => allCustomFieldKeys.add(k));
                        } catch (e) {
                          console.error('Failed to parse customFields:', e);
                        }
                      }
                    });
                    return Array.from(allCustomFieldKeys).map((key) => (
                      <th key={key} className="px-3 py-2 text-left whitespace-nowrap">{key}</th>
                    ));
                  })()}
                  <th className="px-3 py-2 text-left whitespace-nowrap">備註</th>
                  <th className="px-3 py-2 text-center whitespace-nowrap">操作</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  // 收集所有自定義字段名
                  const allCustomFieldKeys = new Set<string>();
                  members.forEach((m: any) => {
                    if (m.customFields) {
                      try {
                        // customFields可能已經是對象（Drizzle自動解析）或字符串
                        const fields = typeof m.customFields === 'string' ? JSON.parse(m.customFields) : m.customFields;
                        Object.keys(fields).forEach(k => allCustomFieldKeys.add(k));
                      } catch (e) {}
                    }
                  });
                  const customFieldKeysArray = Array.from(allCustomFieldKeys);

                  return members.map((member: any) => {
                    // customFields可能已經是對象（Drizzle自動解析）或字符串
                    const customFields = member.customFields 
                      ? (typeof member.customFields === 'string' ? JSON.parse(member.customFields) : member.customFields)
                      : {};
                    
                    return (
                      <tr key={member.id} className="border-t hover:bg-accent/50">
                        <td className="px-3 py-2 text-center">
                          <input
                            type="checkbox"
                            checked={selectedMembers.has(member.id)}
                            onChange={() => {
                              const newSelected = new Set(selectedMembers);
                              if (newSelected.has(member.id)) {
                                newSelected.delete(member.id);
                              } else {
                                newSelected.add(member.id);
                              }
                              setSelectedMembers(newSelected);
                            }}
                            className="cursor-pointer"
                          />
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap font-medium">{member.name}</td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          {member.identity === "student" && "學生"}
                          {member.identity === "teacher" && "教師"}
                          {member.identity === "staff" && "工作人員"}
                          {member.identity === "other" && "其他"}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          {member.gender === "male" && "男"}
                          {member.gender === "female" && "女"}
                          {member.gender === "other" && "其他"}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">{member.phone}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{member.idCard}</td>
                        {/* 顯示自定義字段值，空值不顯示 */}
                        {customFieldKeysArray.map((key) => (
                          <td key={key} className={`px-3 py-2 whitespace-nowrap ${!customFields[key] ? 'bg-yellow-100' : ''}`}>
                            {customFields[key]}
                          </td>
                        ))}
                        <td className="px-3 py-2 max-w-xs truncate">{member.notes}</td>
                        <td className="px-3 py-2">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => {
                                setEditingMember(member);
                                setIsDialogOpen(true);
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => {
                                if (confirm("確定要刪除這個成員嗎？")) {
                                  deleteMutation.mutate({ id: member.id });
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-8">
            暫無成員信息，點擊上方按鈕添加成員
          </p>
        )}
      </CardContent>

      {/* 批量導入預覽對話框 */}
      <Dialog open={isBatchImportOpen} onOpenChange={setIsBatchImportOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>批量導入預覽（共 {importData.length} 條記錄）</DialogTitle>
          </DialogHeader>
          <div className="text-sm text-muted-foreground mb-4">
            請檢查導入數據，空值字段將以黃色高亮顯示。所有Excel表頭將直接作為字段名導入。
          </div>
          <div className="border rounded-lg overflow-auto flex-1 min-h-0">
            <table className="w-full text-sm">
              <thead className="bg-muted sticky top-0">
                <tr>
                  {importData.length > 0 && Object.keys(importData[0]).map((key) => (
                    <th key={key} className="px-3 py-2 text-left whitespace-nowrap">{key}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {importData.map((member, index) => (
                  <tr key={index} className="border-t">
                    {Object.keys(member).map((key) => {
                      const value = member[key];
                      const isEmpty = value === null || value === undefined || value === '';
                      return (
                        <td 
                          key={key} 
                          className={`px-3 py-2 whitespace-nowrap ${isEmpty ? 'bg-yellow-100 dark:bg-yellow-900/30' : ''}`}
                        >
                          {isEmpty ? '空值' : String(value)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsBatchImportOpen(false);
                setImportData([]);
              }}
            >
              取消
            </Button>
            <Button
              type="button"
              onClick={handleBatchImport}
              disabled={batchCreateMutation.isPending || importData.length === 0}
            >
              {batchCreateMutation.isPending ? "導入中..." : `確認導入 (${importData.length} 條)`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// 文件管理標籤頁
function FilesTab({ groupId, files, utils }: any) {
  const [isUploading, setIsUploading] = useState(false);
  const [previewFile, setPreviewFile] = useState<any>(null);
  const [filterType, setFilterType] = useState<string>("all");

  const createFileMutation = trpc.files.create.useMutation({
    onSuccess: () => {
      toast.success("上傳成功！");
      utils.files.listByGroup.invalidate({ groupId });
      setIsUploading(false);
    },
    onError: (error) => {
      toast.error(error.message || "上傳失敗");
      setIsUploading(false);
    },
  });

  const deleteFileMutation = trpc.files.delete.useMutation({
    onSuccess: () => {
      toast.success("刪除成功！");
      utils.files.listByGroup.invalidate({ groupId });
    },
    onError: (error) => {
      toast.error(error.message || "刪除失敗");
    },
  });
  
  const uploadFileMutation = trpc.files.upload.useMutation({
    onSuccess: () => {
      toast.success("文件上傳成功");
      utils.files.listByGroup.invalidate({ groupId });
      setIsUploading(false);
    },
    onError: (error) => {
      toast.error("文件上傳失敗: " + error.message);
      setIsUploading(false);
    },
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 檢查文件大小（16MB限制）
    if (file.size > 16 * 1024 * 1024) {
      toast.error("文件大小不能超過 16MB");
      return;
    }

    setIsUploading(true);
    toast.info("正在上傳文件...");
    
    try {
      // 讀取文件為 Base64
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const base64Data = event.target?.result as string;
          
          // 使用真實的S3上傳API
          uploadFileMutation.mutate({
            groupId,
            fileName: file.name,
            fileData: base64Data,
            mimeType: file.type,
            size: file.size,
          });
        } catch (error) {
          console.error("Upload error:", error);
          toast.error("上傳失敗，請重試");
          setIsUploading(false);
        }
      };
      reader.onerror = () => {
        toast.error("讀取文件失敗");
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("上傳失敗，請重試");
      setIsUploading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  };

  const getFileType = (mimeType: string) => {
    if (mimeType.startsWith("image/")) return "image";
    if (mimeType === "application/pdf") return "pdf";
    if (mimeType.includes("spreadsheet") || mimeType.includes("excel")) return "excel";
    if (mimeType.includes("document") || mimeType.includes("word")) return "document";
    return "other";
  };

  const getFileIcon = (mimeType: string) => {
    const type = getFileType(mimeType);
    switch (type) {
      case "image":
        return "🖼️";
      case "pdf":
        return "📄";
      case "excel":
        return "📈";
      case "document":
        return "📃";
      default:
        return "📁";
    }
  };

  const filteredFiles = files?.filter((file: any) => {
    if (filterType === "all") return true;
    return getFileType(file.mimeType) === filterType;
  }) || [];

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-row items-center justify-between mb-4">
          <CardTitle>文件管理</CardTitle>
          <div>
            <input
              type="file"
              id="file-upload"
              className="hidden"
              onChange={handleFileUpload}
              disabled={isUploading}
            />
            <Button asChild disabled={isUploading}>
              <label htmlFor="file-upload" className="cursor-pointer">
                <Upload className="mr-2 h-4 w-4" />
                {isUploading ? "上傳中..." : "上傳文件"}
              </label>
            </Button>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={filterType === "all" ? "default" : "outline"}
            onClick={() => setFilterType("all")}
          >
            全部 ({files?.length || 0})
          </Button>
          <Button
            size="sm"
            variant={filterType === "image" ? "default" : "outline"}
            onClick={() => setFilterType("image")}
          >
            圖片 ({files?.filter((f: any) => getFileType(f.mimeType) === "image").length || 0})
          </Button>
          <Button
            size="sm"
            variant={filterType === "pdf" ? "default" : "outline"}
            onClick={() => setFilterType("pdf")}
          >
            PDF ({files?.filter((f: any) => getFileType(f.mimeType) === "pdf").length || 0})
          </Button>
          <Button
            size="sm"
            variant={filterType === "excel" ? "default" : "outline"}
            onClick={() => setFilterType("excel")}
          >
            Excel ({files?.filter((f: any) => getFileType(f.mimeType) === "excel").length || 0})
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {filteredFiles.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredFiles.map((file: any) => (
              <div
                key={file.id}
                className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow"
              >
                {getFileType(file.mimeType) === "image" ? (
                  <div
                    className="h-40 bg-muted flex items-center justify-center cursor-pointer"
                    onClick={() => setPreviewFile(file)}
                  >
                    <img
                      src={file.url}
                      alt={file.name}
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="h-40 bg-muted flex items-center justify-center text-6xl">
                    {getFileIcon(file.mimeType)}
                  </div>
                )}
                <div className="p-3">
                  <p className="font-medium truncate" title={file.name}>{file.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {file.size && formatFileSize(file.size)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(file.createdAt), "yyyy-MM-dd HH:mm")}
                  </p>
                  <div className="flex items-center gap-2 mt-3">
                    {(getFileType(file.mimeType) === "image" || getFileType(file.mimeType) === "pdf") && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => setPreviewFile(file)}
                      >
                        預覽
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => window.open(file.url, "_blank")}
                    >
                      下載
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        if (confirm("確定要刪除這個文件嗎？")) {
                          deleteFileMutation.mutate({ id: file.id });
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-8">
            {filterType === "all" ? "暫無文件，點擊上方按鈕上傳文件" : `暫無${filterType === "image" ? "圖片" : filterType === "pdf" ? "PDF" : "Excel"}文件`}
          </p>
        )}
        
        {/* 文件預覽對話框 */}
        {previewFile && (
          <Dialog open={!!previewFile} onOpenChange={() => setPreviewFile(null)}>
            <DialogContent className="max-w-4xl max-h-[90vh]">
              <DialogHeader>
                <DialogTitle>{previewFile.name}</DialogTitle>
              </DialogHeader>
              <div className="overflow-auto max-h-[70vh]">
                {getFileType(previewFile.mimeType) === "image" ? (
                  <img
                    src={previewFile.url}
                    alt={previewFile.name}
                    className="w-full h-auto"
                  />
                ) : getFileType(previewFile.mimeType) === "pdf" ? (
                  <iframe
                    src={previewFile.url}
                    className="w-full h-[70vh]"
                    title={previewFile.name}
                  />
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    無法預覽此文件類型
                  </p>
                )}
              </div>
            </DialogContent>
          </Dialog>
        )}
      </CardContent>
    </Card>
  );
}

// 必去行程配置對話框
function RequiredItinerariesDialog({ groupId, currentItineraries, utils }: {
  groupId: number;
  currentItineraries: number[];
  utils: any;
}) {
  const [open, setOpen] = useState(false);
  const [itineraries, setItineraries] = useState<number[]>(currentItineraries);
  const [selectedAttractionId, setSelectedAttractionId] = useState<string>("");
  
  const { data: attractions } = trpc.locations.list.useQuery();
  
  const updateGroup = trpc.groups.update.useMutation({
    onSuccess: () => {
      utils.groups.get.invalidate({ id: groupId });
      toast.success("必去行程更新成功");
      setOpen(false);
    },
    onError: () => {
      toast.error("更新失敗");
    },
  });
  
  const handleAddItinerary = () => {
    if (selectedAttractionId) {
      const attractionId = parseInt(selectedAttractionId);
      if (!itineraries.includes(attractionId)) {
        setItineraries([...itineraries, attractionId]);
        setSelectedAttractionId("");
      } else {
        toast.error("此景點已在必去行程列表中");
      }
    }
  };
  
  const handleRemoveItinerary = (index: number) => {
    setItineraries(itineraries.filter((_, i) => i !== index));
  };
  
  const handleSave = () => {
    updateGroup.mutate({
      id: groupId,
      requiredItineraries: itineraries,
    });
  };
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Pencil className="h-4 w-4 mr-1" />
          編輯
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>配置必去行程</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>已選擇的必去行程</Label>
            {itineraries.length > 0 ? (
              <div className="flex flex-wrap gap-2 p-3 border rounded-lg">
                {itineraries.map((attractionId, index) => {
                  const attraction = attractions?.find(a => a.id === attractionId);
                  return (
                    <Badge key={index} variant="secondary" className="text-sm">
                      <MapPin className="h-3 w-3 mr-1" />
                      {attraction?.name || `景點 ID: ${attractionId}`}
                      <button
                        onClick={() => handleRemoveItinerary(index)}
                        className="ml-2 hover:text-destructive"
                      >
                        ×
                      </button>
                    </Badge>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground p-3 border rounded-lg">還未添加必去行程</p>
            )}</div>
          
          <div className="space-y-2">
            <Label>添加行程</Label>
            <Select value={selectedAttractionId} onValueChange={setSelectedAttractionId}>
              <SelectTrigger>
                <SelectValue placeholder="選擇景點" />
              </SelectTrigger>
              <SelectContent>
                {attractions?.map((attraction) => (
                  <SelectItem key={attraction.id} value={attraction.id.toString()}>
                    {attraction.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            

            
            <Button onClick={handleAddItinerary} className="w-full" variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              添加
            </Button>
          </div>
          
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSave} disabled={updateGroup.isPending}>
              保存
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
