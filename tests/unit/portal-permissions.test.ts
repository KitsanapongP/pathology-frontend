import { describe, expect, it } from "vitest";
import { canPortal } from "../../src/lib/portal-permissions";

describe("pending portal RBAC", () => {
  it("allows hospital user management without inventing token roles", () => {
    expect(canPortal("authenticated", "users.read")).toBe(true);
  });
  it("does not grant access before authentication or mandatory password change", () => {
    for (const state of ["anonymous", "checking", "password-required"] as const) {
      expect(canPortal(state, "users.read")).toBe(false);
    }
  });
});
