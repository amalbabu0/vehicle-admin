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
import { EMPTY_QUICK_LISTING_STATE, hasQuickListingData, type QuickListingState } from "@/components/lister/add-vehicle/quick-listing-types";

type ListingMode = "quick" | "detailed";

const MODE_LABEL: Record<ListingMode, string> = { quick: "Quick", detailed: "Detailed" };

// Add Vehicle defaults to Quick Listing (a pasted WhatsApp message + photos,
// parsed later by an agent that isn't connected yet) alongside the existing
// Detailed Listing wizard, which this file only wraps — it isn't modified
// beyond the optional onDirtyChange hook used below.
export function AddVehiclePage() {
  const [mode, setMode] = useState<ListingMode>("quick");
  const [pendingMode, setPendingMode] = useState<ListingMode | null>(null);
  const [quickState, setQuickState] = useState<QuickListingState>(EMPTY_QUICK_LISTING_STATE);
  const [detailedDirty, setDetailedDirty] = useState(false);
  const [detailedResetKey, setDetailedResetKey] = useState(0);

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
      // AddVehicleWizard owns its own internal state — remounting it via a
      // key change resets that state cleanly without reaching into it.
      setDetailedResetKey((key) => key + 1);
    }
    setMode(pendingMode);
    setPendingMode(null);
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
          <QuickListingForm state={quickState} onChange={setQuickState} />
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
