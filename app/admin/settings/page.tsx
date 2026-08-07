import type { Metadata } from "next";
import { getAllSettings, getAdminAccounts } from "@/lib/admin/settings-data";
import { requireAdmin } from "@/lib/auth/dal";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SettingsForm } from "@/components/admin/settings-form";
import { MaintenanceModeToggle } from "@/components/admin/maintenance-mode-toggle";
import { AdminRolesTable } from "@/components/admin/admin-roles-table";

export const metadata: Metadata = { title: "Settings" };
export const revalidate = 0;

export default async function AdminSettingsPage() {
  const [settings, accounts, profile] = await Promise.all([getAllSettings(), getAdminAccounts(), requireAdmin()]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Site configuration, backed by the existing site_settings table.</p>
      </div>

      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="seo">SEO</TabsTrigger>
          <TabsTrigger value="social">Social</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="storage">Storage</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <div className="glass-surface rounded-(--glass-radius-lg) p-5">
            <h3 className="text-sm font-semibold">General</h3>
            <p className="mt-1 text-sm text-muted-foreground">Site name, logo, and favicon.</p>
            <div className="mt-4">
              <SettingsForm
                settingsKey="general_settings"
                fields={[
                  { name: "siteName", label: "Website name", placeholder: "Kerala Lease Hub" },
                  { name: "logoUrl", label: "Logo URL", placeholder: "https://…" },
                  { name: "faviconUrl", label: "Favicon URL", placeholder: "https://…" },
                ]}
                initialValues={settings.general}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="seo">
          <div className="glass-surface rounded-(--glass-radius-lg) p-5">
            <h3 className="text-sm font-semibold">SEO</h3>
            <p className="mt-1 text-sm text-muted-foreground">Meta title, description, keywords, and Open Graph image.</p>
            <div className="mt-4">
              <SettingsForm
                settingsKey="seo_settings"
                fields={[
                  { name: "metaTitle", label: "Meta title", placeholder: "Lease bikes & cars in Kerala" },
                  { name: "metaDescription", label: "Meta description", multiline: true },
                  { name: "keywords", label: "Keywords (comma separated)", placeholder: "bike lease, car lease, Kerala" },
                  { name: "ogImageUrl", label: "Open Graph image URL", placeholder: "https://…" },
                ]}
                initialValues={settings.seo}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="social">
          <div className="glass-surface rounded-(--glass-radius-lg) p-5">
            <h3 className="text-sm font-semibold">Social media</h3>
            <p className="mt-1 text-sm text-muted-foreground">Profile links shown in the site footer.</p>
            <div className="mt-4">
              <SettingsForm
                settingsKey="social_links"
                fields={[
                  { name: "facebook", label: "Facebook", placeholder: "https://facebook.com/…" },
                  { name: "instagram", label: "Instagram", placeholder: "https://instagram.com/…" },
                  { name: "linkedin", label: "LinkedIn", placeholder: "https://linkedin.com/…" },
                  { name: "youtube", label: "YouTube", placeholder: "https://youtube.com/…" },
                ]}
                initialValues={settings.social}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <MaintenanceModeToggle initialEnabled={settings.maintenanceMode} />

          <div className="glass-surface rounded-(--glass-radius-lg) p-5">
            <h3 className="text-sm font-semibold">Session settings</h3>
            <p className="mt-1 text-sm text-muted-foreground">How long an admin session stays valid before requiring a fresh sign-in.</p>
            <div className="mt-4 max-w-xs">
              <SettingsForm
                settingsKey="security_settings"
                fields={[{ name: "sessionTimeoutMinutes", label: "Timeout (minutes)" }]}
                initialValues={{ sessionTimeoutMinutes: settings.security.sessionTimeoutMinutes }}
              />
            </div>
          </div>

          <div className="glass-surface rounded-(--glass-radius-lg) p-5">
            <h3 className="text-sm font-semibold">Admin permissions</h3>
            <p className="mt-1 text-sm text-muted-foreground">{accounts.length} account{accounts.length === 1 ? "" : "s"} with admin-app access.</p>
            <div className="mt-4">
              <AdminRolesTable accounts={accounts} currentAdminId={profile.id} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="storage">
          <div className="glass-surface rounded-(--glass-radius-lg) p-5">
            <h3 className="text-sm font-semibold">Media settings</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Uploaded images are always converted to WebP and capped at 10 MB by the upload endpoint&apos;s own validation — this value is
              informational, not enforced from here.
            </p>
            <div className="mt-4">
              <SettingsForm
                settingsKey="storage_settings"
                fields={[
                  { name: "maxUploadSizeMb", label: "Max upload size (MB)", placeholder: "10" },
                  { name: "backupFrequency", label: "Backup notes", placeholder: "e.g. managed by Supabase automatic backups" },
                ]}
                initialValues={settings.storage}
              />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
