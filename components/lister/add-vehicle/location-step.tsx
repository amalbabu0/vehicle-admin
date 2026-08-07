"use client";

import { Combobox, type ComboboxOption } from "@/components/combobox";
import { Field } from "@/components/lister/add-vehicle/field";
import type { WizardFormState, FieldErrors } from "@/components/lister/add-vehicle/types";

export function LocationStep({
  formState,
  errors,
  onChange,
  locationOptions,
}: {
  formState: WizardFormState;
  errors: FieldErrors;
  onChange: <K extends keyof WizardFormState>(field: K, value: WizardFormState[K]) => void;
  locationOptions: ComboboxOption[];
}) {
  return (
    <div className="space-y-4">
      <Field htmlFor="locationId" label="Vehicle location" error={errors.locationId}>
        <Combobox
          value={formState.locationId}
          onChange={(value) => onChange("locationId", value)}
          options={locationOptions}
          placeholder="Select location"
          searchPlaceholder="Search Kerala districts/taluks…"
          emptyText="No matching location."
          triggerClassName="h-12"
        />
      </Field>
      <p className="text-xs text-muted-foreground">This helps lessees near you find your vehicle.</p>
    </div>
  );
}
