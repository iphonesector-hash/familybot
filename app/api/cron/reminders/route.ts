import { NextRequest, NextResponse } from "next/server";
import { dispatchDueReminders } from "@/lib/reminders";

function authorized(req: NextRequest) {
  const expected = process.env.CRON_SECRET || "";
  if (!expected) return false;
  const bearer = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const header = req.headers.get("x-cron-secret") || "";
  return bearer === expected || header === expected;
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401, headers: { "cache-control": "no-store" } });
  }
  try {
    return NextResponse.json({ ok: true, ...(await dispatchDueReminders()) }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    console.error("reminder cron failed", error);
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "reminder_failed" }, { status: 500, headers: { "cache-control": "no-store" } });
  }
}
