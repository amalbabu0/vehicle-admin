import { Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  pending_approval: "Pending",
  published: "Published",
  rejected: "Rejected",
  archived: "Archived",
  sold: "Sold",
};

const STATUS_CLASSES: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  pending_approval: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  published: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  rejected: "bg-destructive/15 text-destructive",
  archived: "bg-muted text-muted-foreground",
  sold: "bg-muted text-muted-foreground",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge className={STATUS_CLASSES[status] ?? "bg-muted text-muted-foreground"}>
      {STATUS_LABELS[status] ?? status.replaceAll("_", " ")}
    </Badge>
  );
}

// Compact alternative to StatusBadge for tight layouts — published is green,
// draft is amber, everything else (pending approval, rejected, archived,
// sold) is red.
const STATUS_DOT_CLASSES: Record<string, string> = {
  published: "bg-emerald-500",
  draft: "bg-amber-500",
};

export function StatusDot({ status }: { status: string }) {
  return (
    <span
      role="img"
      aria-label={STATUS_LABELS[status] ?? status.replaceAll("_", " ")}
      className={cn("inline-block size-2 shrink-0 rounded-full", STATUS_DOT_CLASSES[status] ?? "bg-red-500")}
    />
  );
}

export function FeaturedBadge() {
  return (
    <Badge className="gap-1 bg-blue-500/15 text-blue-700 dark:text-blue-400">
      <Star className="size-3 fill-current" /> Featured
    </Badge>
  );
}
