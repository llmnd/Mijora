import { describe, expect, it } from "vitest";
import { hasPermission } from "@/server/policies/permissions";

describe("RBAC policies", () => {
  it("allows editors to submit content but reserves publication for admins", () => {
    expect(hasPermission("editor", "editorial:submit")).toBe(true);
    expect(hasPermission("editor", "editorial:publish")).toBe(false);
    expect(hasPermission("admin", "editorial:publish")).toBe(true);
  });

  it("denies unknown roles and preserves user-owned capabilities", () => {
    expect(hasPermission("user", "favorite:manage-own")).toBe(true);
    expect(hasPermission("user", "editorial:edit")).toBe(false);
    expect(hasPermission("editor", "editorial:edit")).toBe(true);
    expect(hasPermission("admin", "editorial:edit")).toBe(true);
    expect(hasPermission("user", "roles:manage")).toBe(false);
    expect(hasPermission("unknown", "users:manage")).toBe(false);
    expect(hasPermission(undefined, "catalog:read")).toBe(false);
  });
});
