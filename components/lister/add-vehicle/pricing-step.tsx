"use client";

import { Input } from "@/components/ui/input";
import { Field } from "@/components/lister/add-vehicle/field";
import type { WizardFormState, FieldErrors } from "@/components/lister/add-vehicle/types";

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
        <Input
          id="leasePeriod"
          type="text"
          placeholder="e.g. per month, per year"
          className="h-12"
          value={formState.leasePeriod}
          onChange={(event) => onChange("leasePeriod", event.target.value)}
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
