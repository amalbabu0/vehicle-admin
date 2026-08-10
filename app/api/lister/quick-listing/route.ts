import { NextResponse } from "next/server";
import * as z from "zod";
import { requireAdminOrLister } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { aiExtractRateLimit, checkRateLimit } from "@/lib/rate-limit";
import { resolveLocationName } from "@/lib/vehicles/references";
import { extractVehicleFromMessage, MAX_MESSAGE_LENGTH, type ExtractedVehicle } from "@/lib/ai/extract-vehicle";

/**
 * Quick Listing extraction. Takes the pasted WhatsApp message, returns the
 * vehicle fields found in it — and deliberately writes nothing to the
 * database. The client pre-fills the existing Detailed Listing wizard with
 * the result, and the lister submits through the normal POST /api/vehicles
 * path, which still enforces vehicleCreateSchema in full. That keeps one
 * validated write path rather than adding a second, looser one for
 * inherently incomplete AI output.
 *
 * Images never pass through here: they're uploaded straight to
 * /api/uploads/vehicle-image (which already handles auth, format/size
 * checks, resizing and R2) and the client holds the resulting URLs.
 */

const requestSchema = z.object({
  message: z.string().trim().min(1, "Message is required.").max(MAX_MESSAGE_LENGTH),
});

/** URLs are stripped before the message reaches the model. Quick Listing's
 * images come from the upload widget only, so a URL in the text is never
 * useful — and left in, one could be swept into `description` and end up
 * rendered on the public site (a forwarded competitor link, a shortened
 * phishing link). Removing it at the input boundary is deterministic;
 * a prompt instruction not to use URLs is not. */
function stripUrls(message: string): string {
  return message
    .replace(/\bhttps?:\/\/\S+/gi, " ")
    .replace(/\bwww\.\S+/gi, " ")
    .replace(/[ \t]{2,}/g, " ");
}

/** Fields the model couldn't fill (or that failed to resolve), so the UI can
 * tell the lister what still needs their attention. Only covers fields the
 * strict validator will later require — optional ones aren't worth flagging. */
const REQUIRED_FOR_SUBMIT = [
  "brand",
  "model",
  "year",
  "leaseAmount",
  "leasePeriod",
  "contactPhone",
  "locationId",
  "fuelType",
  "transmission",
] as const;

export async function POST(request: Request) {
  const profile = await requireAdminOrLister();

  const body = await request.json().catch(() => null);
  const validation = requestSchema.safeParse(body);
  if (!validation.success) {
    const tooLong = typeof body?.message === "string" && body.message.length > MAX_MESSAGE_LENGTH;
    return NextResponse.json(
      {
        message: tooLong
          ? `That message is too long. Trim it to ${MAX_MESSAGE_LENGTH.toLocaleString("en-IN")} characters or fewer.`
          : "Paste the WhatsApp vehicle details first.",
      },
      { status: 400 }
    );
  }

  // Keyed on the account, not the IP — this guards a metered third-party
  // spend, which is per-account, and a lister on mobile data changes IP
  // constantly. Checked before the API call, not after.
  const { success: withinLimit } = await checkRateLimit(aiExtractRateLimit, `quick-listing:${profile.id}`);
  if (!withinLimit) {
    return NextResponse.json(
      { message: "You've used Quick Listing several times in a row. Try again in a little while, or use Detailed Listing." },
      { status: 429 }
    );
  }

  const extraction = await extractVehicleFromMessage(stripUrls(validation.data.message));
  if (!extraction.ok) {
    return NextResponse.json(
      { message: "Couldn't read the vehicle details from that message. Try Detailed Listing instead." },
      { status: 502 }
    );
  }

  const { locationName, ...fields } = extraction.fields;

  // Resolve the place NAME the model returned against the real locations
  // table, falling back from town to district for the "Mannar, Alappuzha"
  // shape these messages use. No match means the lister picks it — never a
  // guess, and never a model-supplied id (see lib/ai/extract-vehicle.ts).
  let locationId: string | null = null;
  if (locationName) {
    const supabase = await createClient();
    locationId = await resolveLocationName(supabase, locationName).catch(() => null);
  }

  const resolved = { ...fields, locationId };
  const unresolved = REQUIRED_FOR_SUBMIT.filter(
    (field) => !resolved[field as keyof typeof resolved]
  );

  return NextResponse.json({ fields: resolved, unresolved });
}

export type QuickListingExtractionResponse = {
  fields: Omit<ExtractedVehicle, "locationName"> & { locationId: string | null };
  unresolved: string[];
};
