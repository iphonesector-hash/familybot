import { NextResponse } from "next/server";
import { baleApi } from "@/lib/bale";

const TEST_BASE_URL="https://familybot-gray.vercel.app";

function allowedProduction(){
  return process.env.VERCEL_ENV === "production";
}

export async function GET(){
  if(!allowedProduction()) return NextResponse.json({ok:false,error:"production_only"},{status:404,headers:{"cache-control":"no-store"}});
  const webhookToken=process.env.BALE_WEBHOOK_PATH_TOKEN || process.env.BALE_WEBHOOK_SECRET;
  return NextResponse.json({
    ok:true,
    ready:Boolean(process.env.BALE_BOT_TOKEN && webhookToken),
    baseUrl:TEST_BASE_URL,
    configured:{
      baleBotToken:Boolean(process.env.BALE_BOT_TOKEN),
      webhookPathToken:Boolean(webhookToken),
      supabase:Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
    }
  },{headers:{"cache-control":"no-store"}});
}

export async function POST(){
  if(!allowedProduction()) return NextResponse.json({ok:false,error:"production_only"},{status:404,headers:{"cache-control":"no-store"}});
  const webhookToken=process.env.BALE_WEBHOOK_PATH_TOKEN || process.env.BALE_WEBHOOK_SECRET;
  if(!process.env.BALE_BOT_TOKEN || !webhookToken){
    return NextResponse.json({ok:false,error:"production_env_incomplete"},{status:503,headers:{"cache-control":"no-store"}});
  }
  const webhookUrl=`${TEST_BASE_URL}/api/bale/webhook?secret=${encodeURIComponent(webhookToken)}`;
  try{
    const configured=await baleApi("setWebhook",{url:webhookUrl});
    const webhook=await baleApi("getWebhookInfo");
    return NextResponse.json({ok:true,configured,webhook,baseUrl:TEST_BASE_URL},{headers:{"cache-control":"no-store"}});
  }catch(error){
    console.error("Bale production test activation failed",error);
    return NextResponse.json({ok:false,error:"bale_activation_failed"},{status:502,headers:{"cache-control":"no-store"}});
  }
}
