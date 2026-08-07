import type { Metadata } from "next";
import { Settings } from "lucide-react";
import { ComingSoon } from "@/components/admin/coming-soon";

export const metadata: Metadata = { title: "Settings" };

export default function AdminSettingsPage() {
  return (
    <ComingSoon
      icon={Settings}
      title="Settings"
      description="Site configuration — general, SEO, social, security, storage."
      planned={[
        "General: site name, logo, favicon",
        "SEO: meta title/description, keywords, Open Graph",
        "Social: Facebook, Instagram, LinkedIn, YouTube",
        "Security: maintenance mode, sessions, admin permissions",
        "Storage: media & backup settings",
        "Backed by the existing site_settings table",
      ]}
    />
  );
}
