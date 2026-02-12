import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { BarChart3, TrendingUp, MapPin, Users } from "lucide-react";

export default function Reports() {
  const { data: groups } = trpc.groups.list.useQuery();
  const { data: locations } = trpc.locations.list.useQuery();

  // 統計數據
  const stats = {
    totalGroups: groups?.length || 0,
    preparingGroups: groups?.filter((g) => g.status === "preparing").length || 0,
    ongoingGroups: groups?.filter((g) => g.status === "ongoing").length || 0,
    completedGroups: groups?.filter((g) => g.status === "completed").length || 0,
    totalParticipants: groups?.reduce((sum, g) => sum + (g.totalCount || 0), 0) || 0,
    totalDays: groups?.reduce((sum, g) => sum + (g.days || 0), 0) || 0,
    totalLocations: locations?.length || 0,
  };

  // 按類型統計團組
  const groupsByType = {
    elementary: groups?.filter((g) => g.type === "elementary").length || 0,
    middle: groups?.filter((g) => g.type === "middle").length || 0,
    vip: groups?.filter((g) => g.type === "vip").length || 0,
  };

  // 景點使用統計（簡化版）
  const locationStats = locations?.map((loc) => ({
    name: loc.name,
    capacity: loc.capacity,
    type: loc.applicableType,
  })) || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">統計報表</h1>
        <p className="text-muted-foreground mt-1">查看系統數據統計和分析</p>
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
            <div className="text-xs text-muted-foreground mt-2 space-y-1">
              <p>準備中: {stats.preparingGroups}</p>
              <p>進行中: {stats.ongoingGroups}</p>
              <p>已完成: {stats.completedGroups}</p>
            </div>
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
            <p className="text-xs text-muted-foreground mt-1">所有團組合計</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              行程總天數
            </CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalDays}</div>
            <p className="text-xs text-muted-foreground mt-1">累計行程天數</p>
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
            <p className="text-xs text-muted-foreground mt-1">可用景點資源</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>團組類型分布</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">小學團組</span>
                <div className="flex items-center gap-2">
                  <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500"
                      style={{
                        width: `${stats.totalGroups > 0 ? (groupsByType.elementary / stats.totalGroups) * 100 : 0}%`,
                      }}
                    />
                  </div>
                  <span className="text-sm font-medium w-12 text-right">
                    {groupsByType.elementary}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">中學團組</span>
                <div className="flex items-center gap-2">
                  <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500"
                      style={{
                        width: `${stats.totalGroups > 0 ? (groupsByType.middle / stats.totalGroups) * 100 : 0}%`,
                      }}
                    />
                  </div>
                  <span className="text-sm font-medium w-12 text-right">
                    {groupsByType.middle}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">VIP團組</span>
                <div className="flex items-center gap-2">
                  <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-purple-500"
                      style={{
                        width: `${stats.totalGroups > 0 ? (groupsByType.vip / stats.totalGroups) * 100 : 0}%`,
                      }}
                    />
                  </div>
                  <span className="text-sm font-medium w-12 text-right">
                    {groupsByType.vip}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>地點容量統計</CardTitle>
          </CardHeader>
          <CardContent>
            {locationStats.length > 0 ? (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {locationStats.slice(0, 10).map((loc, index) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <span className="truncate flex-1">{loc.name}</span>
                    <span className="text-muted-foreground ml-2">
                      容量: {loc.capacity}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">暫無數據</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>最近團組列表</CardTitle>
        </CardHeader>
        <CardContent>
          {groups && groups.length > 0 ? (
            <div className="space-y-2">
              {groups.slice(0, 10).map((group) => (
                <div
                  key={group.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex-1">
                    <p className="font-medium">{group.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {group.code} · {group.totalCount} 人 · {group.days} 天
                    </p>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {new Date(group.startDate).toLocaleDateString("zh-CN")}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">暫無團組數據</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
