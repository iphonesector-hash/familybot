import { NextResponse } from "next/server";
import { baleApi } from "@/lib/bale";

const TEST_BASE_URL = "https://familybot-gray.vercel.app";

export async function GET(){
  if(process.env.VERCEL_ENV !== "production") return NextResponse.json({ok:false,error:"not_found"},{status:404,headers:{"cache-control":"no-store"}});
  const botToken = process.env.BALE_BOT_TOKEN;
  const webhookSecret = process.env.BALE_WEBHOOK_PATH_TOKEN || process.env.BALE_WEBHOOK_SECRET;
  const configured={baleBotToken:Boolean(botToken),webhookSecret:Boolean(webhookSecret),memberSession:Boolean(process.env.FAMILY_MEMBER_SESSION_SECRET),adminSession:Boolean(process.env.FAMILY_ADMIN_SESSION_SECRET),supabaseUrl:Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),supabaseAnon:Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),supabaseService:Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)};
  if(!botToken || !webhookSecret) return NextResponse.json({ok:false,error:"env_incomplete",configured},{status:503,headers:{"cache-control":"no-store"}});
  try{
    const url = `${TEST_BASE_URL}/api/bale/webhook?secret=${encodeURIComponent(webhookSecret)}`;
    await baleApi("setWebhook",{url});
    const info = await baleApi("getWebhookInfo");
    return NextResponse.json({ok:true,baseUrl:TEST_BASE_URL,configured,webhook:info},{headers:{"cache-control":"no-store"}});
  }catch(error){
    console.error("Temporary Bale activation failed",error);
    return NextResponse.json({ok:false,error:"activation_failed",configured},{status:502,headers:{"cache-control":"no-store"}});
  }
}
