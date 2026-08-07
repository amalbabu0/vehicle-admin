"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Field } from "@/components/lister/add-vehicle/field";
import { FUEL_TYPES, TRANSMISSIONS } from "@/lib/validators/vehicle";
import type { WizardFormState, FieldErrors } from "@/components/lister/add-vehicle/types";

export function SpecsStep({
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
      <Field htmlFor="fuelType" label="Fuel type" error={errors.fuelType}>
        <Select value={formState.fuelType} onValueChange={(value) => onChange("fuelType", value)}>
          <SelectTrigger id="fuelType" className="h-12 w-full">
            <SelectValue placeholder="Select fuel type" />
          </SelectTrigger>
          <SelectContent>
            {FUEL_TYPES.map((option) => (
              <SelectItem key={option} value={option}>{option}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field htmlFor="transmission" label="Transmission" error={errors.transmission}>
        <Select value={formState.transmission} onValueChange={(value) => onChange("transmission", value)}>
          <SelectTrigger id="transmission" className="h-12 w-full">
            <SelectValue placeholder="Select transmission" />
          </SelectTrigger>
          <SelectContent>
            {TRANSMISSIONS.map((option) => (
              <SelectItem key={option} value={option}>{option}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field htmlFor="engineCapacity" label="Engine capacity (optional)">
        <Input
          id="engineCapacity"
          type="text"
          placeholder="e.g. 1197cc"
          className="h-12"
          value={formState.engineCapacity}
          onChange={(event) => onChange("engineCapacity", event.target.value)}
        />
      </Field>

      <Field htmlFor="condition" label="Condition (optional)">
        <Input
          id="condition"
          type="text"
          placeholder="e.g. Excellent, Good"
          className="h-12"
          value={formState.condition}
          onChange={(event) => onChange("condition", event.target.value)}
        />
      </Field>

      <Field htmlFor="features" label="Features (optional)">
        <Input
          id="features"
          type="text"
          placeholder="Comma separated, e.g. AC, Power steering, ABS"
          className="h-12"
          value={formState.features}
          onChange={(event) => onChange("features", event.target.value)}
        />
      </Field>

      <Field htmlFor="description" label="Description (optional)">
        <Textarea
          id="description"
          rows={4}
          placeholder="Anything else a lessee should know"
          value={formState.description}
          onChange={(event) => onChange("description", event.target.value)}
        />
      </Field>
    </div>
  );
}
