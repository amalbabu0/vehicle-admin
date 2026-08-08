import "server-only";

import { DeleteObjectsCommand } from "@aws-sdk/client-s3";
import { r2Client } from "@/lib/r2/client";
import { env } from "@/lib/env";

/** Reverses buildPublicImageUrl() — turns a stored public URL back into
 * the R2 object key, or null if it isn't actually one of ours (defensive:
 * a malformed/foreign URL should be skipped, never crash the whole batch). */
function extractKeyFromUrl(url: string): string | null {
  if (!url.startsWith(`${env.IMAGES_CDN_URL}/`)) return null;
  return url.slice(env.IMAGES_CDN_URL.length + 1);
}

/** Batch-deletes every R2 object behind the given public URLs (a vehicle's
 * original/medium/thumbnail variants, across every image). R2's
 * DeleteObjects caps at 1000 keys per call, batched here defensively even
 * though a single listing's image count never gets close to that.
 * Idempotent: deleting an already-gone key is not an error. */
export async function deleteR2ObjectsByUrl(urls: string[]): Promise<{ deleted: number; skipped: number }> {
  const keys = urls.map(extractKeyFromUrl).filter((key): key is string => key !== null);
  const skipped = urls.length - keys.length;
  if (keys.length === 0) return { deleted: 0, skipped };

  let deleted = 0;
  for (let i = 0; i < keys.length; i += 1000) {
    const batch = keys.slice(i, i + 1000);
    await r2Client.send(
      new DeleteObjectsCommand({
        Bucket: env.R2_BUCKET_NAME,
        Delete: { Objects: batch.map((Key) => ({ Key })), Quiet: true },
      })
    );
    deleted += batch.length;
  }

  return { deleted, skipped };
}
