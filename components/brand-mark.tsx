import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * The real Kerala Lease Hub shield, used wherever the shells previously
 * showed a generic lucide `Car` glyph — a stock car icon reads as "vehicle",
 * not as "this product", so the admin never actually showed its own brand.
 *
 * Theme swap happens in CSS (`dark:hidden` / `hidden dark:block`) rather than
 * `useTheme()`, so the correct mark is in the server-rendered HTML and there's
 * no flash of the wrong artwork before hydration.
 */
export function BrandMark({ className }: { className?: string }) {
  const shared = cn("size-11 shrink-0 object-contain", className);
  return (
    <>
      <Image src="/branding/logo-light.webp" alt="" width={44} height={44} className={cn(shared, "dark:hidden")} priority />
      <Image src="/branding/logo-dark.webp" alt="" width={44} height={44} className={cn(shared, "hidden dark:block")} priority />
    </>
  );
}
