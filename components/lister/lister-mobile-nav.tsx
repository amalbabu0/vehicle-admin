"use client";

import { useState } from "react";
import { Car, Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ListerNavList } from "@/components/lister/lister-nav-list";

// Sheet is a Radix Dialog under the hood, which already gives us
// tap-outside-to-close and Escape-to-close for free; onOpenChange closes it
// on navigation too, matching the "tap outside to close" / minimal-taps
// requirement without any extra gesture code.
export function ListerMobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button type="button" variant="outline" size="icon" className="size-11 lg:hidden" aria-label="Open menu">
          <Menu className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 p-0">
        <SheetTitle className="flex items-center gap-2 border-b border-border px-4 py-4">
          <Car className="size-5 text-primary" /> Kerala Lease Hub
        </SheetTitle>
        <div className="p-3">
          <ListerNavList onNavigate={() => setOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
