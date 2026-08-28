import { NextResponse } from "next/server";
import { baleApi } from "@/lib/bale";

function allowedPreview(){
  return process.env.VERCEL_ENV === "preview" && process.env.VERCEL_GIT_COMMIT_REF === "bale-test-activation";
}

function testBaseUrl(){
  const host = process.env.VERCEL_BRANCH_URL || process.env.VERCEL_URL;
  return host ? `https://${host}` : null;
}

export async function GET(){
  if(!allowedPreview()) return NextResponse.json({ok:false,error:"preview_only"},{status:404,headers:{"cache-control":"no-store"}});
  const baseUrl=testBaseUrl();
  const webhookToken=process.env.BALE_WEBHOOK_PATH_TOKEN || process.env.BALE_WEBHOOK_SECRET;
  return NextResponse.json({
    ok:true,
    ready:Boolean(baseUrl && process.env.BALE_BOT_TOKEN && webhookToken),
    baseUrl,
    configured:{
      baleBotToken:Boolean(process.env.BALE_BOT_TOKEN),
      webhookPathToken:Boolean(webhookToken),
      supabase:Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
    }
  },{headers:{"cache-control":"no-store"}});
}

export async function POST(){
  if(!allowedPreview()) return NextResponse.json({ok:false,error:"preview_only"},{status:404,headers:{"cache-control":"no-store"}});
  const baseUrl=testBaseUrl();
  const webhookToken=process.env.BALE_WEBHOOK_PATH_TOKEN || process.env.BALE_WEBHOOK_SECRET;
  if(!baseUrl || !process.env.BALE_BOT_TOKEN || !webhookToken){
    return NextResponse.json({ok:false,error:"preview_env_incomplete"},{status:503,headers:{"cache-control":"no-store"}});
  }
  const webhookUrl=`${baseUrl}/api/bale/webhook?secret=${encodeURIComponent(webhookToken)}`;
  try{
    const configured=await baleApi("setWebhook",{url:webhookUrl});
    const webhook=await baleApi("getWebhookInfo");
    return NextResponse.json({ok:true,configured,webhook,baseUrl},{headers:{"cache-control":"no-store"}});
  }catch(error){
    console.error("Bale preview activation failed",error);
    return NextResponse.json({ok:false,error:"bale_activation_failed"},{status:502,headers:{"cache-control":"no-store"}});
  }
}
