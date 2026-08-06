import "server-only";

import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { r2Client } from "@/lib/r2/client";
import { env } from "@/lib/env";

const PRESIGNED_UPLOAD_EXPIRY_SECONDS = 5 * 60;

/**
 * Generates a one-time presigned PUT URL for a single object key. The admin
 * server calls this (holding the R2 write credentials); the browser then
 * uploads the file bytes directly to the returned URL — the file body never
 * passes through our own server/serverless function.
 *
 * Callers are responsible for running EXIF/GPS strip, compression, and
 * AVIF/WebP conversion (sharp) *before* requesting this URL — R2 has no
 * built-in transform pipeline, unlike Cloudflare Images.
 */
export async function createPresignedUploadUrl(params: {
  key: string;
  contentType: string;
}): Promise<{ uploadUrl: string; publicUrl: string; expiresAt: string }> {
  const command = new PutObjectCommand({
    Bucket: env.R2_BUCKET_NAME,
    Key: params.key,
    ContentType: params.contentType,
  });

  const uploadUrl = await getSignedUrl(r2Client, command, {
    expiresIn: PRESIGNED_UPLOAD_EXPIRY_SECONDS,
  });

  return {
    uploadUrl,
    publicUrl: buildPublicImageUrl(params.key),
    expiresAt: new Date(Date.now() + PRESIGNED_UPLOAD_EXPIRY_SECONDS * 1000).toISOString(),
  };
}

/** Public delivery URL via the custom domain connected to the bucket. */
export function buildPublicImageUrl(key: string): string {
  return `${env.IMAGES_CDN_URL}/${key}`;
}
