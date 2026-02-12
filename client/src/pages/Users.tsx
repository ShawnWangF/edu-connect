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
import { useAuth } from "@/_core/hooks/useAuth";
import { Plus, User, Shield, Eye, Edit, Trash2 } from "lucide-react";

export default function Users() {
  const { user: currentUser } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    name: "",
    email: "",
    role: "viewer" as "admin" | "editor" | "viewer",
  });

  const { data: users, refetch } = trpc.users.list.useQuery(undefined, {
    enabled: currentUser?.role === "admin",
  });

  const createMutation = trpc.users.create.useMutation({
    onSuccess: () => {
      toast.success("用戶創建成功！");
      setIsDialogOpen(false);
      resetForm();
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "創建失敗");
    },
  });

  const updateMutation = trpc.users.update.useMutation({
    onSuccess: () => {
      toast.success("用戶更新成功！");
      setIsDialogOpen(false);
      setEditingUser(null);
      resetForm();
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "更新失敗");
    },
  });

  const deleteMutation = trpc.users.delete.useMutation({
    onSuccess: () => {
      toast.success("用戶已刪除");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "刪除失敗");
    },
  });

  const resetForm = () => {
    setFormData({
      username: "",
      password: "",
      name: "",
      email: "",
      role: "viewer",
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name) {
      toast.error("請填寫用戶姓名");
      return;
    }

    if (!editingUser && !formData.username) {
      toast.error("請填寫用戶名");
      return;
    }

    if (!editingUser && !formData.password) {
      toast.error("請填寫密碼");
      return;
    }

    if (editingUser) {
      const updateData: any = {
        id: editingUser.id,
        name: formData.name,
        email: formData.email,
        role: formData.role,
      };
      if (formData.password) {
        updateData.password = formData.password;
      }
      updateMutation.mutate(updateData);
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (user: any) => {
    setEditingUser(user);
    setFormData({
      username: user.username || "",
      password: "",
      name: user.name || "",
      email: user.email || "",
      role: user.role,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (id === currentUser?.id) {
      toast.error("不能刪除當前登錄用戶");
      return;
    }
    if (confirm("確定要刪除這個用戶嗎？")) {
      deleteMutation.mutate({ id });
    }
  };

  const roleMap = {
    admin: { label: "管理員", icon: Shield, color: "bg-red-500" },
    editor: { label: "編輯者", icon: Edit, color: "bg-blue-500" },
    viewer: { label: "查看者", icon: Eye, color: "bg-gray-500" },
  };

  if (currentUser?.role !== "admin") {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">您沒有權限訪問此頁面</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">用戶管理</h1>
          <p className="text-muted-foreground mt-1">管理系統用戶和權限</p>
        </div>
        <Dialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) {
              setEditingUser(null);
              resetForm();
            }
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              添加用戶
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingUser ? "編輯用戶" : "添加用戶"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              {!editingUser && (
                <div className="space-y-2">
                  <Label htmlFor="username">用戶名 *</Label>
                  <Input
                    id="username"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    placeholder="用於登錄的用戶名"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="name">姓名 *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="用戶真實姓名"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">郵箱</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="user@example.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">{editingUser ? "新密碼（留空保持不變）" : "密碼 *"}</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder={editingUser ? "留空保持原密碼" : "設置登錄密碼"}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">權限角色</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value: any) => setFormData({ ...formData, role: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">管理員</SelectItem>
                    <SelectItem value="editor">編輯者</SelectItem>
                    <SelectItem value="viewer">查看者</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  管理員：完全控制權限 | 編輯者：可編輯數據 | 查看者：僅查看
                </p>
              </div>

              <div className="flex gap-3 justify-end pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsDialogOpen(false);
                    setEditingUser(null);
                    resetForm();
                  }}
                >
                  取消
                </Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingUser ? "更新" : "創建"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {users && users.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {users.map((user) => {
            const roleInfo = roleMap[user.role];
            const RoleIcon = roleInfo.icon;
            return (
              <Card key={user.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{user.name}</CardTitle>
                        <p className="text-sm text-muted-foreground">{user.username}</p>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {user.email && (
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  )}
                  <div className="flex items-center gap-2">
                    <Badge className={`${roleInfo.color} text-white`}>
                      <RoleIcon className="h-3 w-3 mr-1" />
                      {roleInfo.label}
                    </Badge>
                    {user.isOnline && (
                      <Badge variant="outline" className="border-green-500 text-green-500">
                        在線
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button size="sm" variant="outline" onClick={() => handleEdit(user)}>
                      <Edit className="h-4 w-4 mr-1" />
                      編輯
                    </Button>
                    {user.id !== currentUser?.id && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(user.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        刪除
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            還沒有用戶，點擊上方按鈕添加第一個用戶
          </CardContent>
        </Card>
      )}
    </div>
  );
}
