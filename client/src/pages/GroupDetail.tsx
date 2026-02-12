import { useState } from "react";
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
import { ArrowLeft, Calendar, Users, FileText, Utensils, User, Plus, Pencil, Trash2, Upload } from "lucide-react";
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
              <p className="text-lg font-medium mt-1">{typeMap[group.type]} · {group.days} 天</p>
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
          <ItineraryTab groupId={groupId} itineraries={itineraries} utils={utils} />
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
function ItineraryTab({ groupId, itineraries, utils }: any) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>行程時間軸</CardTitle>
      </CardHeader>
      <CardContent>
        {itineraries && itineraries.length > 0 ? (
          <div className="space-y-4">
            {itineraries.map((item: any) => (
              <div key={item.id} className="flex gap-4 pb-4 border-b last:border-0">
                <div className="flex-shrink-0 w-24 text-sm text-muted-foreground">
                  {item.startTime && item.endTime
                    ? `${item.startTime} - ${item.endTime}`
                    : "全天"}
                </div>
                <div className="flex-1">
                  <p className="font-medium">{item.locationName || "未指定地點"}</p>
                  {item.description && (
                    <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                  )}
                  {item.notes && (
                    <p className="text-sm text-muted-foreground mt-1">備註: {item.notes}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-8">
            暫無行程安排
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
              <div className="space-y-2">
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

              <div className="border-t pt-4">
                <h3 className="font-medium mb-3">住宿信息</h3>
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

              <div className="border-t pt-4">
                <h3 className="font-medium mb-3">車輛安排</h3>
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

              <div className="border-t pt-4">
                <h3 className="font-medium mb-3">導遊和安保</h3>
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
                <CardContent className="space-y-3">
                  {card.hotelName && (
                    <div>
                      <p className="text-sm font-medium">住宿</p>
                      <p className="text-sm text-muted-foreground">{card.hotelName}</p>
                    </div>
                  )}
                  {(card.vehiclePlate || card.driverName) && (
                    <div>
                      <p className="text-sm font-medium">車輛</p>
                      <p className="text-sm text-muted-foreground">
                        {card.vehiclePlate} {card.driverName && `· ${card.driverName}`}
                      </p>
                    </div>
                  )}
                  {(card.breakfastRestaurant || card.lunchRestaurant || card.dinnerRestaurant) && (
                    <div>
                      <p className="text-sm font-medium">餐飲</p>
                      <div className="text-sm text-muted-foreground space-y-1">
                        {card.breakfastRestaurant && <p>早餐: {card.breakfastRestaurant}</p>}
                        {card.lunchRestaurant && <p>午餐: {card.lunchRestaurant}</p>}
                        {card.dinnerRestaurant && <p>晚餐: {card.dinnerRestaurant}</p>}
                      </div>
                    </div>
                  )}
                  {card.specialNotes && (
                    <div>
                      <p className="text-sm font-medium">特殊備註</p>
                      <p className="text-sm text-muted-foreground">{card.specialNotes}</p>
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
        <CardTitle>團組成員</CardTitle>
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
      </CardHeader>
      <CardContent>
        {members && members.length > 0 ? (
          <div className="space-y-2">
            {members.map((member: any) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50"
              >
                <div className="flex-1">
                  <p className="font-medium">{member.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {member.identity === "student" && "學生"}
                    {member.identity === "teacher" && "教師"}
                    {member.identity === "staff" && "工作人員"}
                    {member.identity === "other" && "其他"}
                    {member.phone && ` · ${member.phone}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {member.gender && (
                    <Badge variant="outline">
                      {member.gender === "male" && "男"}
                      {member.gender === "female" && "女"}
                      {member.gender === "other" && "其他"}
                    </Badge>
                  )}
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
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-8">
            暫無成員信息，點擊上方按鈕添加成員
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// 文件管理標籤頁
function FilesTab({ groupId, files, utils }: any) {
  const [isUploading, setIsUploading] = useState(false);

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
          
          // 使用 tRPC mutation 上傳文件（需要在 server 端處理）
          // 這裡我們直接使用模擬的 URL，實際應該通過 API 上傳
          const mockUrl = `https://storage.example.com/group-${groupId}/${Date.now()}-${file.name}`;
          const fileKey = `group-${groupId}/${Date.now()}-${file.name}`;
          
          createFileMutation.mutate({
            groupId,
            name: file.name,
            fileKey,
            url: mockUrl,
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

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
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
      </CardHeader>
      <CardContent>
        {files && files.length > 0 ? (
          <div className="space-y-2">
            {files.map((file: any) => (
              <div
                key={file.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50"
              >
                <div className="flex-1">
                  <p className="font-medium">{file.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {file.size && formatFileSize(file.size)} · {format(new Date(file.createdAt), "yyyy-MM-dd HH:mm")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open(file.url, "_blank")}
                  >
                    下載
                  </Button>
                  <Button
                    size="icon"
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
            ))}
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-8">
            暫無文件，點擊上方按鈕上傳文件
          </p>
        )}
      </CardContent>
    </Card>
  );
}
