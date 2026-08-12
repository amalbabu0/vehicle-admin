import Image from "next/image";

export function ListerFooter() {
  return (
    <footer className="border-t border-border px-4 py-4 text-center sm:px-6">
      {/* width/height rather than `fill` — `fill` without `sizes` makes
          next/image assume 100vw and fetch a 1920px asset for this slot. */}
      <div className="mx-auto w-fit opacity-80">
        <Image src="/branding/KLB_white.webp" alt="Kerala Lease Hub" width={103} height={56} className="h-14 w-auto object-contain dark:hidden" />
        <Image src="/branding/KLB_black.webp" alt="Kerala Lease Hub" width={101} height={56} className="hidden h-14 w-auto object-contain dark:block" />
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">© {new Date().getFullYear()} Kerala Lease Hub. All rights reserved.</p>
    </footer>
  );
}
