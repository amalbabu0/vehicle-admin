import type { LucideIcon } from "lucide-react";

export function ComingSoon({ icon: Icon, title, description, planned }: { icon: LucideIcon; title: string; description: string; planned: string[] }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>

      <div className="glass-surface flex flex-col items-center gap-4 rounded-(--glass-radius-lg) p-10 text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Icon className="size-6" />
        </div>
        <div>
          <p className="text-sm font-medium">This module is being built next</p>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            The admin shell, navigation, and Dashboard are live. This section lands in the next build pass.
          </p>
        </div>
        <ul className="mt-2 grid gap-1.5 text-left text-xs text-muted-foreground sm:grid-cols-2">
          {planned.map((item) => (
            <li key={item} className="flex items-center gap-2">
              <span className="size-1 shrink-0 rounded-full bg-muted-foreground" /> {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
