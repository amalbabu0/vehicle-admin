"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { parseQuickListing } from "@/lib/validators/vehicle";

const emptyFormState = {
  listingType: "lease",
  name: "",
  brand: "",
  model: "",
  year: "",
  leaseAmount: "",
  leasePeriod: "",
  directOwner: "true",
  contactPhone: "",
  serviceChargePercent: "",
  locationId: "",
  description: "",
  fuelType: "",
  transmission: "",
  kmDriven: "",
  registrationYear: "",
  insuranceValidUntil: "",
  ownershipCount: "",
  engineCapacity: "",
  seats: "",
  color: "",
  condition: "",
  features: "",
  imageUrls: "",
};

export default function AddVehiclePage() {
  const [mode, setMode] = useState<"manual" | "quick">("manual");
  const [formState, setFormState] = useState(emptyFormState);
  const [quickText, setQuickText] = useState("");
  const [quickImageUrls, setQuickImageUrls] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [alert, setAlert] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [isPending, startTransition] = useTransition();

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
      name: parsedQuick.name ?? prev.name,
      brand: parsedQuick.brand ?? prev.brand,
      model: parsedQuick.model ?? prev.model,
      year: parsedQuick.year ?? prev.year,
      leaseAmount: parsedQuick.leaseAmount ?? prev.leaseAmount,
      leasePeriod: parsedQuick.leasePeriod ?? prev.leasePeriod,
      directOwner: parsedQuick.directOwner === undefined ? prev.directOwner : String(parsedQuick.directOwner),
      contactPhone: parsedQuick.contactPhone ?? prev.contactPhone,
      serviceChargePercent: parsedQuick.serviceChargePercent ?? prev.serviceChargePercent,
      locationId: parsedQuick.locationId ?? prev.locationId,
      description: parsedQuick.description ?? prev.description,
      listingType: parsedQuick.listingType ?? prev.listingType,
      fuelType: parsedQuick.fuelType ?? prev.fuelType,
      transmission: parsedQuick.transmission ?? prev.transmission,
      kmDriven: parsedQuick.kmDriven ?? prev.kmDriven,
      registrationYear: parsedQuick.registrationYear ?? prev.registrationYear,
      ownershipCount: parsedQuick.ownershipCount ?? prev.ownershipCount,
      engineCapacity: parsedQuick.engineCapacity ?? prev.engineCapacity,
      seats: parsedQuick.seats ?? prev.seats,
      color: parsedQuick.color ?? prev.color,
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
                <div className="grid gap-4 md:grid-cols-2">
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

                  <div className="space-y-2">
                    <Label htmlFor="name">Vehicle name</Label>
                    <Input
                      id="name"
                      name="name"
                      type="text"
                      value={formState.name}
                      onChange={(event) => handleChange("name", event.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="brand">Brand</Label>
                    <Input
                      id="brand"
                      name="brand"
                      type="text"
                      value={formState.brand}
                      onChange={(event) => handleChange("brand", event.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="model">Model</Label>
                    <Input
                      id="model"
                      name="model"
                      type="text"
                      value={formState.model}
                      onChange={(event) => handleChange("model", event.target.value)}
                      required
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
                    <Input
                      id="locationId"
                      name="locationId"
                      type="text"
                      value={formState.locationId}
                      onChange={(event) => handleChange("locationId", event.target.value)}
                      required
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

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    name="description"
                    value={formState.description}
                    onChange={(event) => handleChange("description", event.target.value)}
                    required
                    rows={5}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="fuelType">Fuel type</Label>
                    <Input
                      id="fuelType"
                      name="fuelType"
                      type="text"
                      value={formState.fuelType}
                      onChange={(event) => handleChange("fuelType", event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="transmission">Transmission</Label>
                    <Input
                      id="transmission"
                      name="transmission"
                      type="text"
                      value={formState.transmission}
                      onChange={(event) => handleChange("transmission", event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="color">Color</Label>
                    <Input
                      id="color"
                      name="color"
                      type="text"
                      value={formState.color}
                      onChange={(event) => handleChange("color", event.target.value)}
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="kmDriven">KM driven</Label>
                    <Input
                      id="kmDriven"
                      name="kmDriven"
                      type="text"
                      inputMode="numeric"
                      value={formState.kmDriven}
                      onChange={(event) => handleChange("kmDriven", event.target.value)}
                    />
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
                    <Label htmlFor="seats">Seats</Label>
                    <Input
                      id="seats"
                      name="seats"
                      type="text"
                      inputMode="numeric"
                      value={formState.seats}
                      onChange={(event) => handleChange("seats", event.target.value)}
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="ownershipCount">Ownership count</Label>
                    <Input
                      id="ownershipCount"
                      name="ownershipCount"
                      type="text"
                      inputMode="numeric"
                      value={formState.ownershipCount}
                      onChange={(event) => handleChange("ownershipCount", event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="insuranceValidUntil">Insurance valid until</Label>
                    <Input
                      id="insuranceValidUntil"
                      name="insuranceValidUntil"
                      type="date"
                      value={formState.insuranceValidUntil}
                      onChange={(event) => handleChange("insuranceValidUntil", event.target.value)}
                    />
                  </div>
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
                  <Label htmlFor="imageUrls">Image URLs</Label>
                  <Input
                    id="vehicleImages"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/avif"
                    multiple
                    onChange={(event) => void handleImageUpload(event.target.files, "manual")}
                    disabled={isUploading}
                  />
                  <p className="text-xs text-muted-foreground">Uploads are converted to WebP and metadata, including location data, is removed.</p>
                  <Textarea
                    id="imageUrls"
                    name="imageUrls"
                    rows={3}
                    placeholder='["https://example.com/1.avif","https://example.com/2.avif"]'
                    value={formState.imageUrls}
                    onChange={(event) => handleChange("imageUrls", event.target.value)}
                    required
                  />
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
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Vehicle name</p>
                    <p className="mt-2 text-sm text-foreground">{parsedQuick.name || "Not found"}</p>
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
                </div>

                <div className="space-y-2">
                  <Label htmlFor="quickImageUrls">Image URLs</Label>
                  <Input
                    id="quickVehicleImages"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/avif"
                    multiple
                    onChange={(event) => void handleImageUpload(event.target.files, "quick")}
                    disabled={isUploading}
                  />
                  <Textarea
                    id="quickImageUrls"
                    rows={3}
                    placeholder='["https://example.com/1.avif"]'
                    value={quickImageUrls}
                    onChange={(event) => setQuickImageUrls(event.target.value)}
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
