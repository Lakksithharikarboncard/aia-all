import "server-only";
import { Polar } from "@polar-sh/sdk";

let polarClient: Polar | null = null;
let polarOrgId: string | null = null;
let polarServer: "sandbox" | "production" | null = null;

export function getPolar(): Polar | null {
  if (polarClient) return polarClient;

  const token = process.env.POLAR_ACCESS_TOKEN;
  const orgId = process.env.POLAR_ORG_ID;
  const server = process.env.POLAR_SERVER as "sandbox" | "production" | undefined;

  if (!token || !orgId || !server) {
    return null;
  }

  polarOrgId = orgId;
  polarServer = server;
  polarClient = new Polar({ accessToken: token, server });
  return polarClient;
}

export function getPolarOrgId(): string | null {
  if (!polarOrgId) getPolar();
  return polarOrgId;
}

export function getPolarServer(): "sandbox" | "production" | null {
  if (!polarServer) getPolar();
  return polarServer;
}
