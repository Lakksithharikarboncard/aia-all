import { BrowserContext } from "@playwright/test";

// Auth is now handled globally via globalSetup + storageState.
// loginAsAdmin is kept as a no-op for backward compat with beforeEach calls.
export async function loginAsAdmin(_context: BrowserContext) {
  // globalSetup already injected the session cookie via storageState
}

export const BASE = "http://localhost:5660";
