import { createHash } from "crypto";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";
import sharp from "sharp";
import { requireAdminOrLister } from "@/lib/auth/dal";
import { env } from "@/lib/env";
import { r2Client } from "@/lib/r2/client";
import { buildPublicImageUrl } from "@/lib/r2/upload";

export const runtime = "nodejs";

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

// Accepted by MIME type OR file extension — browsers are inconsistent
// about what MIME type they report for HEIC/HEIF (some send
// "application/octet-stream"), so extension is the more reliable signal
// for those two specifically.
const ACCEPTED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);
const ACCEPTED_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "heic", "heif"]);

function fileExtension(name: string): string {
  return name.split(".").pop()?.toLowerCase() ?? "";
}

function isAcceptedFormat(file: File): boolean {
  if (ACCEPTED_MIME_TYPES.has(file.type)) return true;
  return ACCEPTED_EXTENSIONS.has(fileExtension(file.name));
}

/** Light gray letterbox fill for the thumbnail canvas — chosen once, used
 * consistently everywhere a vehicle doesn't fill the full 800x800 square. */
const THUMBNAIL_BACKGROUND = { r: 245, g: 245, b: 245, alpha: 1 };

async function buildVariants(input: Buffer) {
  // .rotate() auto-orients from EXIF before the pipeline strips metadata
  // on output (sharp's default when withMetadata() isn't called) — same
  // approach the single-size pipeline already used.
  const base = sharp(input, { limitInputPixels: 40_000_000 }).rotate();

  const [original, medium, thumbnail] = await Promise.all([
    base.clone().resize({ width: 1920, height: 1920, fit: "inside", withoutEnlargement: true }).webp({ quality: 88, effort: 4 }).toBuffer(),
    base.clone().resize({ width: 1200, fit: "inside", withoutEnlargement: true }).webp({ quality: 82, effort: 4 }).toBuffer(),
    base
      .clone()
      .resize({ width: 800, height: 800, fit: "contain", background: THUMBNAIL_BACKGROUND })
      .webp({ quality: 78, effort: 4 })
      .toBuffer(),
  ]);

  return { original, medium, thumbnail };
}

async function uploadVariant(key: string, body: Buffer) {
  await r2Client.send(
    new PutObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: key,
      Body: body,
      ContentType: "image/webp",
      CacheControl: "public, max-age=31536000, immutable",
    })
  );
  return buildPublicImageUrl(key);
}

export async function POST(request: Request) {
  const profile = await requireAdminOrLister();
  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ message: "Choose a valid image file." }, { status: 400 });
  }
  if (!isAcceptedFormat(file)) {
    const label = fileExtension(file.name) || file.type || "unknown";
    return NextResponse.json({ message: `"${label}" isn't a supported image format. Use JPG, PNG, WEBP, or HEIC.` }, { status: 400 });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ message: "Images must be 10 MB or smaller." }, { status: 400 });
  }

  const inputBuffer = Buffer.from(await file.arrayBuffer());
  // Hashed from the original bytes, before resize/compress, so re-uploading
  // the exact same photo (even under a different filename) always produces
  // the same hash — this is what the duplicate-listing check compares.
  const contentHash = createHash("sha256").update(inputBuffer).digest("hex");

  let variants: Awaited<ReturnType<typeof buildVariants>>;
  try {
    variants = await buildVariants(inputBuffer);
  } catch {
    // Covers corrupt files and formats sharp's libvips build can't decode
    // — notably, this build has libheif but no HEVC decoder, so genuine
    // iPhone HEIC photos (HEVC-encoded) fail here even though the format
    // passed the extension/MIME check above. AVIF-family HEIF files do
    // decode. There's no way to tell these apart before attempting decode.
    return NextResponse.json(
      { message: "This image could not be processed. If it's a HEIC photo from an iPhone, try exporting it as JPG and uploading again." },
      { status: 400 }
    );
  }

  try {
    const uuid = crypto.randomUUID();
    const baseKey = `vehicles/${profile.id}/${uuid}`;
    const [url, mediumUrl, thumbnailUrl] = await Promise.all([
      uploadVariant(`${baseKey}.webp`, variants.original),
      uploadVariant(`${baseKey}-medium.webp`, variants.medium),
      uploadVariant(`${baseKey}-thumb.webp`, variants.thumbnail),
    ]);

    return NextResponse.json({ url, mediumUrl, thumbnailUrl, contentHash }, { status: 201 });
  } catch {
    return NextResponse.json({ message: "Upload failed. Check your connection and try again." }, { status: 500 });
  }
}
