import { config as loadEnv } from "dotenv";
import { defineConfig } from "prisma/config";

loadEnv({ path: ".env.local" });
loadEnv();

const databaseUrl =
  process.env.DIRECT_URL?.trim() ||
  process.env.DATABASE_URL_UNPOOLED?.trim() ||
  process.env.DATABASE_URL?.trim();

const prismaArguments = process.argv.slice(2);
const migrateIndex = prismaArguments.indexOf("migrate");
const databaseIndex = prismaArguments.indexOf("db");
const writesToDatabase =
  (migrateIndex >= 0 &&
    ["dev", "deploy", "reset", "resolve"].includes(
      prismaArguments[migrateIndex + 1],
    )) ||
  (databaseIndex >= 0 &&
    ["push", "execute", "seed"].includes(
      prismaArguments[databaseIndex + 1],
    ));

if (!databaseUrl) {
  throw new Error(
    "Set DATABASE_URL or DATABASE_URL_UNPOOLED before running Prisma commands.",
  );
}

if (
  process.env.NEON_BRANCH?.trim().toLowerCase() === "production" &&
  writesToDatabase &&
  process.env.ALLOW_PRODUCTION_MIGRATIONS !== "true"
) {
  throw new Error(
    "Refusing to modify the Neon production branch. Select a development branch or set ALLOW_PRODUCTION_MIGRATIONS=true after explicit approval.",
  );
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: databaseUrl,
  },
});
