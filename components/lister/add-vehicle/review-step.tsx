"use client";

import Image from "next/image";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ComboboxOption } from "@/components/combobox";
import type { WizardFormState } from "@/components/lister/add-vehicle/types";

function ReviewSection({ title, onEdit, children }: { title: string; onEdit: () => void; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border p-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">{title}</h4>
        <Button type="button" variant="ghost" size="sm" className="h-8 gap-1 text-xs" onClick={onEdit}>
          <Pencil className="size-3" /> Edit
        </Button>
      </div>
      <dl className="mt-2 space-y-1 text-sm text-muted-foreground">{children}</dl>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-3">
      <dt>{label}</dt>
      <dd className="text-right text-foreground">{value}</dd>
    </div>
  );
}

export function ReviewStep({
  formState,
  goToStep,
  locationOptions,
}: {
  formState: WizardFormState;
  goToStep: (step: number) => void;
  locationOptions: ComboboxOption[];
}) {
  const locationLabel = locationOptions.find((option) => option.value === formState.locationId)?.label ?? "";

  return (
    <div className="space-y-3">
      <ReviewSection title="Basic Info" onEdit={() => goToStep(0)}>
        <Row label="Brand" value={formState.brand} />
        <Row label="Model" value={formState.model} />
        <Row label="Registration year" value={formState.year} />
        <Row label="Contact" value={formState.contactPhone} />
        <Row label="Direct owner" value={formState.directOwner === "true" ? "Yes" : "No"} />
      </ReviewSection>

      <ReviewSection title="Specifications" onEdit={() => goToStep(1)}>
        <Row label="Fuel type" value={formState.fuelType} />
        <Row label="Transmission" value={formState.transmission} />
        <Row label="Engine" value={formState.engineCapacity} />
        <Row label="Condition" value={formState.condition} />
        <Row label="Features" value={formState.features} />
      </ReviewSection>

      <ReviewSection title="Pricing" onEdit={() => goToStep(2)}>
        <Row label="Lease amount" value={formState.leaseAmount ? `₹${formState.leaseAmount}` : ""} />
        <Row label="Lease period" value={formState.leasePeriod} />
        <Row label="Service charge" value={formState.serviceChargePercent ? `${formState.serviceChargePercent}%` : ""} />
      </ReviewSection>

      <ReviewSection title="Location" onEdit={() => goToStep(3)}>
        <Row label="Location" value={locationLabel} />
      </ReviewSection>

      <ReviewSection title="Images" onEdit={() => goToStep(4)}>
        {formState.imageUrls.length === 0 ? (
          <p>No photos added.</p>
        ) : (
          <div className="flex gap-2 pt-1">
            {formState.imageUrls.slice(0, 4).map((url) => (
              <div key={url} className="relative size-14 overflow-hidden rounded-lg border border-border">
                <Image src={url} alt="" fill sizes="56px" className="object-cover" />
              </div>
            ))}
            {formState.imageUrls.length > 4 ? (
              <div className="flex size-14 items-center justify-center rounded-lg border border-border text-xs text-muted-foreground">
                +{formState.imageUrls.length - 4}
              </div>
            ) : null}
          </div>
        )}
      </ReviewSection>

      <p className="text-xs text-muted-foreground">
        Submitting publishes this listing immediately on the public site.
      </p>
    </div>
  );
}
