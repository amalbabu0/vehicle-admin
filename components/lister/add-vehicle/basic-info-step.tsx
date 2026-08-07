"use client";

import { useMemo } from "react";
import { Combobox, type ComboboxOption } from "@/components/combobox";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/lister/add-vehicle/field";
import indiaCarBrands from "@/lib/data/india-car-brands.json";
import type { WizardFormState, FieldErrors } from "@/components/lister/add-vehicle/types";

export function BasicInfoStep({
  formState,
  errors,
  onChange,
  brandOptions,
}: {
  formState: WizardFormState;
  errors: FieldErrors;
  onChange: <K extends keyof WizardFormState>(field: K, value: WizardFormState[K]) => void;
  brandOptions: ComboboxOption[];
}) {
  const modelOptions = useMemo<ComboboxOption[]>(() => {
    const brand = indiaCarBrands.brands.find((b) => b.name.toLowerCase() === formState.brand.trim().toLowerCase());
    return (brand?.models ?? []).map((model) => ({ value: model, label: model }));
  }, [formState.brand]);

  return (
    <div className="space-y-4">
      <Field htmlFor="brand" label="Brand" error={errors.brand}>
        <Combobox
          value={formState.brand}
          onChange={(value) => {
            onChange("brand", value);
            onChange("model", "");
          }}
          options={brandOptions}
          placeholder="Select brand"
          searchPlaceholder="Search brands…"
          allowCustomValue
          triggerClassName="h-12"
        />
      </Field>

      <Field htmlFor="model" label="Model" error={errors.model}>
        <Combobox
          value={formState.model}
          onChange={(value) => onChange("model", value)}
          options={modelOptions}
          placeholder={formState.brand ? "Select model" : "Select a brand first"}
          searchPlaceholder="Search models…"
          emptyText="No matching models — type to use a custom one."
          allowCustomValue
          disabled={!formState.brand}
          triggerClassName="h-12"
        />
      </Field>

      <Field htmlFor="year" label="Registration year" error={errors.year}>
        <Input
          id="year"
          type="text"
          inputMode="numeric"
          placeholder="e.g. 2021"
          className="h-12"
          value={formState.year}
          onChange={(event) => onChange("year", event.target.value)}
        />
      </Field>

      <Field htmlFor="contactPhone" label="Contact number" error={errors.contactPhone}>
        <Input
          id="contactPhone"
          type="tel"
          autoComplete="tel"
          placeholder="10-digit mobile number"
          className="h-12"
          value={formState.contactPhone}
          onChange={(event) => onChange("contactPhone", event.target.value)}
        />
      </Field>

      <Field htmlFor="directOwner" label="Are you the direct owner?">
        <div className="grid grid-cols-2 gap-2">
          {(["true", "false"] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => onChange("directOwner", option)}
              className={`h-12 rounded-xl border text-sm font-medium transition-colors ${
                formState.directOwner === option ? "border-primary bg-primary/10 text-primary" : "border-input text-muted-foreground"
              }`}
            >
              {option === "true" ? "Yes" : "No"}
            </button>
          ))}
        </div>
      </Field>
    </div>
  );
}
