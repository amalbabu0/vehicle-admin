"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ComboboxOption } from "@/components/combobox";
import { vehicleCreateSchema } from "@/lib/validators/vehicle";
import { StepProgress } from "@/components/lister/add-vehicle/step-progress";
import { BasicInfoStep } from "@/components/lister/add-vehicle/basic-info-step";
import { SpecsStep } from "@/components/lister/add-vehicle/specs-step";
import { PricingStep } from "@/components/lister/add-vehicle/pricing-step";
import { LocationStep } from "@/components/lister/add-vehicle/location-step";
import { ImagesStep } from "@/components/lister/add-vehicle/images-step";
import { ReviewStep } from "@/components/lister/add-vehicle/review-step";
import { SuccessStep } from "@/components/lister/add-vehicle/success-step";
import { EMPTY_WIZARD_STATE, WIZARD_STEPS, type WizardFormState, type FieldErrors } from "@/components/lister/add-vehicle/types";

// Fields checked before letting the lister move to the next step. Optional
// fields (engineCapacity, condition, features, description) are validated
// only at final submit, alongside everything else, via the full schema.
// Schemas are declared statically (not built from a dynamic key list) so
// zod's .pick() can type-check the mask against the real schema shape.
const STEP_FIELDS: (keyof WizardFormState)[][] = [
  ["brand", "model", "year", "contactPhone", "directOwner"],
  ["fuelType", "transmission"],
  ["leaseAmount", "leasePeriod", "serviceChargePercent"],
  ["locationId"],
  ["imageUrls"],
  [],
];

const STEP_SCHEMAS = [
  vehicleCreateSchema.pick({ brand: true, model: true, year: true, contactPhone: true, directOwner: true }),
  vehicleCreateSchema.pick({ fuelType: true, transmission: true }),
  vehicleCreateSchema.pick({ leaseAmount: true, leasePeriod: true, serviceChargePercent: true }),
  vehicleCreateSchema.pick({ locationId: true }),
  vehicleCreateSchema.pick({ imageUrls: true }),
  null,
] as const;

function toApiPayload(formState: WizardFormState) {
  return {
    brand: formState.brand,
    model: formState.model,
    year: formState.year,
    leaseAmount: formState.leaseAmount,
    leasePeriod: formState.leasePeriod,
    directOwner: formState.directOwner,
    contactPhone: formState.contactPhone,
    serviceChargePercent: formState.serviceChargePercent,
    locationId: formState.locationId,
    description: formState.description || undefined,
    fuelType: formState.fuelType,
    transmission: formState.transmission,
    registrationYear: "",
    engineCapacity: formState.engineCapacity,
    condition: formState.condition,
    features: formState.features,
    imageUrls: JSON.stringify(formState.imageUrls),
  };
}

export function AddVehicleWizard({
  mode = "create",
  vehicleId,
  initialState,
  onDirtyChange,
}: {
  mode?: "create" | "edit";
  vehicleId?: string;
  initialState?: WizardFormState;
  /** Optional — lets a parent (the Quick/Detailed listing-type switcher) know
   * whether this form has unsaved input, without this component needing to
   * know why. Unused by the plain create/edit pages. */
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [formState, setFormState] = useState<WizardFormState>(initialState ?? EMPTY_WIZARD_STATE);

  useEffect(() => {
    onDirtyChange?.(JSON.stringify(formState) !== JSON.stringify(initialState ?? EMPTY_WIZARD_STATE));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formState]);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [brandOptions, setBrandOptions] = useState<ComboboxOption[]>([]);
  const [locationOptions, setLocationOptions] = useState<ComboboxOption[]>([]);

  useEffect(() => {
    fetch("/api/brands")
      .then((res) => res.json())
      .then((payload) => setBrandOptions((payload.options ?? []).map((option: { label: string }) => ({ value: option.label, label: option.label }))))
      .catch(() => setBrandOptions([]));
    fetch("/api/locations")
      .then((res) => res.json())
      .then((payload) =>
        setLocationOptions((payload.options ?? []).map((option: { id: string; label: string }) => ({ value: option.id, label: option.label })))
      )
      .catch(() => setLocationOptions([]));
  }, []);

  const onChange = <K extends keyof WizardFormState>(field: K, value: WizardFormState[K]) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const validateStep = (index: number): boolean => {
    const fields = STEP_FIELDS[index];
    const schema = STEP_SCHEMAS[index];
    if (!schema) return true;

    if (index === 4 && formState.imageUrls.length === 0) {
      toast.error("Add at least one photo to continue.");
      return false;
    }

    const validation = schema.safeParse(toApiPayload(formState));
    if (!validation.success) {
      const fieldErrors = validation.error.flatten().fieldErrors as Record<string, string[] | undefined>;
      setErrors((prev) => ({ ...prev, ...Object.fromEntries(fields.map((field) => [field, fieldErrors[field]?.[0]])) }));
      return false;
    }
    return true;
  };

  const goNext = () => {
    if (!validateStep(step)) return;
    setStep((current) => Math.min(current + 1, WIZARD_STEPS.length - 1));
  };

  const goBack = () => setStep((current) => Math.max(current - 1, 0));

  const goToStep = (target: number) => setStep(target);

  const handleSubmit = async () => {
    const payload = toApiPayload(formState);
    const validation = vehicleCreateSchema.safeParse(payload);
    if (!validation.success) {
      toast.error("Some details need attention before submitting.");
      const fieldErrors = validation.error.flatten().fieldErrors as Record<string, string[] | undefined>;
      const firstInvalidStep = STEP_FIELDS.findIndex((fields) => fields.some((field) => fieldErrors[field]?.length));
      if (firstInvalidStep >= 0) {
        setErrors(Object.fromEntries(Object.entries(fieldErrors).map(([key, value]) => [key, value?.[0]])));
        setStep(firstInvalidStep);
      }
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === "edit" && vehicleId) {
        const response = await fetch(`/api/vehicles/${vehicleId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const updatePayload = await response.json();
        if (!response.ok) {
          const firstError = updatePayload.errors && Object.values(updatePayload.errors).flat()[0];
          toast.error((firstError as string) || updatePayload.message || "Unable to update listing.");
          return;
        }
        setSubmitted(true);
        return;
      }

      const response = await fetch("/api/vehicles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const createPayload = await response.json();
      if (!response.ok) {
        const firstError = createPayload.errors && Object.values(createPayload.errors).flat()[0];
        toast.error((firstError as string) || createPayload.message || "Unable to save listing.");
        return;
      }

      // Created as "draft" by the API — immediately publish it. Listers
      // have full control over their own listings; there's no admin
      // approval step (see the same "published" transition in
      // lister-vehicle-actions.tsx).
      if (createPayload.id) {
        await fetch(`/api/vehicles/${createPayload.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "published" }),
        }).catch(() => {});
      }

      setSubmitted(true);
    } catch {
      toast.error(mode === "edit" ? "Unable to save changes. Check your connection and try again." : "Unable to submit listing. Check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddAnother = () => {
    setFormState(EMPTY_WIZARD_STATE);
    setErrors({});
    setStep(0);
    setSubmitted(false);
  };

  if (submitted) {
    return <SuccessStep mode={mode} onAddAnother={handleAddAnother} />;
  }

  return (
    <div className="space-y-5">
      <StepProgress current={step} />

      <div>
        {step === 0 ? <BasicInfoStep formState={formState} errors={errors} onChange={onChange} brandOptions={brandOptions} /> : null}
        {step === 1 ? <SpecsStep formState={formState} errors={errors} onChange={onChange} /> : null}
        {step === 2 ? <PricingStep formState={formState} errors={errors} onChange={onChange} /> : null}
        {step === 3 ? <LocationStep formState={formState} errors={errors} onChange={onChange} locationOptions={locationOptions} /> : null}
        {step === 4 ? <ImagesStep formState={formState} onChange={onChange} /> : null}
        {step === 5 ? <ReviewStep formState={formState} goToStep={goToStep} locationOptions={locationOptions} /> : null}
      </div>

      <div className="flex gap-3 pt-2">
        {step > 0 ? (
          <Button type="button" variant="outline" className="min-h-13 flex-1 gap-1.5" onClick={goBack} disabled={isSubmitting}>
            <ChevronLeft className="size-4" /> Back
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            className="min-h-13 flex-1 gap-1.5"
            onClick={() => router.push(mode === "edit" ? "/lister/vehicles" : "/lister/dashboard")}
          >
            Cancel
          </Button>
        )}
        {step < WIZARD_STEPS.length - 1 ? (
          <Button type="button" className="min-h-13 flex-1 gap-1.5" onClick={goNext}>
            Next <ChevronRight className="size-4" />
          </Button>
        ) : (
          <Button type="button" className="min-h-13 flex-1 gap-1.5" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
            {isSubmitting ? (mode === "edit" ? "Saving…" : "Submitting…") : mode === "edit" ? "Save changes" : "Submit"}
          </Button>
        )}
      </div>
    </div>
  );
}
