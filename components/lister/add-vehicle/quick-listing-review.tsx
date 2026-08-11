"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ComboboxOption } from "@/components/combobox";
import { quickVehicleCreateSchema } from "@/lib/validators/vehicle";
import { BasicInfoStep } from "@/components/lister/add-vehicle/basic-info-step";
import { SpecsStep } from "@/components/lister/add-vehicle/specs-step";
import { PricingStep } from "@/components/lister/add-vehicle/pricing-step";
import { LocationStep } from "@/components/lister/add-vehicle/location-step";
import { Combobox } from "@/components/combobox";
import { Field } from "@/components/lister/add-vehicle/field";
import { ImagesStep } from "@/components/lister/add-vehicle/images-step";
import { SuccessStep } from "@/components/lister/add-vehicle/success-step";
import type { WizardFormState, FieldErrors } from "@/components/lister/add-vehicle/types";

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4 rounded-2xl border border-border bg-card p-4">
      <div>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {hint ? <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p> : null}
      </div>
      {children}
    </section>
  );
}

/** Mirrors the columns `vehicles` cannot store as null. Everything else is
 * saved as null when left blank — see quickVehicleCreateSchema. */
function toPayload(formState: WizardFormState) {
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
    categoryId: formState.categoryId,
    description: formState.description,
    fuelType: formState.fuelType,
    transmission: formState.transmission,
    engineCapacity: formState.engineCapacity,
    condition: formState.condition,
    features: formState.features,
    imageUrls: formState.imageUrls,
  };
}

/**
 * Quick Listing's final review: everything the extractor found on one page,
 * Submit at the bottom. Composes the very same field components the
 * Detailed Listing wizard uses, so inputs behave identically without that
 * wizard being modified at all.
 *
 * Anything the message didn't mention is left blank and saved as null —
 * only brand, model, lease amount, lease period and contact number are
 * required, because those are the columns the `vehicles` table physically
 * cannot store empty.
 */
export function QuickListingReview({
  initialState,
  onStartOver,
}: {
  initialState: WizardFormState;
  onStartOver: () => void;
}) {
  const router = useRouter();
  const [formState, setFormState] = useState<WizardFormState>(initialState);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [brandOptions, setBrandOptions] = useState<ComboboxOption[]>([]);
  const [locationOptions, setLocationOptions] = useState<ComboboxOption[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<ComboboxOption[]>([]);

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
    fetch("/api/categories")
      .then((res) => res.json())
      .then((payload) =>
        setCategoryOptions((payload.options ?? []).map((option: { id: string; label: string }) => ({ value: option.id, label: option.label })))
      )
      .catch(() => setCategoryOptions([]));
  }, []);

  const onChange = <K extends keyof WizardFormState>(field: K, value: WizardFormState[K]) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleSubmit = async () => {
    const payload = toPayload(formState);
    const validation = quickVehicleCreateSchema.safeParse(payload);
    if (!validation.success) {
      const fieldErrors = validation.error.flatten().fieldErrors as Record<string, string[] | undefined>;
      setErrors(Object.fromEntries(Object.entries(fieldErrors).map(([key, value]) => [key, value?.[0]])));
      toast.error("A few required details are still missing.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/lister/quick-listing/create", {
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

      // Created as "draft" by the API — publish immediately, matching the
      // detailed wizard (listers control their own listings; no admin
      // approval step).
      if (createPayload.id) {
        await fetch(`/api/vehicles/${createPayload.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "published" }),
        }).catch(() => {});
      }

      setSubmitted(true);
    } catch {
      toast.error("Unable to submit listing. Check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return <SuccessStep mode="create" onAddAnother={onStartOver} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Review the details</h2>
          <p className="text-sm text-muted-foreground">
            Anything your message didn&apos;t mention is left blank — you can fill it in now or later.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" className="min-h-11 shrink-0 gap-1.5" onClick={onStartOver} disabled={isSubmitting}>
          <ChevronLeft className="size-4" /> Start over
        </Button>
      </div>

      <Section title="Basic info" hint="Brand, model and contact number are required.">
        <BasicInfoStep formState={formState} errors={errors} onChange={onChange} brandOptions={brandOptions} />
      </Section>

      <Section title="Vehicle type" hint="Drives the type filter on the public site — worth getting right.">
        <Field htmlFor="categoryId" label="Category" error={errors.categoryId}>
          <Combobox
            value={formState.categoryId}
            onChange={(value) => onChange("categoryId", value)}
            options={categoryOptions}
            placeholder="Select vehicle type"
            searchPlaceholder="Search types…"
            emptyText="No matching type."
            triggerClassName="h-12"
          />
        </Field>
      </Section>

      <Section title="Specifications" hint="Optional — leave blank if the message didn't say.">
        <SpecsStep formState={formState} errors={errors} onChange={onChange} />
      </Section>

      <Section title="Pricing" hint="Lease amount and period are required.">
        <PricingStep formState={formState} errors={errors} onChange={onChange} />
      </Section>

      <Section title="Location" hint="Optional — can be added later.">
        <LocationStep formState={formState} errors={errors} onChange={onChange} locationOptions={locationOptions} />
      </Section>

      <Section title="Photos">
        <ImagesStep formState={formState} onChange={onChange} />
      </Section>

      <div className="flex gap-3 pt-1">
        <Button
          type="button"
          variant="outline"
          className="min-h-13 flex-1"
          onClick={() => router.push("/lister/vehicles")}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button type="button" className="min-h-13 flex-1 gap-1.5" onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
          {isSubmitting ? "Submitting…" : "Submit"}
        </Button>
      </div>
    </div>
  );
}
