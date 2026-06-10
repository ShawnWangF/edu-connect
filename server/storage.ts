import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import fs from "node:fs/promises";
import path from "node:path";
import { ENV } from "./_core/env";

type StoragePayload = Buffer | Uint8Array | string;

let s3Client: S3Client | null = null;

function normalizeKey(relKey: string): string {
  const normalized = path.posix.normalize(relKey.replace(/^\/+/, ""));
  if (normalized === "." || normalized.startsWith("../") || normalized.includes("/../")) {
    throw new Error("Invalid storage key");
  }
  return normalized;
}

function encodeKeyForUrl(key: string): string {
  return key.split("/").map(encodeURIComponent).join("/");
}

function joinPublicUrl(baseUrl: string, key: string): string {
  const normalizedBase = baseUrl.replace(/\/+$/, "");
  return `${normalizedBase}/${encodeKeyForUrl(key)}`;
}

function getLocalStorageRoot(): string {
  return path.resolve(process.cwd(), ENV.fileStorageDir);
}

function getLocalFilePath(key: string): string {
  const root = getLocalStorageRoot();
  const filePath = path.resolve(root, key);
  if (filePath !== root && !filePath.startsWith(`${root}${path.sep}`)) {
    throw new Error("Invalid storage path");
  }
  return filePath;
}

function getLocalPublicUrl(key: string): string {
  const pathname = `/uploads/${encodeKeyForUrl(key)}`;
  return ENV.publicBaseUrl
    ? `${ENV.publicBaseUrl.replace(/\/+$/, "")}${pathname}`
    : pathname;
}

function shouldUseS3(): boolean {
  return ENV.s3Bucket.trim().length > 0;
}

function getS3Client(): S3Client {
  if (s3Client) return s3Client;

  const credentials =
    ENV.s3AccessKeyId && ENV.s3SecretAccessKey
      ? {
          accessKeyId: ENV.s3AccessKeyId,
          secretAccessKey: ENV.s3SecretAccessKey,
        }
      : undefined;

  s3Client = new S3Client({
    region: ENV.s3Region,
    endpoint: ENV.s3Endpoint || undefined,
    forcePathStyle: ENV.s3ForcePathStyle,
    credentials,
  });

  return s3Client;
}

async function getS3Url(key: string): Promise<string> {
  if (ENV.s3PublicBaseUrl) {
    return joinPublicUrl(ENV.s3PublicBaseUrl, key);
  }

  return getSignedUrl(
    getS3Client(),
    new GetObjectCommand({
      Bucket: ENV.s3Bucket,
      Key: key,
    }),
    { expiresIn: 60 * 60 }
  );
}

export async function storagePut(
  relKey: string,
  data: StoragePayload,
  contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);

  if (shouldUseS3()) {
    await getS3Client().send(
      new PutObjectCommand({
        Bucket: ENV.s3Bucket,
        Key: key,
        Body: data,
        ContentType: contentType,
      })
    );

    return {
      key,
      url: await getS3Url(key),
    };
  }

  const filePath = getLocalFilePath(key);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, data);

  return {
    key,
    url: getLocalPublicUrl(key),
  };
}

export async function storageGet(
  relKey: string
): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);

  if (shouldUseS3()) {
    return {
      key,
      url: await getS3Url(key),
    };
  }

  return {
    key,
    url: getLocalPublicUrl(key),
  };
}
