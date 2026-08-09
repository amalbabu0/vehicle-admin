import Image from "next/image";

export function ListerFooter() {
  return (
    <footer className="border-t border-border px-4 py-4 text-center sm:px-6">
      <div className="relative mx-auto h-8 w-28 opacity-80">
        <Image src="/branding/logo-footer.webp" alt="Kerala Lease Hub" fill className="object-contain dark:hidden" />
        <Image src="/branding/logo-footer-dark.avif" alt="Kerala Lease Hub" fill className="hidden object-contain dark:block" />
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">© {new Date().getFullYear()} Kerala Lease Hub. All rights reserved.</p>
    </footer>
  );
}
