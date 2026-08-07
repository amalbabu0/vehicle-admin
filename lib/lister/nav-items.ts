import { LayoutDashboard, Car, PlusCircle, type LucideIcon } from "lucide-react";

export type ListerNavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

// My Vehicles and Add Vehicle temporarily point at the existing shared
// /vehicles and /vehicles/add pages (also used by admins) until the
// mobile-first card list and wizard replace them — see the lister mobile
// rebuild's phased plan. Dashboard is the new lister-only home.
export const LISTER_NAV_ITEMS: ListerNavItem[] = [
  { label: "Dashboard", href: "/lister/dashboard", icon: LayoutDashboard },
  { label: "My Vehicles", href: "/vehicles", icon: Car },
  { label: "Add Vehicle", href: "/vehicles/add", icon: PlusCircle },
];
