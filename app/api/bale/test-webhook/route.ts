import { NextRequest, NextResponse } from "next/server";
import { getBaleWebhookSecret } from "@/lib/baleWebhookSecret";
import { POST as realWebhookPost } from "../webhook/route";

export async function POST(req:NextRequest){
  const secret=getBaleWebhookSecret();
  if(!secret)return NextResponse.json({ok:false,error:"webhook_secret_unavailable"},{status:503,headers:{"cache-control":"no-store"}});
  process.env.BALE_WEBHOOK_SECRET=secret;
  return realWebhookPost(req);
}

export async function GET(){
  return NextResponse.json({ok:true,service:"familybot-bale-test-webhook"},{headers:{"cache-control":"no-store"}});
}
