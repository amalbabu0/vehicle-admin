"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ChevronDown, Copy, Download, Share2, MessageSquareText } from "lucide-react";
import { WhatsAppIcon } from "@/components/icons/whatsapp-icon";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { buildWhatsAppShareUrl } from "@/lib/vehicles/share";
import { cn } from "@/lib/utils";

export function ShareVehicleMenu({
  message,
  url,
  imageUrl,
  fileName,
  size = "default",
}: {
  message: string;
  url: string;
  imageUrl: string | null;
  fileName: string;
  /** "lg" is opt-in for callers that want a bigger touch target — default
   * keeps every existing usage (admin's own vehicle pages) pixel-identical. */
  size?: "default" | "lg";
}) {
  const isLarge = size === "lg";
  const [isDownloading, setIsDownloading] = useState(false);

  const shareOnWhatsApp = () => {
    window.open(buildWhatsAppShareUrl(message), "_blank", "noopener,noreferrer");
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(url);
    toast.success("Vehicle link copied.");
  };

  const copyMessage = async () => {
    await navigator.clipboard.writeText(message);
    toast.success("Share message copied.");
  };

  const downloadImage = async () => {
    if (!imageUrl) {
      toast.error("This vehicle has no image to download.");
      return;
    }
    setIsDownloading(true);
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
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
        const response = await fetch(imageUrl);
        const blob = await response.blob();
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
    <div className="inline-flex items-stretch overflow-hidden rounded-full border border-[#25D366]/30 bg-[#25D366]/10 backdrop-blur-sm">
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={shareOnWhatsApp}
            aria-label="Share on WhatsApp"
            className={cn(
              "flex items-center gap-1.5 font-medium text-[#25D366] transition hover:bg-[#25D366]/15",
              isLarge ? "px-4 py-2.5 text-base" : "px-3 py-1.5 text-sm"
            )}
          >
            <WhatsAppIcon className={isLarge ? "size-5" : "size-4"} />
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
            className={cn(
              "flex items-center border-l border-[#25D366]/30 text-[#25D366] transition hover:bg-[#25D366]/15",
              isLarge ? "px-2.5" : "px-1.5"
            )}
          >
            <ChevronDown className={isLarge ? "size-4" : "size-3.5"} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={nativeShare}>
            <Share2 className="size-4" /> Native share
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={copyLink}>
            <Copy className="size-4" /> Copy link
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={copyMessage}>
            <MessageSquareText className="size-4" /> Copy message
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={downloadImage} disabled={isDownloading || !imageUrl}>
            <Download className="size-4" /> {isDownloading ? "Downloading…" : "Download image"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
