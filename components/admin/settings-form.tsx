"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Save } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import type { SettingsKey } from "@/lib/admin/settings-data";

export type SettingsField = { name: string; label: string; placeholder?: string; multiline?: boolean };

export function SettingsForm({
  settingsKey,
  fields,
  initialValues,
}: {
  settingsKey: SettingsKey;
  fields: SettingsField[];
  initialValues: Record<string, string>;
}) {
  const [values, setValues] = useState(initialValues);
  const [isPending, startTransition] = useTransition();

  const save = () => {
    startTransition(async () => {
      const response = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: settingsKey, value: values }),
      });
      const payload = await response.json();
      if (!response.ok) {
        toast.error(payload.message || "Could not save settings.");
        return;
      }
      toast.success(payload.message);
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        {fields.map((field) => (
          <div key={field.name} className={field.multiline ? "sm:col-span-2 space-y-1.5" : "space-y-1.5"}>
            <Label htmlFor={`${settingsKey}-${field.name}`}>{field.label}</Label>
            {field.multiline ? (
              <Textarea
                id={`${settingsKey}-${field.name}`}
                value={values[field.name] ?? ""}
                placeholder={field.placeholder}
                rows={3}
                onChange={(event) => setValues((prev) => ({ ...prev, [field.name]: event.target.value }))}
              />
            ) : (
              <Input
                id={`${settingsKey}-${field.name}`}
                value={values[field.name] ?? ""}
                placeholder={field.placeholder}
                onChange={(event) => setValues((prev) => ({ ...prev, [field.name]: event.target.value }))}
              />
            )}
          </div>
        ))}
      </div>
      <Button type="button" onClick={save} disabled={isPending} className="gap-2">
        <Save className="size-4" /> Save changes
      </Button>
    </div>
  );
}
