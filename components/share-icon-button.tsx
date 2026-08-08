"use client";

import { useState } from "react";
import { Share2, Check } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/** Simple icon-only share button — Web Share API when available, falling
 * back to copy-link. Distinct from ShareVehicleMenu (the WhatsApp-focused
 * pill + dropdown with copy message/download image) — that one stays as
 * the primary share affordance; this is a quick top-of-card action next
 * to the Edit menu, matching the vehicle-user app's card icon. */
export function ShareIconButton({ url, className }: { url: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  const share = async (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();

    if (navigator.share) {
      try {
        await navigator.share({ url });
        return;
      } catch {
        return;
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy link");
    }
  };

  return (
    <button
      type="button"
      onClick={share}
      aria-label="Share this listing"
      className={cn(
        "flex size-9 items-center justify-center rounded-full bg-background/95 text-foreground shadow-sm transition hover:bg-background active:scale-95",
        className
      )}
    >
      {copied ? <Check className="size-4 text-emerald-600" /> : <Share2 className="size-4" />}
    </button>
  );
}
