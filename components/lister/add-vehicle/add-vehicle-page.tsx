"use client";

import { useState } from "react";
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
import { QuickListingReview } from "@/components/lister/add-vehicle/quick-listing-review";
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
    categoryId: fields.categoryId ?? "",
    imageUrls,
  };
}

/**
 * Add Vehicle offers two independent paths:
 *
 *   Quick    — paste a WhatsApp message + photos, fields extracted by
 *              lib/ai/extract-vehicle.ts, then a single-page final review
 *              with Submit at the bottom. Fields the message didn't mention
 *              stay blank and are saved as null.
 *   Detailed — the original step-by-step wizard, untouched.
 *
 * The two never feed into each other — Quick Listing finishes in its own
 * review screen and its own create endpoint, so the Detailed flow behaves
 * exactly as it always has.
 */
export function AddVehiclePage() {
  const [mode, setMode] = useState<ListingMode>("quick");
  const [pendingMode, setPendingMode] = useState<ListingMode | null>(null);
  const [quickState, setQuickState] = useState<QuickListingState>(EMPTY_QUICK_LISTING_STATE);
  /** Set once extraction succeeds — its presence is what swaps the Quick tab
   * from the paste form to the review screen. */
  const [quickReview, setQuickReview] = useState<WizardFormState | null>(null);
  const [detailedDirty, setDetailedDirty] = useState(false);
  const [detailedResetKey, setDetailedResetKey] = useState(0);

  const quickHasData = hasQuickListingData(quickState) || quickReview !== null;
  const currentHasUnsavedData = mode === "quick" ? quickHasData : detailedDirty;

  const resetQuick = () => {
    quickState.images.forEach((image) => URL.revokeObjectURL(image.previewUrl));
    setQuickState(EMPTY_QUICK_LISTING_STATE);
    setQuickReview(null);
  };

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
      resetQuick();
    } else {
      setDetailedDirty(false);
      // AddVehicleWizard owns its own internal state — remounting it via a
      // key change resets that state cleanly without reaching into it.
      setDetailedResetKey((key) => key + 1);
    }
    setMode(pendingMode);
    setPendingMode(null);
  };

  const handleExtracted = (extraction: QuickListingExtraction) => {
    // The uploaded copies live on R2 now and are carried in imageUrls, so
    // the local object URLs behind the paste form's thumbnails can go.
    quickState.images.forEach((image) => URL.revokeObjectURL(image.previewUrl));
    setQuickState(EMPTY_QUICK_LISTING_STATE);
    setQuickReview(toWizardState(extraction));
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
          {quickReview ? (
            <QuickListingReview initialState={quickReview} onStartOver={resetQuick} />
          ) : (
            <QuickListingForm state={quickState} onChange={setQuickState} onExtracted={handleExtracted} />
          )}
        </TabsContent>
        <TabsContent value="detailed" className="mt-4">
          <AddVehicleWizard key={detailedResetKey} onDirtyChange={setDetailedDirty} />
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
