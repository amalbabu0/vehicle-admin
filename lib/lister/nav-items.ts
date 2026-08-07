import { LayoutDashboard, Car, PlusCircle, type LucideIcon } from "lucide-react";

export type ListerNavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

// Add Vehicle still temporarily points at the existing shared
// /vehicles/add page (also used by admins) until the mobile-first wizard
// replaces it — see the lister mobile rebuild's phased plan. Dashboard and
// My Vehicles are the new lister-only pages.
export const LISTER_NAV_ITEMS: ListerNavItem[] = [
  { label: "Dashboard", href: "/lister/dashboard", icon: LayoutDashboard },
  { label: "My Vehicles", href: "/lister/vehicles", icon: Car },
  { label: "Add Vehicle", href: "/vehicles/add", icon: PlusCircle },
];
