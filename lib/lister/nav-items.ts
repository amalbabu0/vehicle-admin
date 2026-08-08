import { LayoutDashboard, Car, PlusCircle, Trash2, type LucideIcon } from "lucide-react";

export type ListerNavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

export const LISTER_NAV_ITEMS: ListerNavItem[] = [
  { label: "Dashboard", href: "/lister/dashboard", icon: LayoutDashboard },
  { label: "My Vehicles", href: "/lister/vehicles", icon: Car },
  { label: "Add Vehicle", href: "/lister/vehicles/add", icon: PlusCircle },
  { label: "Deleted Listings", href: "/lister/deleted-listings", icon: Trash2 },
];
