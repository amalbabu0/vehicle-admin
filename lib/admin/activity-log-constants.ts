/** Shared between the server-only data layer and client filter components —
 * kept out of activity-logs-data.ts (which pulls in "server-only") so client
 * components can import these without dragging that in. */

/** Every action string ever written by log_audit_event() call sites in this
 * app (app/actions/auth.ts, app/api/admin/listings/*, app/api/admin/users/*).
 * Hardcoded rather than queried distinct — it's a small, controlled
 * vocabulary and a static list gives instant filter options with no extra
 * round trip. */
export const KNOWN_ACTIONS = [
  "login",
  "login_failed",
  "logout",
  "password_reset",
  "listing_approved",
  "listing_rejected",
  "listing_featured",
  "listing_unfeatured",
  "listing_deleted",
  "user_suspended",
  "user_activated",
  "user_deleted",
  "settings_updated",
  "admin_role_changed",
  "ip_blocked",
  "ip_unblocked",
] as const;

export const KNOWN_ENTITY_TYPES = ["auth", "vehicle", "user", "site_settings", "admin", "ip"] as const;

export type ActorOption = { id: string; name: string };
