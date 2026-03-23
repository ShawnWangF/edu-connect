import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Users, CalendarDays, CheckCircle, XCircle, Clock, Search, UserCheck, AlertCircle } from "lucide-react";

// ===== 類型定義 =====
type Member = {
  id: number;
  name: string;
  identity: string;
  gender?: string;
  phone?: string;
  groupId: number;
  groupName?: string;
  groupCode?: string;
};

type ItineraryMember = {
  id: number;
  itineraryId: number;
  memberId: number;
  role: string;
  name: string;
  identity: string;
  gender?: string;
  phone?: string;
  groupId: number;
};

type MemberStatus = {
  id: number;
  memberId: number;
  itineraryId: number;
  status: string;
  checkInTime?: string | null;
  checkOutTime?: string | null;
  notes?: string | null;
  name: string;
  identity: string;
  gender?: string;
  phone?: string;
  groupId: number;
};

// ===== 工具函數 =====
const identityLabel: Record<string, string> = {
  student: "學生",
  teacher: "教師",
  staff: "工作人員",
  other: "其他",
};

const genderLabel: Record<string, string> = {
  male: "男",
  female: "女",
  other: "其他",
};

const roleLabel: Record<string, string> = {
  guide: "導遊",
  staff: "工作人員",
  security: "安保",
  coordinator: "協調員",
  other: "其他",
};

const statusLabel: Record<string, string> = {
  pending: "待指派",
  assigned: "已指派",
  in_progress: "進行中",
  completed: "已完成",
  absent: "缺席",
  cancelled: "已取消",
};

const statusColor: Record<string, string> = {
  pending: "bg-gray-100 text-gray-700",
  assigned: "bg-blue-100 text-blue-700",
  in_progress: "bg-yellow-100 text-yellow-700",
  completed: "bg-green-100 text-green-700",
  absent: "bg-red-100 text-red-700",
  cancelled: "bg-gray-100 text-gray-500 line-through",
};

// ===== 主頁面 =====
export default function MemberManagement() {
  const [activeTab, setActiveTab] = useState("members");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<string>("all");

  // 獲取所有人員
  const { data: allMembers = [], isLoading: membersLoading, refetch: refetchMembers } =
    trpc.memberManagement.listAll.useQuery();

  // 計算團組列表（去重）
  const groupOptions = useMemo(() => {
    const groups = new Map<number, { id: number; name: string; code: string }>();
    allMembers.forEach((m: Member) => {
      if (m.groupId && m.groupName) {
        groups.set(m.groupId, { id: m.groupId, name: m.groupName, code: m.groupCode || "" });
      }
    });
    return Array.from(groups.values());
  }, [allMembers]);

  // 過濾人員列表
  const filteredMembers = useMemo(() => {
    return allMembers.filter((m: Member) => {
      const matchSearch = !searchQuery ||
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.phone && m.phone.includes(searchQuery));
      const matchGroup = selectedGroupFilter === "all" || String(m.groupId) === selectedGroupFilter;
      return matchSearch && matchGroup;
    });
  }, [allMembers, searchQuery, selectedGroupFilter]);

  // 統計數據
  const stats = useMemo(() => {
    const total = allMembers.length;
    const students = allMembers.filter((m: Member) => m.identity === "student").length;
    const teachers = allMembers.filter((m: Member) => m.identity === "teacher").length;
    const staff = allMembers.filter((m: Member) => m.identity === "staff").length;
    return { total, students, teachers, staff };
  }, [allMembers]);

  return (
    <div className="p-6 space-y-6">
      {/* 頁面標題 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">人員管理</h1>
          <p className="text-sm text-gray-500 mt-1">管理所有團組人員，支援指派行程及狀態監控</p>
        </div>
      </div>

      {/* 統計卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">總人數</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-50 rounded-lg">
                <UserCheck className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">學生</p>
                <p className="text-2xl font-bold text-gray-900">{stats.students}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-50 rounded-lg">
                <Users className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">教師</p>
                <p className="text-2xl font-bold text-gray-900">{stats.teachers}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-50 rounded-lg">
                <Users className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">工作人員</p>
                <p className="text-2xl font-bold text-gray-900">{stats.staff}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 主要內容 */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="members">
            <Users className="h-4 w-4 mr-2" />
            人員列表
          </TabsTrigger>
          <TabsTrigger value="assign">
            <CalendarDays className="h-4 w-4 mr-2" />
            指派行程
          </TabsTrigger>
          <TabsTrigger value="status">
            <CheckCircle className="h-4 w-4 mr-2" />
            狀態監控
          </TabsTrigger>
        </TabsList>

        {/* 人員列表 Tab */}
        <TabsContent value="members" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="搜尋姓名或電話..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={selectedGroupFilter} onValueChange={setSelectedGroupFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="篩選團組" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部團組</SelectItem>
                    {groupOptions.map((g) => (
                      <SelectItem key={g.id} value={String(g.id)}>
                        {g.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {membersLoading ? (
                <div className="p-8 text-center text-gray-500">載入中...</div>
              ) : filteredMembers.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Users className="h-10 w-10 mx-auto mb-3 text-gray-300" />
                  <p>暫無人員資料</p>
                  <p className="text-xs mt-1">請先在團組詳情頁面匯入人員名單</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>姓名</TableHead>
                      <TableHead>身份</TableHead>
                      <TableHead>性別</TableHead>
                      <TableHead>電話</TableHead>
                      <TableHead>所屬團組</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMembers.map((member: Member) => (
                      <TableRow key={member.id}>
                        <TableCell className="font-medium">{member.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {identityLabel[member.identity] ?? member.identity}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-gray-500 text-sm">
                          {member.gender ? genderLabel[member.gender] ?? member.gender : "-"}
                        </TableCell>
                        <TableCell className="text-gray-500 text-sm">{member.phone || "-"}</TableCell>
                        <TableCell>
                          {member.groupName ? (
                            <span className="text-sm text-blue-600">{member.groupName}</span>
                          ) : (
                            <span className="text-gray-400 text-sm">未分配</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 指派行程 Tab */}
        <TabsContent value="assign" className="mt-4">
          <AssignItineraryTab members={allMembers} groupOptions={groupOptions} />
        </TabsContent>

        {/* 狀態監控 Tab */}
        <TabsContent value="status" className="mt-4">
          <StatusMonitorTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ===== 指派行程 Tab =====
function AssignItineraryTab({
  members,
  groupOptions,
}: {
  members: Member[];
  groupOptions: { id: number; name: string; code: string }[];
}) {
  const [selectedItineraryId, setSelectedItineraryId] = useState<number | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string>("all");
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<number>>(new Set());
  const [selectedRole, setSelectedRole] = useState<string>("staff");
  const [showAssignDialog, setShowAssignDialog] = useState(false);

  // 獲取所有行程（通過所有團組）
  const { data: allGroups = [] } = trpc.groups.list.useQuery();

  // 獲取選定團組的行程
  const groupIdForItinerary = selectedGroupId !== "all" ? parseInt(selectedGroupId) : undefined;
  const { data: itineraries = [], isLoading: itinerariesLoading } = trpc.itineraries.listByGroup.useQuery(
    { groupId: groupIdForItinerary! },
    { enabled: !!groupIdForItinerary }
  );

  // 獲取選定行程的已指派人員
  const { data: assignedMembers = [], refetch: refetchAssigned } = trpc.memberManagement.listByItinerary.useQuery(
    { itineraryId: selectedItineraryId! },
    { enabled: !!selectedItineraryId }
  );

  // 批量指派 mutation
  const batchAssign = trpc.memberManagement.batchAssign.useMutation({
    onSuccess: () => {
      toast.success("人員指派成功");
      setSelectedMemberIds(new Set());
      setShowAssignDialog(false);
      refetchAssigned();
    },
    onError: (err) => toast.error("指派失敗：" + err.message),
  });

  // 移除指派 mutation
  const removeMember = trpc.memberManagement.remove.useMutation({
    onSuccess: () => {
      toast.success("已移除指派");
      refetchAssigned();
    },
    onError: (err) => toast.error("移除失敗：" + err.message),
  });

  // 過濾可選人員（排除已指派的）
  const assignedMemberIds = new Set(assignedMembers.map((m: ItineraryMember) => m.memberId));
  const availableMembers = members.filter((m) => {
    const matchGroup = selectedGroupId === "all" || String(m.groupId) === selectedGroupId;
    return matchGroup && !assignedMemberIds.has(m.id);
  });

  const toggleMember = (id: number) => {
    setSelectedMemberIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAssign = () => {
    if (!selectedItineraryId || selectedMemberIds.size === 0) return;
    batchAssign.mutate({
      itineraryId: selectedItineraryId,
      memberIds: Array.from(selectedMemberIds),
      role: selectedRole as any,
    });
  };

  // 選定行程的詳情
  const selectedItinerary = itineraries.find((i: any) => i.id === selectedItineraryId);

  return (
    <div className="space-y-4">
      {/* 選擇行程 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">選擇行程</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-3">
            <Select value={selectedGroupId} onValueChange={(v) => { setSelectedGroupId(v); setSelectedItineraryId(null); }}>
              <SelectTrigger className="w-56">
                <SelectValue placeholder="選擇團組" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部團組</SelectItem>
                {groupOptions.map((g) => (
                  <SelectItem key={g.id} value={String(g.id)}>
                    {g.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedGroupId !== "all" && (
            <div>
              {itinerariesLoading ? (
                <p className="text-sm text-gray-500">載入行程中...</p>
              ) : itineraries.length === 0 ? (
                <p className="text-sm text-gray-500">該團組暫無行程</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {itineraries.map((itin: any) => (
                    <button
                      key={itin.id}
                      onClick={() => setSelectedItineraryId(itin.id)}
                      className={`text-left p-3 rounded-lg border transition-colors ${
                        selectedItineraryId === itin.id
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      <p className="font-medium text-sm">{itin.locationName || "未命名行程"}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {itin.date ? new Date(itin.date).toLocaleDateString("zh-TW") : "-"}
                        {itin.startTime ? ` ${itin.startTime}` : ""}
                        {itin.timeSlot ? ` (${itin.timeSlot === "morning" ? "上午" : itin.timeSlot === "afternoon" ? "下午" : itin.timeSlot === "evening" ? "晚上" : itin.timeSlot})` : ""}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 已指派人員 & 可指派人員 */}
      {selectedItineraryId && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* 已指派人員 */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">
                  已指派人員
                  <Badge variant="secondary" className="ml-2">{assignedMembers.length}</Badge>
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {assignedMembers.length === 0 ? (
                <div className="p-6 text-center text-gray-500 text-sm">
                  <UserCheck className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  尚未指派任何人員
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>姓名</TableHead>
                      <TableHead>角色</TableHead>
                      <TableHead>身份</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assignedMembers.map((m: ItineraryMember) => (
                      <TableRow key={m.id}>
                        <TableCell className="font-medium">{m.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {roleLabel[m.role] ?? m.role}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-gray-500">
                          {identityLabel[m.identity] ?? m.identity}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 h-7 px-2"
                            onClick={() => removeMember.mutate({ itineraryId: selectedItineraryId, memberId: m.memberId })}
                          >
                            移除
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* 可指派人員 */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">
                  可指派人員
                  <Badge variant="secondary" className="ml-2">{availableMembers.length}</Badge>
                </CardTitle>
                {selectedMemberIds.size > 0 && (
                  <Button
                    size="sm"
                    onClick={() => setShowAssignDialog(true)}
                    className="h-8"
                  >
                    指派選中 ({selectedMemberIds.size})
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {availableMembers.length === 0 ? (
                <div className="p-6 text-center text-gray-500 text-sm">
                  <Users className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  所有人員均已指派
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">
                        <Checkbox
                          checked={selectedMemberIds.size === availableMembers.length && availableMembers.length > 0}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedMemberIds(new Set(availableMembers.map((m) => m.id)));
                            } else {
                              setSelectedMemberIds(new Set());
                            }
                          }}
                        />
                      </TableHead>
                      <TableHead>姓名</TableHead>
                      <TableHead>身份</TableHead>
                      <TableHead>所屬團組</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {availableMembers.map((m: Member) => (
                      <TableRow
                        key={m.id}
                        className={selectedMemberIds.has(m.id) ? "bg-blue-50" : ""}
                        onClick={() => toggleMember(m.id)}
                        style={{ cursor: "pointer" }}
                      >
                        <TableCell>
                          <Checkbox
                            checked={selectedMemberIds.has(m.id)}
                            onCheckedChange={() => toggleMember(m.id)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{m.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {identityLabel[m.identity] ?? m.identity}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-gray-500">
                          {m.groupName || "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* 指派確認對話框 */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>確認指派</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              將 <strong>{selectedMemberIds.size}</strong> 名人員指派至：
              <br />
              <span className="text-blue-600 font-medium">
                {selectedItinerary?.locationName || "選定行程"}
              </span>
            </p>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">指派角色</label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(roleLabel).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignDialog(false)}>取消</Button>
            <Button
              onClick={handleAssign}
              disabled={batchAssign.isPending}
            >
              {batchAssign.isPending ? "指派中..." : "確認指派"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ===== 狀態監控 Tab =====
function StatusMonitorTab() {
  const [selectedGroupId, setSelectedGroupId] = useState<string>("all");
  const [selectedItineraryId, setSelectedItineraryId] = useState<number | null>(null);
  const [editingStatus, setEditingStatus] = useState<MemberStatus | null>(null);
  const [newStatus, setNewStatus] = useState<string>("assigned");
  const [checkInTime, setCheckInTime] = useState<string>("");
  const [checkOutTime, setCheckOutTime] = useState<string>("");
  const [statusNotes, setStatusNotes] = useState<string>("");

  // 獲取所有人員（用於取得團組列表）
  const { data: allMembers = [] } = trpc.memberManagement.listAll.useQuery();
  const groupOptions = useMemo(() => {
    const groups = new Map<number, { id: number; name: string; code: string }>();
    allMembers.forEach((m: Member) => {
      if (m.groupId && m.groupName) {
        groups.set(m.groupId, { id: m.groupId, name: m.groupName, code: m.groupCode || "" });
      }
    });
    return Array.from(groups.values());
  }, [allMembers]);

  // 獲取選定團組的行程
  const groupIdForItinerary = selectedGroupId !== "all" ? parseInt(selectedGroupId) : undefined;
  const { data: itineraries = [] } = trpc.itineraries.listByGroup.useQuery(
    { groupId: groupIdForItinerary! },
    { enabled: !!groupIdForItinerary }
  );

  // 獲取選定行程的人員狀態
  const { data: memberStatuses = [], refetch: refetchStatuses } = trpc.memberManagement.getStatusByItinerary.useQuery(
    { itineraryId: selectedItineraryId! },
    { enabled: !!selectedItineraryId }
  );

  // 獲取選定行程的已指派人員（用於顯示未有狀態記錄的人員）
  const { data: assignedMembers = [] } = trpc.memberManagement.listByItinerary.useQuery(
    { itineraryId: selectedItineraryId! },
    { enabled: !!selectedItineraryId }
  );

  // 更新狀態 mutation
  const updateStatus = trpc.memberManagement.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("狀態更新成功");
      setEditingStatus(null);
      refetchStatuses();
    },
    onError: (err) => toast.error("更新失敗：" + err.message),
  });

  // 合併已指派人員和狀態記錄
  const memberStatusMap = new Map<number, MemberStatus>(
    memberStatuses.map((s: MemberStatus) => [s.memberId, s])
  );

  // 統計
  const statusStats = useMemo(() => {
    const counts: Record<string, number> = {
      pending: 0, assigned: 0, in_progress: 0, completed: 0, absent: 0, cancelled: 0,
    };
    assignedMembers.forEach((m: ItineraryMember) => {
      const status = memberStatusMap.get(m.memberId);
      const s = status?.status ?? "pending";
      counts[s] = (counts[s] || 0) + 1;
    });
    return counts;
  }, [assignedMembers, memberStatuses]);

  const openEditDialog = (member: ItineraryMember) => {
    const status = memberStatusMap.get(member.memberId);
    setEditingStatus(status ?? {
      id: 0,
      memberId: member.memberId,
      itineraryId: selectedItineraryId!,
      status: "pending",
      name: member.name,
      identity: member.identity,
      groupId: member.groupId,
    } as MemberStatus);
    setNewStatus(status?.status ?? "pending");
    setCheckInTime(status?.checkInTime ? new Date(status.checkInTime).toISOString().slice(0, 16) : "");
    setCheckOutTime(status?.checkOutTime ? new Date(status.checkOutTime).toISOString().slice(0, 16) : "");
    setStatusNotes(status?.notes ?? "");
  };

  const handleUpdateStatus = () => {
    if (!editingStatus || !selectedItineraryId) return;
    updateStatus.mutate({
      memberId: editingStatus.memberId,
      itineraryId: selectedItineraryId,
      status: newStatus as any,
      checkInTime: checkInTime || null,
      checkOutTime: checkOutTime || null,
      notes: statusNotes || null,
    });
  };

  return (
    <div className="space-y-4">
      {/* 選擇行程 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">選擇監控行程</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Select value={selectedGroupId} onValueChange={(v) => { setSelectedGroupId(v); setSelectedItineraryId(null); }}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="選擇團組" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部團組</SelectItem>
              {groupOptions.map((g) => (
                <SelectItem key={g.id} value={String(g.id)}>
                  {g.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedGroupId !== "all" && itineraries.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {itineraries.map((itin: any) => (
                <button
                  key={itin.id}
                  onClick={() => setSelectedItineraryId(itin.id)}
                  className={`text-left p-3 rounded-lg border transition-colors ${
                    selectedItineraryId === itin.id
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  <p className="font-medium text-sm">{itin.locationName || "未命名行程"}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {itin.date ? new Date(itin.date).toLocaleDateString("zh-TW") : "-"}
                    {itin.startTime ? ` ${itin.startTime}` : ""}
                  </p>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 狀態統計 */}
      {selectedItineraryId && (
        <>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            {Object.entries(statusLabel).map(([key, label]) => (
              <Card key={key}>
                <CardContent className="p-3 text-center">
                  <p className="text-lg font-bold text-gray-900">{statusStats[key] ?? 0}</p>
                  <p className="text-xs text-gray-500">{label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* 人員狀態列表 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                人員狀態列表
                <Badge variant="secondary" className="ml-2">{assignedMembers.length} 人</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {assignedMembers.length === 0 ? (
                <div className="p-6 text-center text-gray-500 text-sm">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  此行程尚未指派人員
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>姓名</TableHead>
                      <TableHead>身份</TableHead>
                      <TableHead>角色</TableHead>
                      <TableHead>狀態</TableHead>
                      <TableHead>簽到時間</TableHead>
                      <TableHead>簽退時間</TableHead>
                      <TableHead>備註</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assignedMembers.map((m: ItineraryMember) => {
                      const status = memberStatusMap.get(m.memberId);
                      const currentStatus = status?.status ?? "pending";
                      return (
                        <TableRow key={m.id}>
                          <TableCell className="font-medium">{m.name}</TableCell>
                          <TableCell className="text-xs text-gray-500">
                            {identityLabel[m.identity] ?? m.identity}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {roleLabel[m.role] ?? m.role}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColor[currentStatus]}`}>
                              {statusLabel[currentStatus] ?? currentStatus}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs text-gray-500">
                            {status?.checkInTime
                              ? new Date(status.checkInTime).toLocaleString("zh-TW", { hour: "2-digit", minute: "2-digit" })
                              : "-"}
                          </TableCell>
                          <TableCell className="text-xs text-gray-500">
                            {status?.checkOutTime
                              ? new Date(status.checkOutTime).toLocaleString("zh-TW", { hour: "2-digit", minute: "2-digit" })
                              : "-"}
                          </TableCell>
                          <TableCell className="text-xs text-gray-500 max-w-32 truncate">
                            {status?.notes || "-"}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 px-2 text-xs"
                              onClick={() => openEditDialog(m)}
                            >
                              更新
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* 更新狀態對話框 */}
      <Dialog open={!!editingStatus} onOpenChange={(open) => !open && setEditingStatus(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>更新人員狀態 - {editingStatus?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">狀態</label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(statusLabel).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">簽到時間</label>
              <Input
                type="datetime-local"
                value={checkInTime}
                onChange={(e) => setCheckInTime(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">簽退時間</label>
              <Input
                type="datetime-local"
                value={checkOutTime}
                onChange={(e) => setCheckOutTime(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">備註</label>
              <Input
                placeholder="輸入備註..."
                value={statusNotes}
                onChange={(e) => setStatusNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingStatus(null)}>取消</Button>
            <Button
              onClick={handleUpdateStatus}
              disabled={updateStatus.isPending}
            >
              {updateStatus.isPending ? "更新中..." : "確認更新"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
