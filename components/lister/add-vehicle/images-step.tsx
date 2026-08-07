"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Camera, ChevronLeft, ChevronRight, Loader2, Star, X } from "lucide-react";
import type { WizardFormState } from "@/components/lister/add-vehicle/types";

export function ImagesStep({
  formState,
  onChange,
}: {
  formState: WizardFormState;
  onChange: <K extends keyof WizardFormState>(field: K, value: WizardFormState[K]) => void;
}) {
  const [uploadingCount, setUploadingCount] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const uploadFiles = async (files: FileList | File[]) => {
    const list = Array.from(files).filter((file) => file.type.startsWith("image/"));
    if (list.length === 0) return;
    setUploadingCount((count) => count + list.length);

    const uploaded: string[] = [];
    for (const file of list) {
      try {
        const body = new FormData();
        body.append("file", file);
        const response = await fetch("/api/uploads/vehicle-image", { method: "POST", body });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.message || "Unable to upload image.");
        uploaded.push(payload.url);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to upload image.");
      } finally {
        setUploadingCount((count) => count - 1);
      }
    }
    if (uploaded.length > 0) onChange("imageUrls", [...formState.imageUrls, ...uploaded]);
  };

  const removeImage = (index: number) => {
    onChange("imageUrls", formState.imageUrls.filter((_, i) => i !== index));
  };

  const moveImage = (index: number, direction: -1 | 1) => {
    const next = [...formState.imageUrls];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onChange("imageUrls", next);
  };

  return (
    <div className="space-y-4">
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragOver(false);
          void uploadFiles(event.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") inputRef.current?.click();
        }}
        className={`flex min-h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-6 text-center transition-colors ${
          isDragOver ? "border-primary bg-primary/5" : "border-border"
        }`}
      >
        <Camera className="size-8 text-muted-foreground" />
        <p className="text-sm font-medium">Tap to add photos</p>
        <p className="text-xs text-muted-foreground">Camera or gallery · multiple images · drag &amp; drop on desktop</p>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          multiple
          className="hidden"
          onChange={(event) => {
            if (event.target.files) void uploadFiles(event.target.files);
            event.target.value = "";
          }}
        />
      </div>

      {uploadingCount > 0 ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Uploading {uploadingCount} image{uploadingCount === 1 ? "" : "s"}…
        </p>
      ) : null}

      {formState.imageUrls.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {formState.imageUrls.map((url, index) => (
            <div key={url} className="group relative aspect-square overflow-hidden rounded-xl border border-border bg-muted">
              <Image src={url} alt={`Vehicle photo ${index + 1}`} fill sizes="200px" className="object-cover" />
              {index === 0 ? (
                <span className="absolute left-1.5 top-1.5 inline-flex items-center gap-1 rounded-full bg-background/90 px-2 py-0.5 text-[10px] font-medium">
                  <Star className="size-2.5 fill-current" /> Cover
                </span>
              ) : null}
              <button
                type="button"
                onClick={() => removeImage(index)}
                aria-label="Remove image"
                className="absolute right-1.5 top-1.5 flex size-6 items-center justify-center rounded-full bg-background/90 text-foreground"
              >
                <X className="size-3.5" />
              </button>
              <div className="absolute inset-x-1.5 bottom-1.5 flex justify-between">
                <button
                  type="button"
                  disabled={index === 0}
                  onClick={() => moveImage(index, -1)}
                  aria-label="Move earlier"
                  className="flex size-6 items-center justify-center rounded-full bg-background/90 text-foreground disabled:opacity-30"
                >
                  <ChevronLeft className="size-3.5" />
                </button>
                <button
                  type="button"
                  disabled={index === formState.imageUrls.length - 1}
                  onClick={() => moveImage(index, 1)}
                  aria-label="Move later"
                  className="flex size-6 items-center justify-center rounded-full bg-background/90 text-foreground disabled:opacity-30"
                >
                  <ChevronRight className="size-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {formState.imageUrls.length === 0 && uploadingCount === 0 ? (
        <p className="text-xs text-muted-foreground">Add at least one photo to continue.</p>
      ) : null}
    </div>
  );
}
