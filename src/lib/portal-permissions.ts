import type { SessionState } from "./session-manager";

export type PortalPermission = "users.read";

/** Portal RBAC is pending. Backend remains responsible for tenant and action authorization. */
export function canPortal(session: SessionState, permission: PortalPermission): boolean {
  if (session !== "authenticated") return false;
  switch (permission) {
    case "users.read": return true;
  }
}
