"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ChevronDown, ClipboardCopy, Copy, Download, Share2 } from "lucide-react";
import { WhatsAppIcon } from "@/components/icons/whatsapp-icon";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { buildWhatsAppShareUrl } from "@/lib/vehicles/share";

/** Turns the fetched blob into a grayscale copy with an "ALREADY BOOKED"
 * banner stamped across it — used for every image that actually leaves the
 * app (native share attachment, downloaded file), so a booked vehicle can
 * never be shared or saved looking like it's still available. The source
 * blob is loaded into the canvas via a blob: object URL (not the original
 * remote URL), which keeps the canvas untainted regardless of the CDN's
 * CORS headers — we already have the bytes from the fetch() below. */
async function stampBookedImage(blob: Blob): Promise<Blob> {
  const objectUrl = URL.createObjectURL(blob);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new window.Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Failed to load image."));
      el.src = objectUrl;
    });

    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth || 1;
    canvas.height = img.naturalHeight || 1;
    const ctx = canvas.getContext("2d");
    if (!ctx) return blob;

    ctx.filter = "grayscale(1)";
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    ctx.filter = "none";

    const bannerHeight = Math.max(Math.round(canvas.height * 0.12), 32);
    const bannerY = Math.round((canvas.height - bannerHeight) / 2);
    ctx.fillStyle = "rgba(220, 38, 38, 0.92)";
    ctx.fillRect(0, bannerY, canvas.width, bannerHeight);
    ctx.fillStyle = "#ffffff";
    ctx.font = `700 ${Math.round(bannerHeight * 0.5)}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("ALREADY BOOKED", canvas.width / 2, bannerY + bannerHeight / 2 + 1);

    const stamped = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
    return stamped ?? blob;
  } catch {
    // Any failure (decode error, tainted canvas, etc.) falls back to the
    // original image rather than blocking the share/download entirely.
    return blob;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function fetchShareableBlob(imageUrl: string, isBooked: boolean): Promise<Blob> {
  const response = await fetch(imageUrl);
  const blob = await response.blob();
  return isBooked ? stampBookedImage(blob) : blob;
}

export function ShareVehicleMenu({
  message,
  url,
  imageUrl,
  fileName,
  isBooked = false,
}: {
  message: string;
  url: string;
  imageUrl: string | null;
  fileName: string;
  /** When true, any image that's actually shared or downloaded (native
   * share, download) is grayscaled with an "ALREADY BOOKED" banner first —
   * see stampBookedImage. The plain WhatsApp/copy actions carry no image;
   * their honesty comes from `message` already being built with the booked
   * framing upstream (see lib/vehicles/share.ts). */
  isBooked?: boolean;
}) {
  const [isDownloading, setIsDownloading] = useState(false);

  const shareOnWhatsApp = () => {
    window.open(buildWhatsAppShareUrl(message), "_blank", "noopener,noreferrer");
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(url);
    toast.success("Vehicle link copied.");
  };

  /** Surfaced as its own button rather than only a dropdown item: pasting the
   * message by hand is the only way to post into a WhatsApp community or
   * group, since no deep link can target one. Failure is worth a toast here —
   * clipboard writes are blocked outright in some in-app browsers, and a
   * silent no-op would look like the button did nothing. */
  const copyMessage = async () => {
    try {
      await navigator.clipboard.writeText(message);
      toast.success("Message copied — paste it into WhatsApp.");
    } catch {
      toast.error("Couldn't copy. Select the text manually, or try another browser.");
    }
  };

  const downloadImage = async () => {
    if (!imageUrl) {
      toast.error("This vehicle has no image to download.");
      return;
    }
    setIsDownloading(true);
    try {
      const blob = await fetchShareableBlob(imageUrl, isBooked);
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = `${fileName}.jpg`;
      link.click();
      URL.revokeObjectURL(objectUrl);
    } catch {
      // Cross-origin fetch can fail depending on CDN CORS config — opening
      // the image directly still lets the admin save it manually.
      window.open(imageUrl, "_blank", "noopener,noreferrer");
    } finally {
      setIsDownloading(false);
    }
  };

  const nativeShare = async () => {
    const shareData: ShareData = { title: message.split("\n")[0], text: message, url };
    try {
      if (imageUrl && navigator.canShare) {
        const blob = await fetchShareableBlob(imageUrl, isBooked);
        const file = new File([blob], `${fileName}.jpg`, { type: blob.type || "image/jpeg" });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ ...shareData, files: [file] });
          return;
        }
      }
      if (navigator.share) {
        await navigator.share(shareData);
        return;
      }
      toast.error("Native sharing isn't supported in this browser.");
    } catch (error) {
      if ((error as Error).name !== "AbortError") toast.error("Unable to share.");
    }
  };

  return (
    <div className="inline-flex items-center gap-2">
      <div className="inline-flex items-stretch overflow-hidden rounded-full border border-[#25D366]/30 bg-[#25D366]/10 backdrop-blur-sm">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={shareOnWhatsApp}
              aria-label="Share on WhatsApp"
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-[#25D366] transition hover:bg-[#25D366]/15"
            >
              <WhatsAppIcon className="size-4" />
              <span className="hidden sm:inline">Share</span>
            </button>
          </TooltipTrigger>
          <TooltipContent>Share on WhatsApp</TooltipContent>
        </Tooltip>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="More share options"
              className="flex items-center border-l border-[#25D366]/30 px-1.5 text-[#25D366] transition hover:bg-[#25D366]/15"
            >
              <ChevronDown className="size-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={nativeShare}>
              <Share2 className="size-4" /> Native share
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={copyLink}>
              <Copy className="size-4" /> Copy link
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={downloadImage} disabled={isDownloading || !imageUrl}>
              <Download className="size-4" /> {isDownloading ? "Downloading…" : "Download image"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Neutral rather than WhatsApp green, and outside the pill: the clipboard
          is destination-agnostic — the message can be pasted anywhere, not just
          WhatsApp — so it shouldn't read as part of the WhatsApp control.
          Themed tokens, not a literal white, since /admin toggles a scoped
          .dark and a hardcoded white would disappear against it. */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={copyMessage}
            aria-label="Copy the share message"
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/80 px-3 py-1.5 text-sm font-medium text-muted-foreground backdrop-blur-sm transition hover:bg-muted hover:text-foreground"
          >
            <ClipboardCopy className="size-4" />
            <span className="hidden sm:inline">Copy</span>
          </button>
        </TooltipTrigger>
        <TooltipContent>Copy the message to paste into a community or group</TooltipContent>
      </Tooltip>
    </div>
  );
}
