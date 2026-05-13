import { NextResponse } from "next/server";
import { getSnapshot } from "@/lib/billing/server-store";

export const dynamic = "force-dynamic";

export async function GET() {
  const snapshot = getSnapshot();
  return NextResponse.json(snapshot);
}
