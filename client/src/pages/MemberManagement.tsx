import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Users,
  UserPlus,
  CalendarDays,
  Search,
  Edit,
  Trash2,
  Plus,
  MapPin,
  Phone,
  Mail,
  MessageCircle,
  Award,
  Car,
  Briefcase,
  UserCheck,
  Clock,
  X,
} from "lucide-react";

// ===== 類型定義 =====
type StaffMember = {
  id: number;
  name: string;
  role: "coordinator" | "staff" | "guide" | "driver";
  phone?: string | null;
  email?: string | null;
  wechat?: string | null;
  languages?: string | null;
  licenseNumber?: string | null;
  notes?: string | null;
  isActive: boolean;
};

type Assignment = {
  id: number;
  groupId: number;
  staffId: number;
  role: "coordinator" | "staff" | "guide" | "driver";
  date?: string | null;
  taskName?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  notes?: string | null;
  groupName?: string | null;
  groupCode?: string | null;
  groupStartDate?: string | null;
  groupEndDate?: string | null;
};

type FormData = {
  name: string;
  role: "coordinator" | "staff" | "guide" | "driver";
  phone: string;
  email: string;
  wechat: string;
  languages: string;
  licenseNumber: string;
  notes: string;
};

// ===== 工具函數 =====
const roleLabel: Record<string, string> = {
  coordinator: "總統籌",
  staff: "工作人員",
  guide: "導遊",
  driver: "司機",
};

const roleColor: Record<string, string> = {
  coordinator: "bg-purple-100 text-purple-800",
  staff: "bg-blue-100 text-blue-800",
  guide: "bg-green-100 text-green-800",
  driver: "bg-orange-100 text-orange-800",
};

const roleIcon: Record<string, React.ReactNode> = {
  coordinator: <Award className="w-4 h-4" />,
  staff: <Briefcase className="w-4 h-4" />,
  guide: <MapPin className="w-4 h-4" />,
  driver: <Car className="w-4 h-4" />,
};

const defaultForm: FormData = {
  name: "",
  role: "staff",
  phone: "",
  email: "",
  wechat: "",
  languages: "",
  licenseNumber: "",
  notes: "",
};

// ===== 主組件 =====
export default function MemberManagement() {
  const [activeTab, setActiveTab] = useState("staff-list");
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");

  // 對話框狀態
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);

  // 表單狀態
  const [formData, setFormData] = useState<FormData>(defaultForm);

  // 指派表單狀態
  const [assignForm, setAssignForm] = useState({
    groupId: "",
    role: "staff" as "coordinator" | "staff" | "guide" | "driver",
    date: "",
    taskName: "",
    startTime: "",
    endTime: "",
    notes: "",
  });

  // ===== 數據查詢 =====
  const { data: staffList = [], refetch: refetchStaff } = trpc.staff.list.useQuery();
  const { data: groups = [] } = trpc.groups.list.useQuery();

  // 獲取選中工作人員的指派列表
  const { data: assignments = [], refetch: refetchAssignments } =
    trpc.staff.getAssignments.useQuery(
      { staffId: selectedStaff?.id ?? 0 },
      { enabled: !!selectedStaff }
    );

  // ===== Mutations =====
  const createStaff = trpc.staff.create.useMutation({
    onSuccess: () => {
      toast.success("工作人員已添加");
      setShowAddDialog(false);
      setFormData(defaultForm);
      refetchStaff();
    },
    onError: (err) => toast.error(`添加失敗：${err.message}`),
  });

  const updateStaff = trpc.staff.update.useMutation({
    onSuccess: () => {
      toast.success("工作人員信息已更新");
      setShowEditDialog(false);
      refetchStaff();
    },
    onError: (err) => toast.error(`更新失敗：${err.message}`),
  });

  const deleteStaff = trpc.staff.delete.useMutation({
    onSuccess: () => {
      toast.success("工作人員已停用");
      refetchStaff();
    },
    onError: (err) => toast.error(`操作失敗：${err.message}`),
  });

  const assignStaff = trpc.batchStaff.assign.useMutation({
    onSuccess: () => {
      toast.success("指派成功");
      setShowAssignDialog(false);
      setAssignForm({ groupId: "", role: "staff", date: "", taskName: "", startTime: "", endTime: "", notes: "" });
      refetchAssignments();
    },
    onError: (err) => toast.error(`指派失敗：${err.message}`),
  });

  const removeAssignment = trpc.batchStaff.remove.useMutation({
    onSuccess: () => {
      toast.success("已取消指派");
      refetchAssignments();
    },
    onError: (err) => toast.error(`操作失敗：${err.message}`),
  });

  // ===== 過濾邏輯 =====
  const filteredStaff = useMemo(() => {
    return (staffList as StaffMember[]).filter((s) => {
      const matchesSearch =
        !searchQuery ||
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.phone && s.phone.includes(searchQuery)) ||
        (s.email && s.email.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesRole = roleFilter === "all" || s.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [staffList, searchQuery, roleFilter]);

  // ===== 統計數據 =====
  const stats = useMemo(() => {
    const list = staffList as StaffMember[];
    return {
      total: list.length,
      coordinator: list.filter((s) => s.role === "coordinator").length,
      staff: list.filter((s) => s.role === "staff").length,
      guide: list.filter((s) => s.role === "guide").length,
      driver: list.filter((s) => s.role === "driver").length,
    };
  }, [staffList]);

  // ===== 操作函數 =====
  const openEditDialog = (staff: StaffMember) => {
    setSelectedStaff(staff);
    setFormData({
      name: staff.name,
      role: staff.role,
      phone: staff.phone ?? "",
      email: staff.email ?? "",
      wechat: staff.wechat ?? "",
      languages: staff.languages ?? "",
      licenseNumber: staff.licenseNumber ?? "",
      notes: staff.notes ?? "",
    });
    setShowEditDialog(true);
  };

  const openAssignDialog = (staff: StaffMember) => {
    setSelectedStaff(staff);
    setShowAssignDialog(true);
  };

  const handleCreate = () => {
    if (!formData.name.trim()) {
      toast.error("請輸入姓名");
      return;
    }
    createStaff.mutate({
      name: formData.name.trim(),
      role: formData.role,
      phone: formData.phone || undefined,
      email: formData.email || undefined,
      wechat: formData.wechat || undefined,
      languages: formData.languages || undefined,
      licenseNumber: formData.licenseNumber || undefined,
      notes: formData.notes || undefined,
    });
  };

  const handleUpdate = () => {
    if (!selectedStaff) return;
    updateStaff.mutate({
      id: selectedStaff.id,
      name: formData.name.trim(),
      role: formData.role,
      phone: formData.phone || null,
      email: formData.email || null,
      wechat: formData.wechat || null,
      languages: formData.languages || null,
      licenseNumber: formData.licenseNumber || null,
      notes: formData.notes || null,
    });
  };

  const handleAssign = () => {
    if (!selectedStaff || !assignForm.groupId) {
      toast.error("請選擇團組");
      return;
    }
    if (!assignForm.date) {
      toast.error("請選擇具體日期");
      return;
    }
    assignStaff.mutate({
      staffId: selectedStaff.id,
      groupId: Number(assignForm.groupId),
      role: assignForm.role,
      date: assignForm.date,
      taskName: assignForm.taskName || undefined,
      startTime: assignForm.startTime || undefined,
      endTime: assignForm.endTime || undefined,
      notes: assignForm.notes || undefined,
    });
  };

  // ===== 渲染 =====
  return (
    <div className="p-6 space-y-6">
      {/* 頁面標題 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">工作人員管理</h1>
          <p className="text-sm text-muted-foreground mt-1">
            管理工作人員信息，指派至團組行程，監控出勤狀態
          </p>
        </div>
        <Button
          onClick={() => {
            setFormData(defaultForm);
            setShowAddDialog(true);
          }}
        >
          <UserPlus className="w-4 h-4 mr-2" />
          添加工作人員
        </Button>
      </div>

      {/* 統計卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">總計</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        {(["coordinator", "staff", "guide", "driver"] as const).map((role) => (
          <Card key={role}>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">{roleIcon[role]}</span>
                <div>
                  <p className="text-xs text-muted-foreground">{roleLabel[role]}</p>
                  <p className="text-2xl font-bold">{stats[role]}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 主要內容 */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="staff-list">
            <Users className="w-4 h-4 mr-2" />
            工作人員列表
          </TabsTrigger>
          <TabsTrigger value="assignments">
            <CalendarDays className="w-4 h-4 mr-2" />
            指派管理
          </TabsTrigger>
        </TabsList>

        {/* ===== Tab 1：工作人員列表 ===== */}
        <TabsContent value="staff-list" className="space-y-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="搜索姓名、電話、郵箱..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="全部角色" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部角色</SelectItem>
                <SelectItem value="coordinator">總統籌</SelectItem>
                <SelectItem value="staff">工作人員</SelectItem>
                <SelectItem value="guide">導遊</SelectItem>
                <SelectItem value="driver">司機</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {filteredStaff.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-lg font-medium">暫無工作人員</p>
              <p className="text-sm">點擊右上角「添加工作人員」開始創建</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>姓名</TableHead>
                    <TableHead>角色</TableHead>
                    <TableHead>聯繫方式</TableHead>
                    <TableHead>語言/資質</TableHead>
                    <TableHead>備注</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStaff.map((staff) => (
                    <TableRow key={staff.id}>
                      <TableCell className="font-medium">{staff.name}</TableCell>
                      <TableCell>
                        <Badge className={`${roleColor[staff.role]} border-0`}>
                          <span className="flex items-center gap-1">
                            {roleIcon[staff.role]}
                            {roleLabel[staff.role]}
                          </span>
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1 text-sm">
                          {staff.phone && (
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Phone className="w-3 h-3" />
                              {staff.phone}
                            </div>
                          )}
                          {staff.email && (
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Mail className="w-3 h-3" />
                              {staff.email}
                            </div>
                          )}
                          {staff.wechat && (
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <MessageCircle className="w-3 h-3" />
                              {staff.wechat}
                            </div>
                          )}
                          {!staff.phone && !staff.email && !staff.wechat && (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1 text-sm text-muted-foreground">
                          {staff.languages && <div>語言：{staff.languages}</div>}
                          {staff.licenseNumber && <div>證號：{staff.licenseNumber}</div>}
                          {!staff.languages && !staff.licenseNumber && <span>—</span>}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                        {staff.notes || "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openAssignDialog(staff)}
                            title="指派行程"
                          >
                            <CalendarDays className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(staff)}
                            title="編輯"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (confirm(`確定要停用「${staff.name}」嗎？`)) {
                                deleteStaff.mutate({ id: staff.id });
                              }
                            }}
                            title="停用"
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* ===== Tab 2：指派管理 ===== */}
        <TabsContent value="assignments" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 左側：工作人員選擇 */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground">選擇工作人員</h3>
              <div className="border rounded-md divide-y max-h-[500px] overflow-y-auto">
                {(staffList as StaffMember[]).length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    暫無工作人員
                  </div>
                ) : (
                  (staffList as StaffMember[]).map((staff) => (
                    <button
                      key={staff.id}
                      onClick={() => setSelectedStaff(staff)}
                      className={`w-full text-left px-4 py-3 hover:bg-muted transition-colors ${
                        selectedStaff?.id === staff.id ? "bg-muted" : ""
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">{staff.name}</span>
                        <Badge className={`${roleColor[staff.role]} border-0 text-xs`}>
                          {roleLabel[staff.role]}
                        </Badge>
                      </div>
                      {staff.phone && (
                        <p className="text-xs text-muted-foreground mt-0.5">{staff.phone}</p>
                      )}
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* 右側：指派詳情 */}
            <div className="md:col-span-2 space-y-4">
              {selectedStaff ? (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">{selectedStaff.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {roleLabel[selectedStaff.role]}
                        {selectedStaff.phone && ` · ${selectedStaff.phone}`}
                      </p>
                    </div>
                    <Button size="sm" onClick={() => openAssignDialog(selectedStaff)}>
                      <Plus className="w-4 h-4 mr-1" />
                      新增指派
                    </Button>
                  </div>

                  {(assignments as Assignment[]).length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground border rounded-md">
                      <CalendarDays className="w-10 h-10 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">尚未指派任何行程</p>
                      <p className="text-xs mt-1">點擊「新增指派」開始指派</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {(assignments as Assignment[]).map((item) => (
                        <Card key={item.id}>
                          <CardContent className="pt-4">
                            <div className="flex items-start justify-between">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-sm">
                                    {item.groupName ?? `團組 #${item.groupId}`}
                                  </span>
                                  <Badge className={`${roleColor[item.role]} border-0 text-xs`}>
                                    {roleLabel[item.role]}
                                  </Badge>
                                </div>
                                {item.groupCode && (
                                  <p className="text-xs text-muted-foreground">{item.groupCode}</p>
                                )}
                                {item.date && (
                                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <CalendarDays className="w-3 h-3" />
                                    {item.date}
                                    {item.startTime && ` ${item.startTime}`}
                                    {item.endTime && ` → ${item.endTime}`}
                                  </div>
                                )}
                                {item.taskName && (
                                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <MapPin className="w-3 h-3" />
                                    {item.taskName}
                                  </div>
                                )}
                                {item.notes && (
                                  <p className="text-xs text-muted-foreground">備注：{item.notes}</p>
                                )}
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  if (confirm("確定要取消此指派嗎？")) {
                                    removeAssignment.mutate({ id: item.id });
                                  }
                                }}
                                className="text-destructive hover:text-destructive"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-16 text-muted-foreground border rounded-md">
                  <UserCheck className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">請從左側選擇工作人員</p>
                  <p className="text-xs mt-1">查看和管理其行程指派</p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* ===== 添加工作人員對話框 ===== */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>添加工作人員</DialogTitle>
          </DialogHeader>
          <StaffForm formData={formData} setFormData={setFormData} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              取消
            </Button>
            <Button onClick={handleCreate} disabled={createStaff.isPending}>
              {createStaff.isPending ? "添加中..." : "確認添加"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== 編輯工作人員對話框 ===== */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>編輯工作人員 — {selectedStaff?.name}</DialogTitle>
          </DialogHeader>
          <StaffForm formData={formData} setFormData={setFormData} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              取消
            </Button>
            <Button onClick={handleUpdate} disabled={updateStaff.isPending}>
              {updateStaff.isPending ? "保存中..." : "保存修改"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== 指派行程對話框 ===== */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>指派行程 — {selectedStaff?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>選擇團組 *</Label>
              <Select
                value={assignForm.groupId}
                onValueChange={(v) => setAssignForm((f) => ({ ...f, groupId: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="請選擇團組" />
                </SelectTrigger>
                <SelectContent>
                  {(groups as any[]).map((g: any) => (
                    <SelectItem key={g.id} value={String(g.id)}>
                      {g.name} ({g.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>在此團組的角色</Label>
              <Select
                value={assignForm.role}
                onValueChange={(v) =>
                  setAssignForm((f) => ({
                    ...f,
                    role: v as "coordinator" | "staff" | "guide" | "driver",
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="coordinator">總統籌</SelectItem>
                  <SelectItem value="staff">工作人員</SelectItem>
                  <SelectItem value="guide">導遊</SelectItem>
                  <SelectItem value="driver">司機</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>具體日期 *</Label>
              <Input
                type="date"
                value={assignForm.date}
                onChange={(e) => setAssignForm((f) => ({ ...f, date: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>行程點名稱</Label>
              <Input
                placeholder="如：太空館、海洋公園、接機"
                value={assignForm.taskName}
                onChange={(e) => setAssignForm((f) => ({ ...f, taskName: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>開始時間</Label>
                <Input
                  type="time"
                  value={assignForm.startTime}
                  onChange={(e) => setAssignForm((f) => ({ ...f, startTime: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>結束時間</Label>
                <Input
                  type="time"
                  value={assignForm.endTime}
                  onChange={(e) => setAssignForm((f) => ({ ...f, endTime: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>備注</Label>
              <Textarea
                placeholder="指派備注（可選）"
                value={assignForm.notes}
                onChange={(e) => setAssignForm((f) => ({ ...f, notes: e.target.value }))}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignDialog(false)}>
              取消
            </Button>
            <Button onClick={handleAssign} disabled={assignStaff.isPending}>
              {assignStaff.isPending ? "指派中..." : "確認指派"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ===== 工作人員表單組件 =====
function StaffForm({
  formData,
  setFormData,
}: {
  formData: FormData;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
}) {
  return (
    <div className="space-y-4 py-2">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>姓名 *</Label>
          <Input
            placeholder="請輸入姓名"
            value={formData.name}
            onChange={(e) => setFormData((f) => ({ ...f, name: e.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label>角色 *</Label>
          <Select
            value={formData.role}
            onValueChange={(v) =>
              setFormData((f) => ({
                ...f,
                role: v as "coordinator" | "staff" | "guide" | "driver",
              }))
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="coordinator">總統籌</SelectItem>
              <SelectItem value="staff">工作人員</SelectItem>
              <SelectItem value="guide">導遊</SelectItem>
              <SelectItem value="driver">司機</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>電話</Label>
          <Input
            placeholder="聯繫電話"
            value={formData.phone}
            onChange={(e) => setFormData((f) => ({ ...f, phone: e.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label>微信</Label>
          <Input
            placeholder="微信號"
            value={formData.wechat}
            onChange={(e) => setFormData((f) => ({ ...f, wechat: e.target.value }))}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>郵箱</Label>
        <Input
          type="email"
          placeholder="電子郵箱"
          value={formData.email}
          onChange={(e) => setFormData((f) => ({ ...f, email: e.target.value }))}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>語言能力</Label>
          <Input
            placeholder="如：普通話、廣東話、英語"
            value={formData.languages}
            onChange={(e) => setFormData((f) => ({ ...f, languages: e.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label>證件號碼</Label>
          <Input
            placeholder="導遊證/駕照號碼"
            value={formData.licenseNumber}
            onChange={(e) =>
              setFormData((f) => ({ ...f, licenseNumber: e.target.value }))
            }
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>備注</Label>
        <Textarea
          placeholder="其他備注信息"
          value={formData.notes}
          onChange={(e) => setFormData((f) => ({ ...f, notes: e.target.value }))}
          rows={2}
        />
      </div>
    </div>
  );
}
