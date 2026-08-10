"use client";

import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Dark mode scoped to the /admin section only — deliberately not using
 * next-themes' ThemeProvider on <html>, which would also apply to the
 * shared root layout (and therefore the lister-facing pages that share it).
 * Tailwind's dark: variant here is `&:is(.dark *)` (see globals.css), which
 * only requires *some* ancestor with the .dark class — it doesn't have to
 * be <html> — so toggling it on the admin shell's own wrapper div keeps
 * this fully isolated from everything outside /admin.
 */
export function AdminThemeToggle({ dark, onToggle }: { dark: boolean; onToggle: () => void }) {
  return (
    <Button type="button" variant="outline" size="icon" className="rounded-full" aria-label="Toggle dark mode" onClick={onToggle}>
      {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </Button>
  );
}
