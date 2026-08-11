/** One uploaded image's 3 WebP variants — see app/api/uploads/vehicle-image.
 * medium/thumbnail are only optional here because pre-existing edited
 * listings (uploaded before the multi-size pipeline) might carry entries
 * that never had them generated. */
export type WizardImage = {
  url: string;
  mediumUrl?: string;
  thumbnailUrl?: string;
};

export type WizardFormState = {
  brand: string;
  model: string;
  year: string;
  contactPhone: string;
  directOwner: "true" | "false";
  fuelType: string;
  transmission: string;
  engineCapacity: string;
  condition: string;
  features: string;
  description: string;
  leaseAmount: string;
  leasePeriod: string;
  serviceChargePercent: string;
  locationId: string;
  /** Only rendered by Quick Listing's review screen — the Detailed wizard has
   * no category step and simply carries the empty default, so its behaviour
   * is unchanged. */
  categoryId: string;
  imageUrls: WizardImage[];
};

export const EMPTY_WIZARD_STATE: WizardFormState = {
  brand: "",
  model: "",
  year: "",
  contactPhone: "",
  directOwner: "true",
  fuelType: "",
  transmission: "",
  engineCapacity: "",
  condition: "",
  features: "",
  description: "",
  leaseAmount: "",
  leasePeriod: "",
  serviceChargePercent: "",
  locationId: "",
  categoryId: "",
  imageUrls: [],
};

export type FieldErrors = Partial<Record<keyof WizardFormState, string>>;

export const WIZARD_STEPS = ["Basic Info", "Specifications", "Pricing", "Location", "Images", "Review"] as const;
