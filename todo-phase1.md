# Phase 1 開發任務清單

## 數據庫Schema設計
- [x] 創建 projects表（項目基本信息）
- [x] 修改groups表，添加projectId外鍵關聯
- [x] 推送數據庫變更

## 後端API開發
- [x] 實現projects.create（創建項目）
- [x] 實現projects.list（查詢項目列表）
- [x] 實現projects.getById（查詢項目詳情）
- [x] 實現projects.update（更新項目信息）
- [x] 實現projects.delete（刪除項目）
- [x] 實現projects.getGroupsByProjectId（查詢項目下的所有團組）
- [ ] 實現projects.getCalendarMatrix（獲取多團組日曆矩陣數據）
- [x] 調整groups.create添加projectId參數
- [ ] 調整groups.list支持按projectId篩選

## 前端UI開發
- [x] 創建ProjectList頁面（項目列表）
- [x] 創建ProjectDetail頁面（項目詳情）
- [x] 實現項目創建對話框
- [ ] 實現項目編輯對話框
- [x] 設計日曆矩陣組件（CalendarMatrix）
- [x] 實現行=團組、列=日期的矩陣佈局
- [x] 實現資源衝突檢測和高亮
- [ ] 實現衝突詳情彈窗

## 導航重構
- [ ] 新增「項目總覽」側邊欄入口
- [ ] 調整路由結構
- [ ] 更新麵包屑導航

## 測試
- [ ] 編寫項目管理API的vitest測試
- [ ] 測試多團組日曆矩陣功能
- [ ] 測試資源衝突檢測
