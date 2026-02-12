import { useState } from "react";
import { useLocation, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Calendar, Users, FileText, Utensils, User } from "lucide-react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";

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
          <Card>
            <CardHeader>
              <CardTitle>行程時間軸</CardTitle>
            </CardHeader>
            <CardContent>
              {itineraries && itineraries.length > 0 ? (
                <div className="space-y-4">
                  {itineraries.map((item) => (
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
                  暫無行程安排，點擊上方按鈕添加行程
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="daily">
          <Card>
            <CardHeader>
              <CardTitle>每日食行卡片</CardTitle>
            </CardHeader>
            <CardContent>
              {dailyCards && dailyCards.length > 0 ? (
                <div className="space-y-4">
                  {dailyCards.map((card) => (
                    <Card key={card.id}>
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
                  暫無食行卡片數據
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="members">
          <Card>
            <CardHeader>
              <CardTitle>團組成員</CardTitle>
            </CardHeader>
            <CardContent>
              {members && members.length > 0 ? (
                <div className="space-y-2">
                  {members.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div>
                        <p className="font-medium">{member.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {member.identity === "student" && "學生"}
                          {member.identity === "teacher" && "教師"}
                          {member.identity === "staff" && "工作人員"}
                          {member.identity === "other" && "其他"}
                          {member.phone && ` · ${member.phone}`}
                        </p>
                      </div>
                      {member.gender && (
                        <Badge variant="outline">
                          {member.gender === "male" && "男"}
                          {member.gender === "female" && "女"}
                          {member.gender === "other" && "其他"}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  暫無成員信息
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="files">
          <Card>
            <CardHeader>
              <CardTitle>文件管理</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-center text-muted-foreground py-8">
                文件管理功能開發中...
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
