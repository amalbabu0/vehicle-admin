"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Combobox, type ComboboxOption } from "@/components/combobox";
import { parseQuickListing, FUEL_TYPES, TRANSMISSIONS } from "@/lib/validators/vehicle";
import indiaCarBrands from "@/lib/data/india-car-brands.json";

const emptyFormState = {
  listingType: "lease",
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

/** Matches free-form parsed location text (e.g. "Malappuram" from a
 * WhatsApp ad) against the real fetched location options, since
 * locationId now has to be an actual row id — there's no auto-create
 * fallback for locations (see lib/vehicles/references.ts). */
function matchLocationId(parsedText: string | undefined, options: ComboboxOption[]): string | undefined {
  if (!parsedText?.trim()) return undefined;
  const needle = parsedText.trim().toLowerCase();
  return options.find((option) => option.label.toLowerCase().split(" — ")[0] === needle)?.value
    ?? options.find((option) => option.label.toLowerCase().includes(needle))?.value;
}

export default function AddVehiclePage() {
  const [mode, setMode] = useState<"manual" | "quick">("manual");
  const [formState, setFormState] = useState(emptyFormState);
  const [quickText, setQuickText] = useState("");
  const [quickImageUrls, setQuickImageUrls] = useState("");
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
    const brand = indiaCarBrands.brands.find((b) => b.name.toLowerCase() === formState.brand.trim().toLowerCase());
    return (brand?.models ?? []).map((model) => ({ value: model, label: model }));
  }, [formState.brand]);

  const parsedQuick = useMemo(() => parseQuickListing(quickText), [quickText]);
  const canApplyParsed = Boolean(
    quickText.trim() &&
      (parsedQuick.name || parsedQuick.leaseAmount || parsedQuick.leasePeriod || parsedQuick.contactPhone || parsedQuick.locationId)
  );

  const handleChange = (field: keyof typeof emptyFormState, value: string) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  const handleApplyParsed = () => {
    setFormState((prev) => ({
      ...prev,
      brand: parsedQuick.brand ?? prev.brand,
      model: parsedQuick.model ?? prev.model,
      year: parsedQuick.year ?? prev.year,
      leaseAmount: parsedQuick.leaseAmount ?? prev.leaseAmount,
      leasePeriod: parsedQuick.leasePeriod ?? prev.leasePeriod,
      directOwner: parsedQuick.directOwner === undefined ? prev.directOwner : String(parsedQuick.directOwner),
      contactPhone: parsedQuick.contactPhone ?? prev.contactPhone,
      serviceChargePercent: parsedQuick.serviceChargePercent ?? prev.serviceChargePercent,
      locationId: matchLocationId(parsedQuick.locationId, locationOptions) ?? prev.locationId,
      listingType: parsedQuick.listingType ?? prev.listingType,
      fuelType: parsedQuick.fuelType ?? prev.fuelType,
      transmission: parsedQuick.transmission ?? prev.transmission,
      registrationYear: parsedQuick.registrationYear ?? prev.registrationYear,
      engineCapacity: parsedQuick.engineCapacity ?? prev.engineCapacity,
      condition: parsedQuick.condition ?? prev.condition,
    }));
  };

  const handleImageUpload = async (files: FileList | null, target: "manual" | "quick") => {
    if (!files?.length) return;
    setAlert(null);
    setIsUploading(true);
    try {
      const uploadedUrls: string[] = [];
      for (const file of Array.from(files)) {
        const body = new FormData();
        body.append("file", file);
        const response = await fetch("/api/uploads/vehicle-image", { method: "POST", body });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.message || "Unable to upload image.");
        uploadedUrls.push(payload.url);
      }

      const currentValue = target === "manual" ? formState.imageUrls : quickImageUrls;
      let existingUrls: string[] = [];
      try {
        const parsed = JSON.parse(currentValue);
        existingUrls = Array.isArray(parsed) ? parsed.filter((url): url is string => typeof url === "string") : [];
      } catch {
        // Replace malformed manual input with the successfully uploaded URLs.
      }
      const nextValue = JSON.stringify([...existingUrls, ...uploadedUrls]);
      if (target === "manual") handleChange("imageUrls", nextValue);
      else setQuickImageUrls(nextValue);
    } catch (error) {
      setAlert({ type: "error", message: error instanceof Error ? error.message : "Unable to upload image." });
    } finally {
      setIsUploading(false);
    }
  };

  const handleQuickSubmit = () => {
    setAlert(null);
    const quickForm = {
      ...emptyFormState,
      ...parsedQuick,
      directOwner: parsedQuick.directOwner === undefined ? "true" : String(parsedQuick.directOwner),
      imageUrls: quickImageUrls,
    };

    startTransition(async () => {
      const response = await fetch("/api/vehicles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...quickForm, directOwner: quickForm.directOwner === "true" }),
      });
      const payload = await response.json();
      if (!response.ok) {
        const firstError = payload.errors && Object.values(payload.errors).flat()[0];
        setAlert({ type: "error", message: firstError || payload.message || "Unable to save listing." });
        return;
      }
      setAlert({ type: "success", message: payload.message });
      setFormState(emptyFormState);
      setQuickText("");
      setQuickImageUrls("");
    });
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
        setAlert({ type: "error", message: payload.message || "Unable to save listing." });
        return;
      }

      setAlert({ type: "success", message: payload.message });
      setFormState(emptyFormState);
      setQuickText("");
    });
  };

  return (
    <main className="min-h-screen p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-3xl border border-border bg-background/80 p-6 shadow-sm shadow-black/5 backdrop-blur-xl">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-muted-foreground">New listing</p>
              <h1 className="mt-2 text-3xl font-semibold">Add vehicle</h1>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Create a listing manually or parse a WhatsApp-style ad for quick entry.
              </p>
            </div>
            <Link href="/vehicles" className="no-underline">
              <Button variant="outline">Back to listings</Button>
            </Link>
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-background/80 p-6 shadow-sm shadow-black/5 backdrop-blur-xl">
          <Tabs value={mode} onValueChange={(value) => setMode(value as "manual" | "quick")}>
            <TabsList>
              <TabsTrigger value="manual">Manual listing</TabsTrigger>
              <TabsTrigger value="quick">Quick listing</TabsTrigger>
            </TabsList>

            <TabsContent value="manual">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="listingType">Listing type</Label>
                  <select
                    id="listingType"
                    name="listingType"
                    value={formState.listingType}
                    onChange={(event) => handleChange("listingType", event.target.value)}
                    className="h-10 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    <option value="lease">Lease</option>
                    <option value="sale">Sale</option>
                  </select>
                </div>

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
                    accept="image/jpeg,image/png,image/webp,image/avif"
                    multiple
                    onChange={(event) => void handleImageUpload(event.target.files, "manual")}
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
            </TabsContent>

            <TabsContent value="quick">
              <div className="space-y-6">
                <div className="rounded-2xl border border-border bg-muted p-4 text-sm text-muted-foreground">
                  <p className="font-medium">Quick listing helper</p>
                  <p>Paste a WhatsApp-style advertisement with vehicle details. The parser extracts values and lets you finish the listing with images.</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="quickText">Paste WhatsApp ad</Label>
                  <Textarea
                    id="quickText"
                    value={quickText}
                    onChange={(event) => setQuickText(event.target.value)}
                    rows={8}
                    placeholder="Paste your ad text here"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-border bg-muted p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Brand / model</p>
                    <p className="mt-2 text-sm text-foreground">
                      {[parsedQuick.brand, parsedQuick.model].filter(Boolean).join(" ") || "Not found"}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border bg-muted p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Lease amount</p>
                    <p className="mt-2 text-sm text-foreground">{parsedQuick.leaseAmount || "Not found"}</p>
                  </div>
                  <div className="rounded-2xl border border-border bg-muted p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Lease period</p>
                    <p className="mt-2 text-sm text-foreground">{parsedQuick.leasePeriod || "Not found"}</p>
                  </div>
                  <div className="rounded-2xl border border-border bg-muted p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Contact</p>
                    <p className="mt-2 text-sm text-foreground">{parsedQuick.contactPhone || "Not found"}</p>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-border bg-muted p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Direct owner</p>
                    <p className="mt-2 text-sm text-foreground">{parsedQuick.directOwner ? "Yes" : "No"}</p>
                  </div>
                  <div className="rounded-2xl border border-border bg-muted p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Location</p>
                    <p className="mt-2 text-sm text-foreground">{parsedQuick.locationId || "Not found"}</p>
                  </div>
                  <div className="rounded-2xl border border-border bg-muted p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Fuel type</p>
                    <p className="mt-2 text-sm text-foreground">{parsedQuick.fuelType || "Not found — select manually"}</p>
                  </div>
                  <div className="rounded-2xl border border-border bg-muted p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Transmission</p>
                    <p className="mt-2 text-sm text-foreground">{parsedQuick.transmission || "Not found — select manually"}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="quickVehicleImages">Vehicle images</Label>
                  <Input
                    id="quickVehicleImages"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/avif"
                    multiple
                    onChange={(event) => void handleImageUpload(event.target.files, "quick")}
                    disabled={isUploading}
                  />
                  <p className="text-xs text-muted-foreground">Uploads are converted to WebP with metadata removed. Images are required to create the draft.</p>
                </div>

                {alert ? (
                  <div className={alert.type === "error" ? "rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive" : "rounded-2xl border border-emerald-300 bg-emerald-100 p-4 text-sm text-emerald-900"}>
                    {alert.message}
                  </div>
                ) : null}

                <div className="flex flex-wrap gap-3">
                  <Button type="button" variant="outline" onClick={handleApplyParsed} disabled={!canApplyParsed}>
                    Apply parsed values to form
                  </Button>
                  <Button type="button" onClick={() => setMode("manual")}>Finish in manual form</Button>
                  <Button type="button" onClick={handleQuickSubmit} disabled={isPending || isUploading || !canApplyParsed}>
                    {isPending ? "Saving…" : "Create draft"}
                  </Button>
                </div>

                <div className="rounded-2xl border border-border bg-background/80 p-6 shadow-sm">
                  <p className="text-sm font-medium">Next step</p>
                  <p className="mt-3 text-sm text-muted-foreground">
                    Apply parsed values and complete the remaining required fields below in the manual form. Then save the listing as draft.
                  </p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </main>
  );
}
