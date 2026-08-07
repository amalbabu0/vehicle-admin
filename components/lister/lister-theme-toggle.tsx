"use client";

import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Dark mode scoped to the /lister section only — same reasoning as
 * components/admin/admin-theme-toggle.tsx: not using next-themes'
 * ThemeProvider on <html> (which would also apply to the shared root
 * layout and the classic /vehicles pages admins still use), just toggling
 * .dark on the lister shell's own wrapper div. Tailwind's dark: variant
 * only needs *some* ancestor with .dark, so this stays fully isolated.
 */
export function ListerThemeToggle({ dark, onToggle }: { dark: boolean; onToggle: () => void }) {
  return (
    <Button type="button" variant="ghost" size="icon" className="size-11" aria-label="Toggle dark mode" onClick={onToggle}>
      {dark ? <Sun className="size-5" /> : <Moon className="size-5" />}
    </Button>
  );
}
