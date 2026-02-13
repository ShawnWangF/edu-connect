import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Plus, Search, Calendar, Users, MapPin, Pencil, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
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

export default function Groups() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  
  const { data: groups, isLoading } = trpc.groups.list.useQuery();
  const utils = trpc.useUtils();
  
  const deleteMutation = trpc.groups.delete.useMutation({
    onSuccess: () => {
      toast.success("團組已刪除");
      utils.groups.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "刪除失敗");
    },
  });
  
  const handleDelete = (e: React.MouseEvent, groupId: number) => {
    e.stopPropagation();
    deleteMutation.mutate({ id: groupId });
  };

  const filteredGroups = groups?.filter((group) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      group.name.toLowerCase().includes(query) ||
      group.code.toLowerCase().includes(query) ||
      group.contact?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">團組管理</h1>
          <p className="text-muted-foreground mt-1">管理所有教育團組的行程安排</p>
        </div>
        <Button onClick={() => setLocation("/groups/new")}>
          <Plus className="mr-2 h-4 w-4" />
          新建團組
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索團組名稱、編號或聯系人..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">加載中...</div>
      ) : filteredGroups && filteredGroups.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredGroups.map((group) => (
            <Card
              key={group.id}
              className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => setLocation(`/groups/${group.id}`)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{group.name}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      編號: {group.code}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="secondary"
                      className={`${statusMap[group.status].color} text-white`}
                    >
                      {statusMap[group.status].label}
                    </Badge>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        setLocation(`/groups/${group.id}/edit`);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                        <AlertDialogHeader>
                          <AlertDialogTitle>確認刪除</AlertDialogTitle>
                          <AlertDialogDescription>
                            您確定要刪除團組「{group.name}」嗎？此操作無法撤銷。
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>取消</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={(e) => handleDelete(e, group.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            刪除
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {format(new Date(group.startDate), "yyyy-MM-dd", { locale: zhCN })} 至{" "}
                    {format(new Date(group.endDate), "yyyy-MM-dd", { locale: zhCN })}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>
                    共 {group.totalCount} 人 (學生 {group.studentCount} / 教師{" "}
                    {group.teacherCount})
                  </span>
                </div>
                {group.hotel && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="truncate">{group.hotel}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 pt-2">
                  {Array.isArray(group.type) && group.type.map((t, idx) => (
                    <Badge key={idx} variant="outline">{t}</Badge>
                  ))}
                  <Badge variant="outline">{group.days} 天</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {searchQuery ? "沒有找到匹配的團組" : "還沒有團組，點擊上方按鈕創建第一個團組"}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
