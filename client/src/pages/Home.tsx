import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Users, Calendar, MapPin, TrendingUp } from "lucide-react";

export default function Home() {
  const { data: groups } = trpc.groups.list.useQuery();
  const { data: locations } = trpc.locations.list.useQuery();

  const stats = {
    totalGroups: groups?.length || 0,
    ongoingGroups: groups?.filter((g) => g.status === "ongoing").length || 0,
    totalLocations: locations?.length || 0,
    totalParticipants:
      groups?.reduce((sum, g) => sum + (g.totalCount || 0), 0) || 0,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">儀表板</h1>
        <p className="text-muted-foreground mt-1">教育團組行程管理系統概覽</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              團組總數
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalGroups}</div>
            <p className="text-xs text-muted-foreground mt-1">
              進行中: {stats.ongoingGroups}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              參訪地點
            </CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalLocations}</div>
            <p className="text-xs text-muted-foreground mt-1">可用資源</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              總參與人數
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalParticipants}</div>
            <p className="text-xs text-muted-foreground mt-1">所有團組</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              活動總數
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {groups?.reduce((sum, g) => sum + (g.days || 0), 0) || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">行程天數</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>最近團組</CardTitle>
          </CardHeader>
          <CardContent>
            {groups && groups.length > 0 ? (
              <div className="space-y-4">
                {groups.slice(0, 5).map((group) => (
                  <div
                    key={group.id}
                    className="flex items-center justify-between border-b pb-3 last:border-0"
                  >
                    <div>
                      <p className="font-medium">{group.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {group.code} · {group.totalCount} 人
                      </p>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(group.startDate).toLocaleDateString("zh-CN")}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                暫無團組數據
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>系統快捷操作</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <a
              href="/groups/new"
              className="block p-4 border rounded-lg hover:bg-accent transition-colors"
            >
              <p className="font-medium">新建團組</p>
              <p className="text-sm text-muted-foreground">創建新的教育團組</p>
            </a>
            <a
              href="/resources/locations"
              className="block p-4 border rounded-lg hover:bg-accent transition-colors"
            >
              <p className="font-medium">管理景點</p>
              <p className="text-sm text-muted-foreground">添加或編輯參訪地點</p>
            </a>
            <a
              href="/settings/snapshots"
              className="block p-4 border rounded-lg hover:bg-accent transition-colors"
            >
              <p className="font-medium">版本控制</p>
              <p className="text-sm text-muted-foreground">管理系統快照和備份</p>
            </a>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
