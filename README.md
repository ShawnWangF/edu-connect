# HKEIU Education Connect

教育團組、批次、排程、資源庫、工作人員和通知管理系統。

這個倉庫已從 Manus WebDev 環境遷出，現在可以使用自己的 MySQL、文件存儲和部署平台運行。

## 技術棧

- React + Vite
- Express + tRPC
- Drizzle ORM
- MySQL
- 本地文件存儲，或 S3/R2 兼容對象存儲

## 本地啟動

1. 安裝 Node.js 20+ 和 pnpm 10+。
2. 複製環境變量：

```bash
cp .env.example .env
```

3. 啟動本地 MySQL：

```bash
docker compose up -d mysql
```

4. 安裝依賴並遷移數據庫：

```bash
pnpm install
pnpm db:push
pnpm db:seed
```

5. 啟動開發服務：

```bash
pnpm dev
```

默認地址是 `http://localhost:3000`。初始管理員賬號是 `wang`，密碼是 `000000`。首次部署後請立即修改密碼。

## 生產部署

1. 準備一個 MySQL 8 數據庫，設置 `DATABASE_URL`。
2. 設置一個長隨機值作為 `JWT_SECRET`。
3. 如需文件永久存儲，配置 `S3_BUCKET`、`S3_ENDPOINT`、`S3_ACCESS_KEY_ID`、`S3_SECRET_ACCESS_KEY` 和 `S3_PUBLIC_BASE_URL`。不配置時會使用服務器本地 `uploads/` 目錄。
4. 構建並啟動：

```bash
pnpm install --frozen-lockfile
pnpm db:push
pnpm build
pnpm start
```

## 可選功能配置

- AI 聊天/圖片/語音：配置 `OPENAI_BASE_URL`、`OPENAI_API_KEY`、`OPENAI_MODEL`。
- Google Maps：配置 `GOOGLE_MAPS_API_KEY` 和 `VITE_GOOGLE_MAPS_API_KEY`。
- Web Push：配置 `VAPID_PUBLIC_KEY`、`VAPID_PRIVATE_KEY`、`VITE_VAPID_PUBLIC_KEY`。
- Owner webhook 通知：配置 `NOTIFICATION_API_URL`，可選 `NOTIFICATION_API_KEY`。

## Manus 遷移備註

- 已移除 `vite-plugin-manus-runtime`、`client/public/__manus__` 和 `.manus` 調試/查詢日志。
- 登錄改為本地賬號系統，不再依賴 Manus OAuth。
- AI、地圖、通知、存儲都改為顯式環境變量配置，不再默認連接 Manus Forge。
- 原 Manus 雲數據庫資料需要從 Manus 另行導出 SQL 或 CSV，再導入到新的 MySQL。倉庫內只包含 schema migrations 和部分 seed/test data，不能自動取得 Manus 雲端資料。
