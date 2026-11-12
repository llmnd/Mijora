import { createAccessControl } from "better-auth/plugins/access";
import { defaultStatements } from "better-auth/plugins/admin/access";

export type MijoraRole = "user" | "editor" | "admin";

const authStatement = {
  ...defaultStatements,
  editorial: ["create", "edit", "submit", "review", "publish"],
} as const;

export const authAccessControl = createAccessControl(authStatement);

export const authRoleDefinitions = {
  user: authAccessControl.newRole({
    user: [],
    session: [],
    editorial: [],
  }),
  editor: authAccessControl.newRole({
    user: [],
    session: [],
    editorial: ["create", "edit", "submit"],
  }),
  admin: authAccessControl.newRole({
    user: [
      "create",
      "list",
      "set-role",
      "ban",
      "delete",
      "set-password",
      "set-email",
      "set-phone",
      "get",
      "update",
    ],
    session: ["list", "revoke", "delete"],
    editorial: ["create", "edit", "submit", "review", "publish"],
  }),
};

export type Permission =
  | "catalog:read"
  | "favorite:manage-own"
  | "collection:manage-own"
  | "profile:manage-own"
  | "editorial:create"
  | "editorial:edit"
  | "editorial:submit"
  | "editorial:review"
  | "editorial:publish"
  | "users:manage"
  | "roles:manage"
  | "settings:manage";

const rolePermissions: Record<MijoraRole, readonly Permission[]> = {
  user: [
    "catalog:read",
    "favorite:manage-own",
    "collection:manage-own",
    "profile:manage-own",
  ],
  editor: [
    "catalog:read",
    "favorite:manage-own",
    "collection:manage-own",
    "profile:manage-own",
    "editorial:create",
    "editorial:edit",
    "editorial:submit",
  ],
  admin: [
    "catalog:read",
    "favorite:manage-own",
    "collection:manage-own",
    "profile:manage-own",
    "editorial:create",
    "editorial:edit",
    "editorial:submit",
    "editorial:review",
    "editorial:publish",
    "users:manage",
    "roles:manage",
    "settings:manage",
  ],
};

function isMijoraRole(role: string): role is MijoraRole {
  return role === "user" || role === "editor" || role === "admin";
}

export function hasPermission(
  role: string | null | undefined,
  permission: Permission,
): boolean {
  return (
    typeof role === "string" &&
    isMijoraRole(role) &&
    rolePermissions[role].includes(permission)
  );
}
