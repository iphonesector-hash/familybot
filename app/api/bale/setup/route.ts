import { NextRequest, NextResponse } from "next/server";
import { baleApi } from "@/lib/bale";

function authorized(req: NextRequest) {
  const expected = process.env.BALE_WEBHOOK_SECRET;
  if (!expected) return false;
  const received = req.headers.get("x-familybot-setup-secret") ?? req.nextUrl.searchParams.get("secret");
  return received === expected;
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const info = await baleApi("getWebhookInfo");
  return NextResponse.json({ ok: true, webhook: info });
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");
  if (!appUrl || !appUrl.startsWith("https://")) {
    return NextResponse.json({ ok: false, error: "NEXT_PUBLIC_APP_URL must be a public HTTPS URL" }, { status: 400 });
  }

  const secret = process.env.BALE_WEBHOOK_SECRET!;
  const webhookUrl = `${appUrl}/api/bale/webhook?secret=${encodeURIComponent(secret)}`;
  const result = await baleApi("setWebhook", { url: webhookUrl });
  const info = await baleApi("getWebhookInfo");
  return NextResponse.json({ ok: true, configured: result, webhook: info });
}
