"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Ban, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/** 30 days by default rather than permanent. Most addresses reaching this site
 * are dynamic — mobile carriers and home broadband reassign them — so an
 * indefinite block eventually stops affecting the abuser and starts silently
 * locking out whoever inherits the address. Permanent stays available for the
 * case it fits. */
const DURATIONS = [
  { value: "1d", label: "24 hours" },
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "permanent", label: "Permanent — until I unblock it" },
] as const;

/**
 * Blocking is confirmed behind a dialog; unblocking is not. The asymmetry is
 * intentional — blocking denies a real person access to the site and a misclick
 * on a dense table of near-identical addresses is easy, while unblocking only
 * restores the default and is trivially redone.
 */
export function BlockIpButton({
  ip,
  blocked,
  /** "Unblock" is wrong on a row that has already lapsed — there is nothing
   * left to lift, and the action just clears the record. The Blocked IPs page
   * passes "Remove" for those. */
  unblockLabel = "Unblock",
}: {
  ip: string;
  blocked: boolean;
  unblockLabel?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [reason, setReason] = useState("");
  const [duration, setDuration] = useState<string>("30d");
  const [open, setOpen] = useState(false);

  const send = async (method: "POST" | "DELETE", body: Record<string, string>) => {
    const response = await fetch("/api/admin/blocked-ips", {
      method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({ message: "Something went wrong." }));
      toast.error(payload.message ?? "Something went wrong.");
      return;
    }
    toast.success(method === "POST" ? `${ip} blocked.` : `${ip} unblocked.`);
    setOpen(false);
    setReason("");
    router.refresh();
  };

  if (blocked) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-1.5"
        disabled={isPending}
        onClick={() => startTransition(() => void send("DELETE", { ip }))}
      >
        <ShieldCheck className="size-3.5" /> {unblockLabel}
      </Button>
    );
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button type="button" variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-destructive">
          <Ban className="size-3.5" /> Block
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Block {ip}?</AlertDialogTitle>
          <AlertDialogDescription>
            Every request from this address gets a 403 — the public site becomes unreachable for whoever is behind
            it. Mobile and home connections often share an address between people, and many change hands within a
            day, so a block can catch more than the one visitor you meant. It takes up to a minute to take effect,
            and you can undo it here at any time.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-3">
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">Block for</span>
            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DURATIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>

          <Input
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Reason (optional) — e.g. scraping every listing"
            maxLength={200}
          />
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={isPending}
            onClick={(event) => {
              event.preventDefault();
              startTransition(() => void send("POST", { ip, reason, duration }));
            }}
          >
            Block this address
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
