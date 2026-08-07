import Image from "next/image";

export function ListerFooter() {
  return (
    <footer className="border-t border-border px-4 py-4 text-center sm:px-6">
      <Image src="/branding/logo-footer.webp" alt="Kerala Lease Hub" width={140} height={39} className="mx-auto h-auto w-28 opacity-80" />
      <p className="mt-2 text-[11px] text-muted-foreground">© {new Date().getFullYear()} Kerala Lease Hub. All rights reserved.</p>
    </footer>
  );
}
