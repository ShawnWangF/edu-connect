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


## 当前 Bug 待修复（第二輫）
- [x] 排程总覽学校分組人數显示为 0 的問題
  - 修复完成：改進了编辑排程信息对话框，支持编辑已添加学校的学生人数和教师人数
  - 验证结果：排程总覽現在正確顯示所有学校及其人数


## 资源库模块重构（第三轮）
- [x] 修复景点资源添加功能
- [ ] 重构交流学校模块（更名为"姊妹学校"）
  - 支持为每个学校单独配置交流学校
  - 包括可交流日期和地址信息
- [ ] 开发前来交流学校模块
  - 存储内地前来交流的学校信息
  - 包括学校名称、地址、学生人数、教师人数
- [ ] 删除多余的学校资源模块
- [x] 开发人员管理模块
  - [x] 设计人员管理数据模型和数据库 schema
    - [x] 创建 itinerary_members 关联表（人员与行程的关系）
    - [x] 创建 member_status 表（人员状态监控）
  - [x] 开发人员管理后端 API（tRPC 路由）
    - [x] 创建人员 CRUD 操作
    - [x] 创建指派人员至行程的 API（单个/批量）
    - [x] 创建人员状态更新 API
    - [x] 创建人员状态查询 API
  - [x] 开发人员管理前端 UI
    - [x] 创建人员管理页面（列表、搜索、统计）
    - [x] 实现指派人员至行程的功能（多选、批量指派）
    - [x] 实现状态监控界面（签到/签退、状态更新）
    - [x] 支持多选操作
  - [x] 编写单元测试（24 个测试全部通过）
  - [x] 验证功能并保存检查点


## 工作人員管理模块重构（第五輮）
- [x] 重新定位「人員管理」為「工作人員管理」概念
- [x] 工作人員列表、添加/編輯、指派至團組功能
- [x] 導航菜單更名為「工作人員管理」

## 工作人員管理功能完善（第六輮）
- [x] 修複 /members 頁面 Date 對象渲染錯誤
  - 修複 staff.list 路由，只返回需要的字段，排除 createdAt/updatedAt
  - 修複 StaffMember 類型定義，移除 createdAt/updatedAt
- [x] 完善工作人員指派至團組/批次功能
  - 指派對話框已完善，支持選擇團組、角色、日期範圍、備注
  - 支持取消指派
- [x] 在排程總覽中顯示工作人員指派數據（數據打通）
  - 添加 batchStaff.listByProject 路由
  - 底部學校分組明細表添加工作人員列
- [x] 在首頁儀表盤顯示工作人員指派和空閒情況
  - 添加 staff.stats 路由
  - 首頁儀表盤顯示工作人員概覽卡片（總數/總統籌/導遊/司機/已指派）

## Bug 修复（第七轮）
- [x] 修复排程总览日期选择器月份标签重复显示 bug（每天都显示“7月”，应只在月份首日显示）
  - 修复：添加 showMonth 逻辑，只在 idx===0 或月份变化时显示月份标签

## 工作人員指派細化（第八輪）
- [ ] 重新設計 batchStaff 表：指派顆粒度到「某個團組的某天的某個行程點」
  - 新增 itineraryId 字段（關聯 itineraries 表，可為空）
  - 新增 date 字段（具體日期）
  - 新增 taskName 字段（行程點名稱，如「太空館」「海洋公園」）
  - 保留 groupId / staffId / role / notes 字段
- [ ] 更新後端路由：支持行程點級別的指派 CRUD
- [ ] 重構工作人員管理頁面指派 UI：
  - 左側：工作人員列表（按角色篩選）
  - 右側：選中工作人員後，按日期展開該團組的行程點，支持逐個行程點指派
  - 顯示每個行程點已指派的工作人員
- [ ] 在排程總覽/項目總覽中顯示每個行程點的工作人員指派情況

## 实时运营指挥仪表盘（第十轮）
- [x] 设计仪表盘信息架构（6大模块）
- [x] 注入测试数据（行程时间点、工作人员指派、景点容量、餐厅预订）
- [x] 后端添加 dashboard.overview 路由（团组实时行程进度）
- [x] 后端添加 dashboard.staffStatus 路由（工作人员实时状态）
- [x] 后端添加 dashboard.venueAlert 路由（景点人流预警）
- [x] 后端添加 dashboard.diningAlert 路由（餐饮预备提醒）
- [x] 后端添加 dashboard.accommodationStats 路由（今日住宿统计）
- [x] 后端添加 dashboard.flightInfo 路由（今明两日航班信息）
- [x] 构建实时运营仪表盘前端页面（进度卡片、工作人员状态、景点预警、餐饮提醒）
- [x] 将仪表盘注册为导航第一个 Tab / 首页（/路由）

## 紧急行程调整快捷窗口（第十一轮）
- [ ] 后端添加 dashboard.urgentAdjust 路由（修改行程点内容/时间 + 可选通知全员）
- [ ] 实时指挥中心「明日行程预告」上方添加紧急调整快捷窗口
  - 选择团组 → 选择行程点 → 修改内容/时间/地点/备注
  - 勾选「通知全员」后发送系统通知
  - 显示最近3条调整记录

## 仪表盘修复与优化（第十二轮）
- [ ] 修复顶部统计数字显示为0的问题（进行中行程、在岗人员、住宿人数、景点预警）
- [ ] 统计卡片自适应填充满屏幕宽度（grid 均分，不留空白）
- [ ] 所有模块可点击展开详情弹窗（景点预警、餐饮提醒、工作人员状态等）
- [x] 修复资源库映射逻辑：餐厅必须从资源库中选取（食行卡片餐厅字段改为下拉选择）
- [x] 仪表盘餐饮提醒通过 dailyCards 关联 restaurants 实时反映餐厅安排
- [x] 仪表盘景点预警通过 locationId JOIN attractions 实现容量查询

## 航班数据清理（第十三轮）
- [x] 清除数据库中所有团组 flight_info 字段内由系统早期注入的『XXX车号』测试数据（已全部置为 null）
- [x] 修复起始城市字段兼容中英文两种格式的显示问题

## 排程总览航班数据来源修复（第十四轮）
- [x] 排程总览航班列同时读取批次表（batches）和团组表（groups.flight_info）
- [x] 两者取有值的，若都有则优先取团组的值

## 交流学校与姊妹学校资源库开发（第十五轮）
- [x] exchangeSchools 表（姊妹学校）和 domesticSchools 表（前来交流学校）已在 schema 中存在
- [x] 后端 CRUD 路由：exchangeSchools 和 domesticSchools 的增删改查已完善
- [x] 资源库页面已添加「姊妹学校」和「前来交流学校」两个 Tab（完整 CRUD 界面）
- [x] 团组学校分组中每个学校可独立选择姊妹学校（exchangeSchools）和时间段
- [x] 团组级别新增「交流日期」字段（日期选择器，存储到 tags.exchangeDate）
- [x] 团组详情页展示每个学校的姊妹学校和时间段信息
- [x] 团组详情页展示交流日期（紫色标签）

## 交流日期设计约束（第十五轮补充）
- [x] 同一团组内所有学校的交流日期一致（团组级别设置），仅时段（上午/下午）可不同
- [x] school_list 中每个学校记录包含：exchangeSchoolId（姊妹学校ID）、timeSlot（时间段）
- [x] 团组详情页「編輯排程信息」对话框新增「交流日期」字段（日期选择器，团组级别）

## 真实数据填充（第十六轮）
- [x] 解析航班时间表和学校交流分配表两份文件
- [x] 清空所有测试数据（groups、batches、itineraries、dailyCards 等）
- [x] 填充真实批次、团组、航班信息（6个批次、12个团组）
- [x] 填充学校交流分配数据（school_list、exchangeDate、sisterSchool 等）
- [x] 验证数据准确性（12个团组、 6个批次、24所姊妹学校、25所前来交流学校）

## 数据引用逻辑修复（第十七轮）
- [x] 问题查明：school_list 中学校名称是硬编码文本，缺少 domesticSchoolId 字段（未引用资源库）
- [x] 修复数据：已为 12 个团组的 school_list 添加 domesticSchoolId，全郠匹配成功
- [x] 修复前端：学校分组「添加学校」改为从 domesticSchools 资源库下拉选择，保存 domesticSchoolId
- [x] 修复后端路由：groups.create/update 的 schoolList schema 添加 domesticSchoolId 字段
- [x] 验证完整数据链路：P1 学校 domesticSchoolId/exchangeSchoolId 均可正确 JOIN 资源库

## 资源库学校数据显示修复（第十八轮）
- [x] 根本原因：exchangeSchools/domesticSchools 数据库表字段与 schema.ts 不匹配（city/contactName vs region/contactPerson），导致 Drizzle ORM 查询失败静默返回空
- [x] 修复：ALTER TABLE 重命名字段并添加缺失字段，两表字段现已与 schema.ts 完全对齐
- [x] 验证：24 所姊妹学校、25 所前来交流学校数据完好，查询正常返回

## PWA + Web Push 通知功能开发（第十九轮）
- [x] 生成 VAPID 密钥对并配置环境变量（VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY/VITE_VAPID_PUBLIC_KEY）
- [x] 数据库新增 pushSubscriptions 表（userId/endpoint/p256dh/auth/userAgent）
- [x] 后端：订阅管理路由（subscribe/unsubscribe/mySubscriptions）
- [x] 后端：sendWebPushToAll 服务函数（使用原生 mysql2 连接，支持指定 userIds）
- [x] 后端：pushNotifications.sendTest 路由（管理员发送测试推送）
- [x] 后端：pushNotifications.broadcast 路由（管理员广播推送）
- [x] 前端：manifest.json 配置（PWA 安装支持，含 CDN 图标）
- [x] 前端：Service Worker（sw.js）处理推送事件（push/notificationclick）
- [x] 前端：index.html 添加 manifest link 和 Apple PWA meta 标签
- [x] 前端：usePushNotification hook（Service Worker 注册、权限请求、订阅管理）
- [x] 前端：PushNotificationBanner 组件（登录后显示通知权限请求横幅）
- [x] 前端：通知中心页面添加推送通知设置区域（开启/关闭订阅、管理员发送测试）
- [x] 前端：DashboardLayout 集成 PushNotificationBanner（每页顶部显示）

## Bug 修複（第二十輪）
- [x] Bug 1：學校分組追加後無法保存（在 handleSave 中加入數據清洗，確保 schoolList 必填字段有效）
- [x] Bug 2：排程總覽無法同步批次內行程日期（新增 scheduleBlocks.autoGenerate 路由 + 前端「自動生成色塊」按鈕）
- [x] 修復 startCityLabel 讀取 start_city 而非 startCity（snake_case 字段名稱對齊）
- [x] 修復排程總覽航班欄位：改為讀取團組管理中的航班號（優先色塊手動填寫 → 團組 flight_info → 批次航班），未設置時顯示「未設置」（橙色）

## Bug 修復（第二十一輪）
- [x] 修正航班統計邏輯：只有抵港日（落地香港）和離境日才有航班，抵達深圳是陸路入境無航班

## Bug 修復（第二十二輪）
- [x] 修正排程總覽日期時區偏移：新增 localDateStr() 函數使用本地時間格式化，修復 generateDateRange/toDateStr/isToday 全部改用本地時間，避免 UTC 偏移導致日期少一天

## Bug 修複（第二十三輪）
- [x] 修正排程總覽底部統計行（航班/住宿）的日期列與上方甘特圖不對齊問題（將所有 colSpan 從 7 改為 8，對齊 8 個固定列）

## Bug 修複（第二十四輪）
- [x] 修復 /notifications 頁面 API Mutation Error: require is not defined（將所有 require('mysql2/promise') 改為 Drizzle ORM）
- [x] 修復 PWA Web Push 通知無法收到（根本原因是 require 在 ESM 環境不存在，將 sendWebPushToAll/subscribe/unsubscribe/mySubscriptions 全部改用 Drizzle ORM）

## 景點資源庫容量與休館日（第二十五輪）
- [x] Schema：attractions 表加入 maxCapacity（最大承接量）和 closedDays（每週休館日）欄位
- [x] 後端：景點 CRUD 路由支持新欄位
- [x] 後端：新增衝突偵測查詢（同日同景點人數超載 / 休館日衝突）
- [x] 前端：資源庫景點表單加入最大承接量和休館日選擇
- [x] 前端：排程總覽顯示超載和休館日衝突警告
