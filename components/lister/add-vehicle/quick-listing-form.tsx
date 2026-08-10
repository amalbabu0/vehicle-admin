"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Loader2, Plus, UploadCloud, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MAX_VEHICLE_IMAGES } from "@/components/lister/add-vehicle/constants";
import type { WizardImage } from "@/components/lister/add-vehicle/types";
import {
  type QuickListingExtraction,
  type QuickListingImage,
  type QuickListingState,
} from "@/components/lister/add-vehicle/quick-listing-types";

// Frontend-only validation — not a security boundary. The upload endpoint
// (app/api/uploads/vehicle-image) re-checks format and size server-side,
// and the strict vehicleCreateSchema still runs when the pre-filled wizard
// is finally submitted.
const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_FILE_BYTES = 10 * 1024 * 1024;

type QuickListingErrors = { message?: string; images?: string };

export function QuickListingForm({
  state,
  onChange,
  onExtracted,
}: {
  state: QuickListingState;
  onChange: (next: QuickListingState) => void;
  /** Hands the extracted fields + uploaded image URLs to the parent, which
   * pre-fills the Detailed Listing wizard with them. Quick Listing never
   * creates the listing itself — see app/api/lister/quick-listing/route.ts. */
  onExtracted: (extraction: QuickListingExtraction) => void;
}) {
  const [errors, setErrors] = useState<QuickListingErrors>({});
  const [isDragOver, setIsDragOver] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const remainingSlots = MAX_VEHICLE_IMAGES - state.images.length;

  const addFiles = (files: FileList | File[]) => {
    if (remainingSlots <= 0) {
      toast.error("Maximum number of images reached.");
      return;
    }

    const incoming = Array.from(files);
    const accepted: QuickListingImage[] = [];
    let hasInvalidType = false;
    let hasOversized = false;
    let truncated = false;

    for (const file of incoming) {
      if (accepted.length >= remainingSlots) {
        truncated = true;
        break;
      }
      if (!ACCEPTED_TYPES.has(file.type)) {
        hasInvalidType = true;
        continue;
      }
      if (file.size > MAX_FILE_BYTES) {
        hasOversized = true;
        continue;
      }
      accepted.push({ id: crypto.randomUUID(), file, previewUrl: URL.createObjectURL(file) });
    }

    if (hasInvalidType) toast.error("Please select a valid vehicle image.");
    if (hasOversized) toast.error("Images must be 10 MB or smaller.");
    if (truncated) {
      toast.error(`Only ${remainingSlots} more image${remainingSlots === 1 ? "" : "s"} can be added (${MAX_VEHICLE_IMAGES} max).`);
    }

    if (accepted.length > 0) {
      onChange({ ...state, images: [...state.images, ...accepted] });
      setErrors((prev) => ({ ...prev, images: undefined }));
    }
  };

  const removeImage = (id: string) => {
    const target = state.images.find((image) => image.id === id);
    if (target) URL.revokeObjectURL(target.previewUrl);
    onChange({ ...state, images: state.images.filter((image) => image.id !== id) });
  };

  /** Uploads through the same endpoint the Detailed Listing wizard uses, one
   * request per file so a single failure doesn't lose the rest of the batch.
   * Images never go to the extraction endpoint — only their resulting URLs
   * are carried forward. */
  const uploadImages = async (): Promise<WizardImage[] | null> => {
    const uploaded: WizardImage[] = [];
    for (const image of state.images) {
      try {
        const body = new FormData();
        body.append("file", image.file);
        const response = await fetch("/api/uploads/vehicle-image", { method: "POST", body });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.message || "Unable to upload image.");
        uploaded.push({ url: payload.url, mediumUrl: payload.mediumUrl, thumbnailUrl: payload.thumbnailUrl });
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to upload image.");
        return null;
      }
    }
    return uploaded;
  };

  const handleSubmit = async () => {
    const trimmedMessage = state.message.trim();
    const nextErrors: QuickListingErrors = {};
    if (!trimmedMessage) nextErrors.message = "Please paste the WhatsApp vehicle details.";
    if (state.images.length === 0) nextErrors.images = "Please upload at least one vehicle image.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setIsSubmitting(true);
    try {
      const imageUrls = await uploadImages();
      if (!imageUrls) return;

      const response = await fetch("/api/lister/quick-listing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: state.message }),
      });
      const payload = await response.json();
      if (!response.ok) {
        toast.error(payload.message || "Couldn't read the vehicle details from that message.");
        return;
      }

      onExtracted({ fields: payload.fields, unresolved: payload.unresolved ?? [], imageUrls });
    } catch {
      toast.error("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="quick-listing-message">Vehicle Details</Label>
        <p className="text-xs text-muted-foreground">Paste the complete WhatsApp message containing the vehicle details.</p>
        <Textarea
          id="quick-listing-message"
          value={state.message}
          onChange={(event) => {
            onChange({ ...state, message: event.target.value });
            if (errors.message) setErrors((prev) => ({ ...prev, message: undefined }));
          }}
          placeholder="Paste WhatsApp vehicle details here..."
          rows={10}
          className="min-h-48 resize-y text-base"
          aria-invalid={Boolean(errors.message)}
          aria-describedby={errors.message ? "quick-listing-message-error" : undefined}
        />
        <div className="flex items-center justify-between gap-2">
          {errors.message ? (
            <p id="quick-listing-message-error" className="text-xs text-destructive">
              {errors.message}
            </p>
          ) : (
            <span />
          )}
          <p className="shrink-0 text-xs text-muted-foreground">{state.message.length.toLocaleString("en-IN")} characters</p>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="quick-listing-images">Vehicle Images</Label>
        <p className="text-xs text-muted-foreground">Upload one or more images of the vehicle.</p>

        <div
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={(event) => {
            event.preventDefault();
            setIsDragOver(false);
            addFiles(event.dataTransfer.files);
          }}
          onClick={() => inputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              inputRef.current?.click();
            }
          }}
          className={`flex min-h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-6 text-center transition-colors ${
            isDragOver ? "border-primary bg-primary/5" : "border-border"
          }`}
        >
          <UploadCloud className="size-8 text-muted-foreground" />
          <p className="text-sm font-medium">Drag &amp; drop vehicle images, or tap to add</p>
          <p className="text-xs text-muted-foreground">JPG, PNG, or WEBP · up to {MAX_VEHICLE_IMAGES} images · 10 MB each</p>
          <input
            id="quick-listing-images"
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="hidden"
            aria-label="Add vehicle images"
            onChange={(event) => {
              if (event.target.files) addFiles(event.target.files);
              event.target.value = "";
            }}
          />
        </div>

        {errors.images ? <p className="text-xs text-destructive">{errors.images}</p> : null}

        {state.images.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {state.images.map((image) => (
              <div key={image.id} className="group relative aspect-square overflow-hidden rounded-xl border border-border bg-muted">
                <Image src={image.previewUrl} alt="Selected vehicle photo" fill sizes="200px" className="object-cover" unoptimized />
                <button
                  type="button"
                  onClick={() => removeImage(image.id)}
                  aria-label="Remove vehicle image"
                  className="absolute right-1.5 top-1.5 flex size-6 items-center justify-center rounded-full bg-background/90 text-foreground"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            ))}
            {remainingSlots > 0 ? (
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                aria-label="Add more vehicle images"
                className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary"
              >
                <Plus className="size-5" />
                <span className="text-xs font-medium">Add Images</span>
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      <Button type="button" className="min-h-13 w-full gap-2" onClick={handleSubmit} disabled={isSubmitting}>
        {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
        {isSubmitting ? "Reading details…" : "Create Listing"}
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        We&apos;ll read the details from your message and fill in the form for you to check before publishing.
      </p>
    </div>
  );
}
