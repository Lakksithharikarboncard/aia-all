// ─── Plain URL helpers (no proxy prefix) ─────────────────────────────────────
// The app runs directly at localhost:3020 (or your assigned host/port).
// No proxy rewriting is needed.

export function apiUrl(path: string): string {
  if (path.startsWith("/")) return path;
  return path;
}

export function navUrl(path: string): string {
  if (path.startsWith("/")) return path;
  return path;
}
