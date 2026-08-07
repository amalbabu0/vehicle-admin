import { Badge } from "@/components/ui/badge";

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  pending_approval: "Pending",
  published: "Approved",
  rejected: "Rejected",
};

const STATUS_CLASSES: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  pending_approval: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  published: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  rejected: "bg-destructive/15 text-destructive",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge className={STATUS_CLASSES[status] ?? "bg-muted text-muted-foreground"}>
      {STATUS_LABELS[status] ?? status.replaceAll("_", " ")}
    </Badge>
  );
}
