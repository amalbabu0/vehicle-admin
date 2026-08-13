import {
  LayoutDashboard,
  Users,
  Car,
  PlusCircle,
  BarChart3,
  ScrollText,
  Globe,
  Star,
  Settings,
  Trash2,
  type LucideIcon,
} from "lucide-react";

export type AdminNavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  description: string;
};

// "Listers" in the original spec turned out (per its own field list — vehicle
// image, brand, model, lister name, status) to mean "manage vehicle listings",
// not lister accounts — kept the label, routed it to /admin/listings for a
// clearer URL.
export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard, description: "Platform overview and key metrics" },
  { label: "Users", href: "/admin/users", icon: Users, description: "Manage public-site user accounts" },
  { label: "Listers", href: "/admin/listings", icon: Car, description: "Manage all vehicle listings" },
  { label: "Add Vehicle", href: "/admin/vehicles/add", icon: PlusCircle, description: "Create a new vehicle listing — Quick or Detailed" },
  { label: "Analytics", href: "/admin/analytics", icon: BarChart3, description: "Growth and listing analytics" },
  { label: "Activity Logs", href: "/admin/activity-logs", icon: ScrollText, description: "Audit trail of admin actions" },
  { label: "IP Logs", href: "/admin/ip-logs", icon: Globe, description: "Visitor IPs recorded on the public site" },
  { label: "Reviews", href: "/admin/reviews", icon: Star, description: "Moderate customer reviews" },
  { label: "Deleted Listings", href: "/admin/deleted-listings", icon: Trash2, description: "Recover or permanently delete listings within the 10-day window" },
  { label: "Settings", href: "/admin/settings", icon: Settings, description: "Site configuration" },
];
