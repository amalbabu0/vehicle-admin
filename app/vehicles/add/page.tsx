"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Combobox, type ComboboxOption } from "@/components/combobox";
import { FUEL_TYPES, TRANSMISSIONS } from "@/lib/validators/vehicle";
import indiaVehicleBrands from "@/lib/data/india-vehicle-brands.json";

const emptyFormState = {
  brand: "",
  model: "",
  year: "",
  leaseAmount: "",
  leasePeriod: "",
  directOwner: "true",
  contactPhone: "",
  serviceChargePercent: "",
  locationId: "",
  fuelType: "",
  transmission: "",
  registrationYear: "",
  engineCapacity: "",
  condition: "",
  features: "",
  imageUrls: "",
};

export default function AddVehiclePage() {
  const [formState, setFormState] = useState(emptyFormState);
  const [isUploading, setIsUploading] = useState(false);
  const [alert, setAlert] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const [locationOptions, setLocationOptions] = useState<ComboboxOption[]>([]);
  const [brandOptions, setBrandOptions] = useState<ComboboxOption[]>([]);

  useEffect(() => {
    fetch("/api/locations")
      .then((res) => res.json())
      .then((payload) =>
        setLocationOptions((payload.options ?? []).map((option: { id: string; label: string }) => ({ value: option.id, label: option.label })))
      )
      .catch(() => setLocationOptions([]));
    fetch("/api/brands")
      .then((res) => res.json())
      .then((payload) =>
        setBrandOptions((payload.options ?? []).map((option: { label: string }) => ({ value: option.label, label: option.label })))
      )
      .catch(() => setBrandOptions([]));
  }, []);

  const modelOptions = useMemo<ComboboxOption[]>(() => {
    const brand = indiaVehicleBrands.brands.find((b) => b.name.toLowerCase() === formState.brand.trim().toLowerCase());
    return (brand?.models ?? []).map((model) => ({ value: model, label: model }));
  }, [formState.brand]);

  const handleChange = (field: keyof typeof emptyFormState, value: string) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  const handleImageUpload = async (files: FileList | null) => {
    if (!files?.length) return;
    setAlert(null);
    setIsUploading(true);
    try {
      // Carries the {url, mediumUrl, thumbnailUrl} triple the upload
      // endpoint returns — not just `url` — so listings created from this
      // form also get thumbnails, same as the mobile wizard.
      const uploaded: { url: string; mediumUrl?: string; thumbnailUrl?: string }[] = [];
      for (const file of Array.from(files)) {
        const body = new FormData();
        body.append("file", file);
        const response = await fetch("/api/uploads/vehicle-image", { method: "POST", body });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.message || "Unable to upload image.");
        uploaded.push({ url: payload.url, mediumUrl: payload.mediumUrl, thumbnailUrl: payload.thumbnailUrl });
      }

      let existing: { url: string; mediumUrl?: string; thumbnailUrl?: string }[] = [];
      try {
        const parsed = JSON.parse(formState.imageUrls);
        existing = Array.isArray(parsed) ? parsed.filter((entry): entry is { url: string } => Boolean(entry?.url)) : [];
      } catch {
        // Replace malformed manual input with the successfully uploaded images.
      }
      handleChange("imageUrls", JSON.stringify([...existing, ...uploaded]));
    } catch (error) {
      setAlert({ type: "error", message: error instanceof Error ? error.message : "Unable to upload image." });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAlert(null);
    startTransition(async () => {
      const response = await fetch("/api/vehicles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formState,
          directOwner: formState.directOwner === "true",
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        const firstError = payload.errors && Object.values(payload.errors).flat()[0];
        setAlert({ type: "error", message: firstError || payload.message || "Unable to save listing." });
        return;
      }

      setAlert({ type: "success", message: payload.message });
      setFormState(emptyFormState);
    });
  };

  return (
    <main className="min-h-screen p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-3xl border border-border bg-background/80 p-6 shadow-sm shadow-black/5 backdrop-blur-xl">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-muted-foreground">New listing</p>
              <h1 className="mt-2 text-3xl font-semibold">List your vehicle for lease</h1>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Every listing you submit here is created as a lease listing.
              </p>
            </div>
            <Link href="/vehicles" className="no-underline">
              <Button variant="outline">Back to listings</Button>
            </Link>
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-background/80 p-6 shadow-sm shadow-black/5 backdrop-blur-xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="brand">Brand</Label>
                <Combobox
                  value={formState.brand}
                  onChange={(value) => {
                    handleChange("brand", value);
                    handleChange("model", "");
                  }}
                  options={brandOptions}
                  placeholder="Select brand"
                  searchPlaceholder="Search brands…"
                  allowCustomValue
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="model">Model</Label>
                <Combobox
                  value={formState.model}
                  onChange={(value) => handleChange("model", value)}
                  options={modelOptions}
                  placeholder={formState.brand ? "Select model" : "Select a brand first"}
                  searchPlaceholder="Search models…"
                  emptyText="No matching models — type to use a custom one."
                  allowCustomValue
                  disabled={!formState.brand}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="year">Year</Label>
                <Input
                  id="year"
                  name="year"
                  type="text"
                  inputMode="numeric"
                  value={formState.year}
                  onChange={(event) => handleChange("year", event.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="leaseAmount">Lease amount</Label>
                <Input
                  id="leaseAmount"
                  name="leaseAmount"
                  type="text"
                  inputMode="numeric"
                  value={formState.leaseAmount}
                  onChange={(event) => handleChange("leaseAmount", event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="leasePeriod">Lease period</Label>
                <Input
                  id="leasePeriod"
                  name="leasePeriod"
                  type="text"
                  value={formState.leasePeriod}
                  onChange={(event) => handleChange("leasePeriod", event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="serviceChargePercent">Service charge (%)</Label>
                <Input
                  id="serviceChargePercent"
                  name="serviceChargePercent"
                  type="text"
                  inputMode="numeric"
                  value={formState.serviceChargePercent}
                  onChange={(event) => handleChange("serviceChargePercent", event.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="contactPhone">Contact number</Label>
                <Input
                  id="contactPhone"
                  name="contactPhone"
                  type="tel"
                  autoComplete="tel"
                  value={formState.contactPhone}
                  onChange={(event) => handleChange("contactPhone", event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="locationId">Location</Label>
                <Combobox
                  value={formState.locationId}
                  onChange={(value) => handleChange("locationId", value)}
                  options={locationOptions}
                  placeholder="Select location"
                  searchPlaceholder="Search Kerala districts/taluks…"
                  emptyText="No matching location."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="directOwner">Direct owner</Label>
                <select
                  id="directOwner"
                  name="directOwner"
                  value={formState.directOwner}
                  onChange={(event) => handleChange("directOwner", event.target.value)}
                  className="h-10 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="fuelType">Fuel type</Label>
                <Select value={formState.fuelType} onValueChange={(value) => handleChange("fuelType", value)} required>
                  <SelectTrigger id="fuelType" className="w-full">
                    <SelectValue placeholder="Select fuel type" />
                  </SelectTrigger>
                  <SelectContent>
                    {FUEL_TYPES.map((option) => (
                      <SelectItem key={option} value={option}>{option}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="transmission">Transmission</Label>
                <Select value={formState.transmission} onValueChange={(value) => handleChange("transmission", value)} required>
                  <SelectTrigger id="transmission" className="w-full">
                    <SelectValue placeholder="Select transmission" />
                  </SelectTrigger>
                  <SelectContent>
                    {TRANSMISSIONS.map((option) => (
                      <SelectItem key={option} value={option}>{option}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="registrationYear">Registration year</Label>
              <Input
                id="registrationYear"
                name="registrationYear"
                type="text"
                inputMode="numeric"
                value={formState.registrationYear}
                onChange={(event) => handleChange("registrationYear", event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="features">Features</Label>
              <Input
                id="features"
                name="features"
                type="text"
                placeholder="Comma separated features"
                value={formState.features}
                onChange={(event) => handleChange("features", event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="vehicleImages">Vehicle images</Label>
              <Input
                id="vehicleImages"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
                multiple
                onChange={(event) => void handleImageUpload(event.target.files)}
                disabled={isUploading}
              />
              <p className="text-xs text-muted-foreground">Uploads are converted to WebP and metadata, including location data, is removed.</p>
            </div>

            {alert?.type === "error" ? (
              <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                {alert.message}
              </div>
            ) : null}

            {alert?.type === "success" ? (
              <div className="rounded-2xl border border-emerald-300 bg-emerald-100 p-4 text-sm text-emerald-900">
                {alert.message}
              </div>
            ) : null}

            <Button type="submit" className="w-full" disabled={isPending || isUploading}>
              {isPending ? "Saving…" : "Save as draft"}
            </Button>
          </form>
        </div>
      </div>
    </main>
  );
}
