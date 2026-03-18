# HKEIU 平台改造 TODO

## 已完成功能（保留）
- [x] 用戶認證（Manus OAuth）
- [x] 用戶管理（管理員/編輯者/查看者）
- [x] 資源庫（景點/餐廳/學校）
- [x] 項目管理（Projects）
- [x] 批次/團組管理（Groups）
- [x] 行程點管理（時間軸視圖）
- [x] CalendarMatrix 排程儀表板（拖拽/拉伸）

---

## Phase 1：數據模型設計（當前）
- [x] 分析蘇州學校交流排程表業務邏輯
- [x] 確認顏色含義（淺藍=深圳、較深藍=香港、深藍=交流日★、黃=過關日）
- [x] 確認批次概念（同天抵達，可分乘不同航班）
- [x] 確認工作人員庫和交流學校庫需求
- [ ] 設計完整數據模型並寫入 SCHEDULE_ANALYSIS.md

## Phase 2：數據庫遷移
- [ ] 擴展 groups 表：添加 batchCode, batchGroup, schoolType（primary/secondary）, startCity（sz/hk）, headcount
- [ ] 創建 scheduleBlocks 表（批次日程色塊）：batchId, date, blockType（sz_arrive/hk_arrive/exchange/border_cross/departure/free）, isExchangeDay, notes
- [ ] 創建 staff 表（工作人員）：name, role（coordinator/staff/guide/driver）, phone, email, notes
- [ ] 創建 batchStaff 表（批次工作人員指派）：batchId, staffId, startDate, endDate, role
- [ ] 創建 exchangeSchools 表（交流學校）：name, city, address, contactName, contactPhone, notes
- [ ] 創建 exchangeAvailability 表（交流學校可用日）：exchangeSchoolId, date, isAvailable, notes
- [ ] 創建 batchExchangeSchools 表（批次與交流學校配對）：batchId, exchangeSchoolId, plannedDate
- [ ] 運行 pnpm db:push 遷移數據庫

## Phase 3：排程總覽儀表板（核心功能）
- [x] 創建 ScheduleOverview 組件（仿 Excel 色塊視圖）
  - 橫軸=日期（項目開始到結束），縱軸=批次（按 tags/type 分組）
  - 小學批次用白色底色，中學批次用淺橙色底色
  - 色塊顏色：淺藍=深圳、較深藍=香港、深藍=交流日★、黃=過關日、灰=空白
  - 支持整體移動批次色塊（左右箭頭按鈕，提前/延後 n 天）
  - 支持點擊色塊修改類型（彈出對話框選擇）
  - 支持標記交流日（★）
  - 底部顯示每日住宿統計（香港人數/深圳人數）
- [x] 在 ProjectDetail 頁面添加「排程總覽」按鈕（鏈接到獨立頁面）
- [x] 支持行程模板快速生成色塊（選擇深圳/香港天數和交流日偏移）
- [ ] 衝突提醒：交流日與交流學校可用日衝突時高亮顯示

## Phase 4：首頁儀表板改造
- [x] 排程總覽設為系統首頁（完全替代儀表板）
  - 首頁頂部加項目選擇下拉框，可切換不同項目的排程
  - 側邊欄「儀表板」改為「排程總覽」（CalendarDays 圖標）
- [ ] 展示當前進行中的批次及其今日行程狀態
- [ ] 展示工作人員實時狀態（在崗批次/空閒可指派）
- [ ] 展示今日住宿統計（香港/深圳人數）
- [ ] 展示今日航班（抵達/離開）

## Phase 5：工作人員庫
- [ ] 創建工作人員庫頁面（側邊欄新增入口）
- [ ] 工作人員列表（按角色分類：總統籌/工作人員/導遊/司機）
- [ ] 添加/編輯工作人員信息
- [ ] 查看工作人員當前指派批次和時間表
- [ ] 工作人員可用性視圖（哪些日期已被指派）

## Phase 6：交流學校庫
- [ ] 創建交流學校庫頁面（側邊欄新增入口）
- [ ] 交流學校列表（香港/澳門學校）
- [ ] 添加/編輯交流學校信息
- [ ] 設置交流學校可用交流日（校曆管理）
- [ ] 聯動排程衝突檢測（當排程的交流日不在可用日時提醒）

## Phase 7：批次管理改造
- [x] 創建獨立的批次管理頁面（獨立菜單入口）
- [x] 在批次/團組詳情頁添加「學校分組」Tab（顯示批次內所有學校）
- [x] 填入批次工作人員數據（協調員/導遊/司機/工作人員）
- [x] 填入批次与團組的工作人員指派數據
- [ ] 顯示批次對應的交流學校配對信息

## Phase 8：清理冗餘功能
- [ ] 刪除或隱藏行程模板頁面
- [ ] 刪除或隱藏統計報表頁面
- [ ] 更新導航菜單結構

---

## 當前 Bug 待修復
- [ ] 測試鍵盤刪除行程功能
- [ ] 測試衝突原因顯示
- [ ] 測試拖拽修復後的功能

## Phase 4 補充：排程總覽 UI 重設計（完整 Excel 視圖）
- [x] 主排程表：左側固定列（航班/類型/人數/合計/起始城市/批次/學校分組），右側日期色塊
- [x] 批次分組行：同一 batch_code 的團組用合並行標題顯示（如「批次1」）
- [x] 小學白色底色，中學淺橙色底色
- [x] 色塊交互：點擊色塊彈窗修改類型
- [x] 整體移動：左右箭頭按鈕整體移動批次所有色塊（+/-1天）
- [x] 拖拽整體移動：鼠標拖拽整個批次的色塊行，左右拖動改變起始日期
- [x] 快速排程：選擇起始城市（深圳先/香港先）和天數，一鍵生成整個行程
- [x] 每日航班統計區：抵達班數/航班列表、離開班數/航班列表
- [x] 每日住宿統計區：香港住宿人數、深圳住宿人數、合計（自動計算）
- [x] 底部學校分組明細表：每個團組的學校列表（名稱+人數）
- [x] 行程天數固定邏輯：整體移動時保持天數不變，只改變起始日期

## Phase 8：完整數據填入驗證
- [x] 填入工作人員數據（半數人員）
- [x] 填入批次工作人員指派數據
- [x] 填入批次和團組的詳情信息（航組、起始城市、交流學校等）
- [x] 驗證批次管理頁面正常顯示所有數據
- [x] 驗證團組詳情頁正常顯示所有數據
- [x] 驗證排程總覽頁面正常顯示批次和團組

## 當前任務：排程總覽編輯 + 項目總覽联動
- [x] 修復排程總覽色塊點擊編輯功能（改為右側滑出面板，避免 Dialog 焦點衝突）
- [x] 項目總覽顯示當日行程卡片（基於 scheduleBlocks 數據，含日期導航和批次卡片）
- [x] 項目總覽每個批次/團組顯示今日所在城市（深圳/香港）和行程類型

## 團組維護與排程總覽對齊
- [x] 修復 groups.update 路由缺少 camelCase→snake_case 字段映射（batchId/startCity/flightInfo/schoolList）
- [x] GroupDetail 頁面添加「排程信息」區塊（批次、起始城市、航班、學校分組展示）
- [x] GroupDetail 頁面添加「編輯排程信息」對話框（批次選擇、航班填寫、學校分組從資源庫添加）
- [x] 排程總覽已正確讀取並展示 school_list/flight_info/batch_code/studentCount


## Phase 9：學校管理模塊重構（進行中 - 每個學校是最小单位）
- [x] 添加 exchangeSchools 和 domesticSchools 表到 schema
- [x] 修複 TypeScript 編譯錯誤
- [x] 使用手動 SQL 在數據庫中創建 exchangeSchools 和 domesticSchools 表
- [x] 調整數據模形：groups.school_list 擴展為包含每個學校的 exchangeSchoolId
- [x] 更新 GroupDetail 頁面 UI：為每個學校獨立指定交流學校
- [x] 修複后端 updateGroup 路由：將 schoolList 数组转换为字符串格式（"學校名（人数） · 學校名2（人数）"）
- [x] 修複前端 GroupDetail.tsx：处理 school_list 字符串格式
- [x] 修複编辑排程信息对话框中学校分组列表为空的問題
- [x] 確保排程總覽顯示正確的學校分組信息（學校名+人数）
- [x] 修復排程總覽只顯示第一所學校的問題（正則表達式中文括號編碼修復）
- [ ] 實現學校批量導入功能（支持 Excel 文件）
- [ ] 創建交流學校（港澳）管理頁面
- [ ] 創建前來交流學校（內地）管理頁面
- [ ] 更新排程總覽：根據每個學校的交流學校標記交流日
- [ ] 驗證所有功能並保存檢查點
