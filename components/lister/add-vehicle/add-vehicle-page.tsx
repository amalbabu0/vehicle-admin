"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ListChecks, Zap } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AddVehicleWizard } from "@/components/lister/add-vehicle/add-vehicle-wizard";
import { QuickListingForm } from "@/components/lister/add-vehicle/quick-listing-form";
import { EMPTY_WIZARD_STATE, type WizardFormState } from "@/components/lister/add-vehicle/types";
import {
  EMPTY_QUICK_LISTING_STATE,
  hasQuickListingData,
  type QuickListingExtraction,
  type QuickListingState,
} from "@/components/lister/add-vehicle/quick-listing-types";
import { FUEL_TYPES, TRANSMISSIONS } from "@/lib/validators/vehicle";

type ListingMode = "quick" | "detailed";

const MODE_LABEL: Record<ListingMode, string> = { quick: "Quick", detailed: "Detailed" };

/** Field name -> the label the lister actually sees in the wizard, for the
 * "still needs your attention" notice. */
const FIELD_LABELS: Record<string, string> = {
  brand: "Brand",
  model: "Model",
  year: "Registration year",
  leaseAmount: "Lease amount",
  leasePeriod: "Lease period",
  contactPhone: "Contact number",
  locationId: "Location",
  fuelType: "Fuel type",
  transmission: "Transmission",
};

/** The extractor's enums are validated server-side, but this is client code
 * receiving JSON — re-check rather than trusting the shape, so a bad value
 * lands as "not detected" instead of an invalid option in the combobox. */
function asEnum<T extends readonly string[]>(allowed: T, value: string | null | undefined): string {
  return value && (allowed as readonly string[]).includes(value) ? value : "";
}

function toWizardState(extraction: QuickListingExtraction): WizardFormState {
  const { fields, imageUrls } = extraction;
  return {
    ...EMPTY_WIZARD_STATE,
    brand: fields.brand ?? "",
    model: fields.model ?? "",
    year: fields.year ?? "",
    contactPhone: fields.contactPhone ?? "",
    // The wizard's own default is "true"; only an explicit false flips it.
    directOwner: fields.directOwner === false ? "false" : "true",
    fuelType: asEnum(FUEL_TYPES, fields.fuelType),
    transmission: asEnum(TRANSMISSIONS, fields.transmission),
    engineCapacity: fields.engineCapacity ?? "",
    condition: fields.condition ?? "",
    features: fields.features ?? "",
    description: fields.description ?? "",
    leaseAmount: fields.leaseAmount ?? "",
    leasePeriod: fields.leasePeriod ?? "",
    serviceChargePercent: fields.serviceChargePercent != null ? String(fields.serviceChargePercent) : "",
    locationId: fields.locationId ?? "",
    imageUrls,
  };
}

// Add Vehicle defaults to Quick Listing (paste a WhatsApp message + photos,
// fields extracted by lib/ai/extract-vehicle.ts) alongside the existing
// Detailed Listing wizard. Quick Listing never writes a listing itself — it
// pre-fills this same wizard, which still submits through the one validated
// POST /api/vehicles path.
export function AddVehiclePage() {
  const [mode, setMode] = useState<ListingMode>("quick");
  const [pendingMode, setPendingMode] = useState<ListingMode | null>(null);
  const [quickState, setQuickState] = useState<QuickListingState>(EMPTY_QUICK_LISTING_STATE);
  const [detailedDirty, setDetailedDirty] = useState(false);
  const [detailedResetKey, setDetailedResetKey] = useState(0);
  const [prefill, setPrefill] = useState<WizardFormState | undefined>(undefined);

  const currentHasUnsavedData = mode === "quick" ? hasQuickListingData(quickState) : detailedDirty;

  const requestModeChange = (next: string) => {
    if (next === mode) return;
    if (currentHasUnsavedData) {
      setPendingMode(next as ListingMode);
    } else {
      setMode(next as ListingMode);
    }
  };

  const confirmSwitch = () => {
    if (!pendingMode) return;
    if (mode === "quick") {
      quickState.images.forEach((image) => URL.revokeObjectURL(image.previewUrl));
      setQuickState(EMPTY_QUICK_LISTING_STATE);
    } else {
      setDetailedDirty(false);
      setPrefill(undefined);
      // AddVehicleWizard owns its own internal state — remounting it via a
      // key change resets that state cleanly without reaching into it.
      setDetailedResetKey((key) => key + 1);
    }
    setMode(pendingMode);
    setPendingMode(null);
  };

  const handleExtracted = (extraction: QuickListingExtraction) => {
    quickState.images.forEach((image) => URL.revokeObjectURL(image.previewUrl));
    setQuickState(EMPTY_QUICK_LISTING_STATE);
    setPrefill(toWizardState(extraction));
    // Bump the key so the wizard remounts and picks up the new initialState
    // (it reads initialState on mount only).
    setDetailedResetKey((key) => key + 1);
    setMode("detailed");

    const missing = extraction.unresolved.map((field) => FIELD_LABELS[field] ?? field);
    if (missing.length > 0) {
      toast.warning(`Check these before publishing: ${missing.join(", ")}.`);
    } else {
      toast.success("Details filled in — review them before publishing.");
    }
  };

  return (
    <div className="space-y-5">
      <Tabs value={mode} onValueChange={requestModeChange}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="quick" className="gap-1.5">
            <Zap className="size-4" /> Quick Listing
          </TabsTrigger>
          <TabsTrigger value="detailed" className="gap-1.5">
            <ListChecks className="size-4" /> Detailed Listing
          </TabsTrigger>
        </TabsList>

        <TabsContent value="quick" className="mt-4">
          <QuickListingForm state={quickState} onChange={setQuickState} onExtracted={handleExtracted} />
        </TabsContent>
        <TabsContent value="detailed" className="mt-4">
          <AddVehicleWizard key={detailedResetKey} initialState={prefill} onDirtyChange={setDetailedDirty} />
        </TabsContent>
      </Tabs>

      <AlertDialog open={pendingMode !== null} onOpenChange={(open) => { if (!open) setPendingMode(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Switch listing method?</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved {MODE_LABEL[mode]} Listing data. Are you sure you want to switch?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmSwitch}>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
