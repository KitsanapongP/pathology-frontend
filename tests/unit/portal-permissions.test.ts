import { describe, expect, it } from "vitest";
import { canPortal } from "../../src/lib/portal-permissions";

describe("pending portal RBAC", () => {
  it("allows hospital user management without inventing token roles", () => {
    for (const permission of ["users.read", "users.create", "users.update"] as const) expect(canPortal("authenticated", permission)).toBe(true);
  });
  it("does not grant access before authentication or mandatory password change", () => {
    for (const state of ["anonymous", "checking", "password-required"] as const) {
      for (const permission of ["users.read", "users.create", "users.update"] as const) expect(canPortal(state, permission)).toBe(false);
    }
  });
});
