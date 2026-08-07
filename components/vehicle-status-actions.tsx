"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { Database } from "@/lib/supabase/database.types";

type VehicleStatus = Database["public"]["Tables"]["vehicles"]["Row"]["status"];

export function VehicleStatusActions({ id, status }: { id: string; status: VehicleStatus }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const updateStatus = (nextStatus: VehicleStatus) => {
    setError(null);
    startTransition(async () => {
      const response = await fetch(`/api/vehicles/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        setError(payload.message || "Unable to update status.");
        return;
      }
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col items-start gap-1">
      <div className="flex flex-wrap gap-2">
        {(status === "draft" || status === "rejected" || status === "archived") && (
          <Button size="sm" disabled={isPending} onClick={() => updateStatus("published")}>
            Publish
          </Button>
        )}
        {status === "published" && (
          <>
            <Button size="sm" variant="outline" disabled={isPending} onClick={() => updateStatus("archived")}>
              Archive
            </Button>
            <Button size="sm" variant="outline" disabled={isPending} onClick={() => updateStatus("sold")}>
              Mark sold
            </Button>
          </>
        )}
        {(status === "archived" || status === "sold") && (
          <Button size="sm" variant="outline" disabled={isPending} onClick={() => updateStatus("draft")}>
            Restore to draft
          </Button>
        )}
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
