import { PutObjectCommand } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";
import sharp from "sharp";
import { requireAdminOrLister } from "@/lib/auth/dal";
import { env } from "@/lib/env";
import { r2Client } from "@/lib/r2/client";
import { buildPublicImageUrl } from "@/lib/r2/upload";

export const runtime = "nodejs";

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export async function POST(request: Request) {
  const profile = await requireAdminOrLister();
  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File) || !file.type.startsWith("image/")) {
    return NextResponse.json({ message: "Choose a valid image file." }, { status: 400 });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ message: "Images must be 10 MB or smaller." }, { status: 400 });
  }

  try {
    // sharp removes EXIF, GPS, ICC, and other metadata unless withMetadata() is used.
    const image = await sharp(Buffer.from(await file.arrayBuffer()), { limitInputPixels: 40_000_000 })
      .rotate()
      .webp({ quality: 82, effort: 4 })
      .toBuffer();
    const key = `vehicles/${profile.id}/${crypto.randomUUID()}.webp`;

    await r2Client.send(new PutObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: key,
      Body: image,
      ContentType: "image/webp",
      CacheControl: "public, max-age=31536000, immutable",
    }));

    return NextResponse.json({ url: buildPublicImageUrl(key) }, { status: 201 });
  } catch {
    return NextResponse.json({ message: "This image could not be processed." }, { status: 400 });
  }
}
