export const ENV = {
  appId: process.env.APP_ID ?? process.env.VITE_APP_ID ?? "edu-connect",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  openAiApiUrl:
    process.env.OPENAI_BASE_URL ??
    process.env.OPENAI_API_BASE_URL ??
    "",
  openAiApiKey: process.env.OPENAI_API_KEY ?? "",
  openAiModel: process.env.OPENAI_MODEL ?? "gpt-4.1-mini",
  fileStorageDir: process.env.FILE_STORAGE_DIR ?? "uploads",
  publicBaseUrl: process.env.PUBLIC_BASE_URL ?? "",
  s3Bucket: process.env.S3_BUCKET ?? "",
  s3Region: process.env.S3_REGION ?? "auto",
  s3Endpoint: process.env.S3_ENDPOINT ?? "",
  s3AccessKeyId: process.env.S3_ACCESS_KEY_ID ?? "",
  s3SecretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "",
  s3ForcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
  s3PublicBaseUrl: process.env.S3_PUBLIC_BASE_URL ?? "",
  googleMapsApiKey:
    process.env.GOOGLE_MAPS_API_KEY ??
    process.env.VITE_GOOGLE_MAPS_API_KEY ??
    "",
  googleMapsApiUrl: process.env.GOOGLE_MAPS_API_URL ?? "https://maps.googleapis.com",
  dataApiUrl: process.env.DATA_API_URL ?? "",
  dataApiKey: process.env.DATA_API_KEY ?? "",
  notificationApiUrl: process.env.NOTIFICATION_API_URL ?? "",
  notificationApiKey: process.env.NOTIFICATION_API_KEY ?? "",
};
