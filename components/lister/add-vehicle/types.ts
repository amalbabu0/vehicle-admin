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
  imageUrls: string[];
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
  imageUrls: [],
};

export type FieldErrors = Partial<Record<keyof WizardFormState, string>>;

export const WIZARD_STEPS = ["Basic Info", "Specifications", "Pricing", "Location", "Images", "Review"] as const;
