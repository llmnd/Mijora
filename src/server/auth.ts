import { admin } from "better-auth/plugins";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import {
  createPasswordResetEmail,
  createVerificationEmail,
} from "@/lib/email/templates";
import { sendTransactionalEmail } from "@/lib/email";
import { prisma } from "@/server/db/client";
import {
  authAccessControl,
  authRoleDefinitions,
} from "@/server/policies/permissions";

const secret = process.env.BETTER_AUTH_SECRET;
if (!secret || secret.length < 32) {
  throw new Error("BETTER_AUTH_SECRET must contain at least 32 characters.");
}

const configuredBaseUrl = process.env.BETTER_AUTH_URL;
if (!configuredBaseUrl) {
  throw new Error("BETTER_AUTH_URL must be configured.");
}

const parsedBaseUrl = new URL(configuredBaseUrl);
if (!["http:", "https:"].includes(parsedBaseUrl.protocol)) {
  throw new Error("BETTER_AUTH_URL must use HTTP or HTTPS.");
}

export const auth = betterAuth({
  appName: "Mijora",
  baseURL: parsedBaseUrl.origin,
  basePath: "/api/v1/auth",
  secret,
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      await sendTransactionalEmail(
        createPasswordResetEmail(user.email, url),
      );
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    sendVerificationEmail: async ({ user, url }) => {
      await sendTransactionalEmail(createVerificationEmail(user.email, url));
    },
  },
  plugins: [
    admin({
      ac: authAccessControl,
      defaultRole: "user",
      roles: authRoleDefinitions,
    }),
  ],
});
