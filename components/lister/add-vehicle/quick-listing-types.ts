import type { WizardImage } from "@/components/lister/add-vehicle/types";

/** A locally-selected file staged for Quick Listing — not uploaded until
 * submit. previewUrl is a client-only object URL for the thumbnail grid,
 * revoked when the image is removed or the form resets. */
export type QuickListingImage = {
  id: string;
  file: File;
  previewUrl: string;
};

export type QuickListingState = {
  message: string;
  images: QuickListingImage[];
};

export const EMPTY_QUICK_LISTING_STATE: QuickListingState = { message: "", images: [] };

export function hasQuickListingData(state: QuickListingState): boolean {
  return state.message.trim().length > 0 || state.images.length > 0;
}

/** What POST /api/lister/quick-listing returns for the message, plus the
 * images the client uploaded separately. Every field is nullable: an
 * informal message rarely contains all of them, and the extractor omits
 * anything it isn't sure about rather than guessing. */
export type QuickListingExtraction = {
  fields: {
    brand?: string | null;
    model?: string | null;
    year?: string | null;
    leaseAmount?: string | null;
    leasePeriod?: string | null;
    directOwner?: boolean | null;
    contactPhone?: string | null;
    serviceChargePercent?: number | null;
    locationId?: string | null;
    categoryId?: string | null;
    description?: string | null;
    fuelType?: string | null;
    transmission?: string | null;
    engineCapacity?: string | null;
    condition?: string | null;
    features?: string | null;
  };
  /** Names of fields the wizard still requires that came back empty — used
   * to tell the lister what needs their attention. */
  unresolved: string[];
  imageUrls: WizardImage[];
};
