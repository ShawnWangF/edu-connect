import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Save, Database, Clock, Copy } from "lucide-react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";

export default function Settings() {
  const { user: currentUser } = useAuth();
  const [snapshotSummary, setSnapshotSummary] = useState("");

  const { data: snapshots, refetch } = trpc.snapshots.list.useQuery(undefined, {
    enabled: currentUser?.role === "admin",
  });

  const { data: groups } = trpc.groups.list.useQuery();
  const { data: locations } = trpc.locations.list.useQuery();

  const createSnapshotMutation = trpc.snapshots.create.useMutation({
    onSuccess: (data) => {
      toast.success("快照創建成功！");
      toast.info(`快照令牌: ${data.token}`, { duration: 10000 });
      setSnapshotSummary("");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "創建快照失敗");
    },
  });

  const handleCreateSnapshot = () => {
    if (!snapshotSummary.trim()) {
      toast.error("請填寫快照摘要");
      return;
    }

    // 收集當前系統數據
    const snapshotData = {
      groups: groups || [],
      locations: locations || [],
      timestamp: new Date().toISOString(),
    };

    createSnapshotMutation.mutate({
      type: "manual",
      summary: snapshotSummary,
      data: snapshotData,
    });
  };

  const copyToken = (token: string) => {
    navigator.clipboard.writeText(token);
    toast.success("令牌已複製到剪貼板");
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
      <div>
        <h1 className="text-3xl font-bold">系統設置</h1>
        <p className="text-muted-foreground mt-1">管理系統配置和版本控制</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            創建手動快照
          </CardTitle>
          <CardDescription>
            保存當前系統狀態，包括所有團組、景點等數據
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="summary">快照摘要</Label>
            <Textarea
              id="summary"
              value={snapshotSummary}
              onChange={(e) => setSnapshotSummary(e.target.value)}
              placeholder="描述這個快照的內容或目的..."
              rows={3}
            />
          </div>
          <Button onClick={handleCreateSnapshot} disabled={createSnapshotMutation.isPending}>
            <Save className="mr-2 h-4 w-4" />
            {createSnapshotMutation.isPending ? "創建中..." : "創建快照"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            快照歷史記錄
          </CardTitle>
          <CardDescription>
            查看所有手動和自動創建的快照
          </CardDescription>
        </CardHeader>
        <CardContent>
          {snapshots && snapshots.length > 0 ? (
            <div className="space-y-3">
              {snapshots.map((snapshot) => (
                <Card key={snapshot.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-medium">
                            {snapshot.type === "manual" ? "手動快照" : "自動快照"}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {format(new Date(snapshot.createdAt), "yyyy-MM-dd HH:mm:ss", {
                              locale: zhCN,
                            })}
                          </span>
                        </div>
                        {snapshot.summary && (
                          <p className="text-sm text-muted-foreground mb-2">
                            {snapshot.summary}
                          </p>
                        )}
                        <div className="flex items-center gap-2">
                          <code className="text-xs bg-muted px-2 py-1 rounded">
                            {snapshot.token}
                          </code>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => copyToken(snapshot.token)}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              暫無快照記錄
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>自動快照設置</CardTitle>
          <CardDescription>
            系統每6小時自動創建一次快照備份
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="font-medium">自動快照間隔</p>
                <p className="text-sm text-muted-foreground">每6小時執行一次</p>
              </div>
              <div className="text-sm text-green-600">已啟用</div>
            </div>
            <p className="text-sm text-muted-foreground">
              自動快照功能已啟用，系統會定期保存數據狀態。如需恢復到某個快照版本，請使用快照令牌。
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>系統信息</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">系統版本</span>
              <span className="font-medium">v1.0.0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">當前用戶</span>
              <span className="font-medium">{currentUser?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">用戶角色</span>
              <span className="font-medium">
                {currentUser?.role === "admin" ? "管理員" : currentUser?.role === "editor" ? "編輯者" : "查看者"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
