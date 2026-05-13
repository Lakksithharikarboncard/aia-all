import "server-only";
import { Polar } from "@polar-sh/sdk";

const missing: string[] = [];
const getEnv = (key: string): string => {
  const val = process.env[key];
  if (!val) missing.push(key);
  return val ?? "";
};

const token = getEnv("POLAR_ACCESS_TOKEN");
const orgId = getEnv("POLAR_ORG_ID");
const server = getEnv("POLAR_SERVER") as "sandbox" | "production";

if (missing.length > 0) {
  throw new Error(
    `Missing Polar env vars: ${missing.join(", ")}. Add them to .env.local`
  );
}

export const polar = new Polar({
  accessToken: token,
  server,
});

export const POLAR_ORG_ID = orgId;
export const POLAR_SERVER = server;
