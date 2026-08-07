import {
  LayoutDashboard,
  Users,
  Car,
  BarChart3,
  ScrollText,
  Star,
  Settings,
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
  { label: "Analytics", href: "/admin/analytics", icon: BarChart3, description: "Growth and listing analytics" },
  { label: "Activity Logs", href: "/admin/activity-logs", icon: ScrollText, description: "Audit trail of admin actions" },
  { label: "Reviews", href: "/admin/reviews", icon: Star, description: "Moderate customer reviews" },
  { label: "Settings", href: "/admin/settings", icon: Settings, description: "Site configuration" },
];
