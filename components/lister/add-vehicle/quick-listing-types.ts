/** A locally-selected file staged for Quick Listing — not uploaded yet (see
 * QuickListingPayload). previewUrl is a client-only object URL for the
 * thumbnail grid, revoked when the image is removed or the form resets. */
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

/** What Quick Listing prepares for the future agent/API — raw message +
 * files, no parsing or field extraction happens on the frontend. */
export interface QuickListingPayload {
  type: "quick";
  message: string;
  images: File[];
}
