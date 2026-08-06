import "server-only";

import { S3Client } from "@aws-sdk/client-s3";
import { env } from "@/lib/env";

/**
 * R2 is S3-compatible, accessed via the AWS SDK pointed at Cloudflare's
 * endpoint. `region: "auto"` is required — R2 has no real regions, but the
 * SDK errors without one set.
 */
export const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
  },
});
