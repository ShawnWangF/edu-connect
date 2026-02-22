# Phase 1: 引入項目層級 + 多團組日曆矩陣

## 目標
實現從「團組管理」到「項目統籌」的核心架構升級，解決統籌者最大的痛點：多團組協同調度和資源衝突檢測。

## 功能清單

### 1. 數據庫Schema設計
- [ ] 創建projects表（項目基本信息）
- [ ] 修改groups表，添加projectId外鍵關聯
- [ ] 設計項目與團組的一對多關係
- [ ] 推送數據庫變更

### 2. 項目管理API
- [ ] 實現projects.create（創建項目）
- [ ] 實現projects.list（查詢項目列表）
- [ ] 實現projects.getById（查詢項目詳情）
- [ ] 實現projects.update（更新項目信息）
- [ ] 實現projects.delete（刪除項目）
- [ ] 實現projects.getGroupsByProjectId（查詢項目下的所有團組）
- [ ] 實現projects.getCalendarMatrix（獲取多團組日曆矩陣數據）

### 3. 團組管理API調整
- [ ] groups.create添加projectId參數（可選）
- [ ] groups.list支持按projectId篩選
- [ ] groups.update支持修改projectId

### 4. 前端：項目總覽頁
- [ ] 創建ProjectList頁面（項目列表）
- [ ] 創建ProjectDetail頁面（項目詳情）
- [ ] 實現項目創建對話框
- [ ] 實現項目編輯對話框
- [ ] 實現項目刪除確認

### 5. 前端：多團組日曆矩陣
- [ ] 設計日曆矩陣組件（CalendarMatrix）
- [ ] 實現行=團組、列=日期的矩陣佈局
- [ ] 每個單元格顯示當天行程摘要
- [ ] 實現資源衝突高亮（同一景點被多個團組佔用）
- [ ] 支持點擊單元格跳轉到團組詳情

### 6. 前端：資源衝突檢測
- [ ] 實現衝突檢測算法（景點維度）
- [ ] 實現衝突檢測算法（餐廳維度）
- [ ] 在日曆矩陣中用紅色標記衝突
- [ ] 實現衝突詳情彈窗（顯示哪些團組在同一時段佔用同一資源）

### 7. 側邊欄導航重構
- [ ] 新增「項目總覽」入口
- [ ] 調整「團組管理」為項目下的子功能
- [ ] 更新路由結構
- [ ] 更新麵包屑導航

### 8. 測試與文檔
- [ ] 編寫項目管理API的vitest測試
- [ ] 測試多團組日曆矩陣功能
- [ ] 測試資源衝突檢測
- [ ] 更新README文檔

## 技術實現要點

### 數據庫Schema
```typescript
// projects表
export const projects = sqliteTable('projects', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  code: text('code').notNull().unique(), // 項目編號
  name: text('name').notNull(), // 項目名稱
  description: text('description'), // 項目描述
  startDate: text('start_date').notNull(), // 開始日期
  endDate: text('end_date').notNull(), // 結束日期
  totalStudents: integer('total_students').default(0), // 總學生數
  totalTeachers: integer('total_teachers').default(0), // 總教師數
  status: text('status').notNull().default('preparing'), // 狀態
  createdBy: text('created_by').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// groups表添加projectId
projectId: integer('project_id').references(() => projects.id, { onDelete: 'set null' }),
```

### API設計
```typescript
// 多團組日曆矩陣數據結構
interface CalendarMatrixData {
  projectId: number;
  dateRange: string[]; // ['2026-02-24', '2026-02-25', ...]
  groups: {
    id: number;
    name: string;
    dailySchedule: {
      [date: string]: {
        itineraries: Array<{ name: string; time: string }>;
        meals: Array<{ type: string; restaurant: string }>;
        conflicts: Array<{ type: 'venue' | 'restaurant'; details: string }>;
      };
    };
  }[];
}
```

### UI設計
- 日曆矩陣使用表格佈局，固定表頭和第一列
- 衝突單元格用紅色背景高亮
- 單元格hover顯示完整行程信息
- 支持橫向滾動（日期較多時）

## 開發順序
1. 數據庫Schema → 2. 後端API → 3. 前端UI → 4. 衝突檢測 → 5. 導航重構 → 6. 測試

## 預期成果
- 統籌者可以創建項目，將多個團組歸屬到同一項目下
- 項目詳情頁顯示多團組日曆矩陣，一眼看出所有團組的行程安排
- 自動檢測並標紅資源衝突（同一景點/餐廳被多個團組同時佔用）
- 側邊欄導航升級為「項目總覽」→「團組管理」的層級結構
