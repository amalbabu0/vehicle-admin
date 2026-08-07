"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export function MaintenanceModeToggle({ initialEnabled }: { initialEnabled: boolean }) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [isPending, startTransition] = useTransition();

  const toggle = (next: boolean) => {
    setEnabled(next);
    startTransition(async () => {
      const response = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "maintenance_mode", value: next }),
      });
      const payload = await response.json();
      if (!response.ok) {
        toast.error(payload.message || "Could not update maintenance mode.");
        setEnabled(!next);
        return;
      }
      toast.success(next ? "Maintenance mode enabled." : "Maintenance mode disabled.");
    });
  };

  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-border/60 p-4">
      <div>
        <Label htmlFor="maintenance-mode" className="text-sm font-medium">
          Maintenance mode
        </Label>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Saves to the existing maintenance_mode row in site_settings. The public site doesn&apos;t check this flag yet — showing a maintenance
          page for it is a separate change to that app.
        </p>
      </div>
      <Switch id="maintenance-mode" checked={enabled} onCheckedChange={toggle} disabled={isPending} />
    </div>
  );
}
