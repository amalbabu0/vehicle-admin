"use client";

import { Input } from "@/components/ui/input";
import { Field } from "@/components/lister/add-vehicle/field";
import { Combobox, type ComboboxOption } from "@/components/combobox";
import type { WizardFormState, FieldErrors } from "@/components/lister/add-vehicle/types";

// Lease period is always in months, but ranges from a fixed term to a
// range, so this offers the common shapes plus a custom fallback (the
// vehicles.lease_period column is free text either way).
const LEASE_PERIOD_OPTIONS: ComboboxOption[] = [
  { value: "1 month", label: "1 month" },
  { value: "3 months", label: "3 months" },
  { value: "6 months", label: "6 months" },
  { value: "12 months", label: "12 months" },
  { value: "3-6 months", label: "3-6 months" },
  { value: "6-12 months", label: "6-12 months" },
  { value: "12-24 months", label: "12-24 months" },
  { value: "24+ months", label: "24+ months" },
];

export function PricingStep({
  formState,
  errors,
  onChange,
}: {
  formState: WizardFormState;
  errors: FieldErrors;
  onChange: <K extends keyof WizardFormState>(field: K, value: WizardFormState[K]) => void;
}) {
  return (
    <div className="space-y-4">
      <Field htmlFor="leaseAmount" label="Lease amount (₹)" error={errors.leaseAmount}>
        <Input
          id="leaseAmount"
          type="text"
          inputMode="numeric"
          placeholder="e.g. 15000"
          className="h-12"
          value={formState.leaseAmount}
          onChange={(event) => onChange("leaseAmount", event.target.value)}
        />
      </Field>

      <Field htmlFor="leasePeriod" label="Lease period" error={errors.leasePeriod}>
        <Combobox
          value={formState.leasePeriod}
          onChange={(value) => onChange("leasePeriod", value)}
          options={LEASE_PERIOD_OPTIONS}
          placeholder="Select lease period"
          searchPlaceholder="Search or type a custom period…"
          emptyText="No matching option — type to use a custom period."
          allowCustomValue
          triggerClassName="h-12"
        />
      </Field>

      <Field htmlFor="serviceChargePercent" label="Service charge % (optional)" error={errors.serviceChargePercent}>
        <Input
          id="serviceChargePercent"
          type="text"
          inputMode="numeric"
          placeholder="e.g. 5"
          className="h-12"
          value={formState.serviceChargePercent}
          onChange={(event) => onChange("serviceChargePercent", event.target.value)}
        />
      </Field>
    </div>
  );
}
