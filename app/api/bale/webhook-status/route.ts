import { NextResponse } from "next/server";
import { baleApi } from "@/lib/bale";

const EXPECTED_BASE = "https://familybot-gray.vercel.app/api/bale/webhook";

export async function GET() {
  if (process.env.VERCEL_ENV !== "production") {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404, headers: { "cache-control": "no-store" } });
  }
  try {
    const raw = await baleApi<{ result?: { url?: string; pending_update_count?: number; last_error_message?: string; last_error_date?: number } }>("getWebhookInfo");
    const info = raw.result || {};
    const actualBase = typeof info.url === "string" && info.url ? info.url.split("?")[0] : null;
    return NextResponse.json({
      ok: true,
      configured: Boolean(actualBase),
      matchesExpected: actualBase === EXPECTED_BASE,
      actualBase,
      pendingUpdateCount: Number(info.pending_update_count || 0),
      lastError: info.last_error_message || null,
      lastErrorDate: info.last_error_date || null,
    }, { headers: { "cache-control": "no-store", "x-robots-tag": "noindex" } });
  } catch (error) {
    console.error("Bale webhook status probe failed", error);
    return NextResponse.json({ ok: false, error: "probe_failed" }, { status: 502, headers: { "cache-control": "no-store" } });
  }
}
