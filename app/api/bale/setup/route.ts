import { NextRequest, NextResponse } from "next/server";
import { baleApi } from "@/lib/bale";

function authorized(req: NextRequest) {
  const expected = process.env.BALE_WEBHOOK_SETUP_SECRET;
  if (!expected) return false;
  const received = req.headers.get("x-familybot-setup-secret") || "";
  return received === expected;
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401, headers:{"cache-control":"no-store"} });
  try {
    const info = await baleApi("getWebhookInfo");
    const expectedBase=(process.env.NEXT_PUBLIC_APP_URL||"").replace(/\/$/,"");
    return NextResponse.json({ ok: true, expectedUrl:expectedBase?`${expectedBase}/api/bale/webhook`:null, webhook: info },{headers:{"cache-control":"no-store"}});
  } catch (error) {
    console.error("Bale webhook info failed",error);
    return NextResponse.json({ok:false,error:"webhook_info_failed"},{status:500,headers:{"cache-control":"no-store"}});
  }
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401, headers:{"cache-control":"no-store"} });
  if(process.env.ALLOW_BALE_WEBHOOK_SETUP!=="true")return NextResponse.json({ok:false,error:"webhook_setup_locked"},{status:423,headers:{"cache-control":"no-store"}});

  const body=await req.json().catch(()=>({}));
  if(body?.confirm!=="SET_FAMILYBOT_WEBHOOK")return NextResponse.json({ok:false,error:"explicit_confirmation_required"},{status:400,headers:{"cache-control":"no-store"}});

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");
  if (!appUrl || !appUrl.startsWith("https://")) {
    return NextResponse.json({ ok: false, error: "NEXT_PUBLIC_APP_URL must be a public HTTPS URL" }, { status: 400, headers:{"cache-control":"no-store"} });
  }

  const webhookSecret = process.env.BALE_WEBHOOK_SECRET;
  if(!webhookSecret)return NextResponse.json({ok:false,error:"BALE_WEBHOOK_SECRET is not configured"},{status:500,headers:{"cache-control":"no-store"}});
  const webhookUrl = `${appUrl}/api/bale/webhook?secret=${encodeURIComponent(webhookSecret)}`;
  const result = await baleApi("setWebhook", { url: webhookUrl });
  const info = await baleApi("getWebhookInfo");
  return NextResponse.json({ ok: true, configured: result, webhook: info },{headers:{"cache-control":"no-store"}});
}
