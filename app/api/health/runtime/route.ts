import { NextResponse } from "next/server";

export async function GET(){
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL||"";
  const result={
    ok:true,
    configured:{
      baleBotToken:Boolean(process.env.BALE_BOT_TOKEN),
      webhookSecret:Boolean(process.env.BALE_WEBHOOK_PATH_TOKEN||process.env.BALE_WEBHOOK_SECRET),
      memberSession:Boolean(process.env.FAMILY_MEMBER_SESSION_SECRET),
      adminSession:Boolean(process.env.FAMILY_ADMIN_SESSION_SECRET),
      supabaseUrl:Boolean(url),
      supabaseUrlLooksValid:/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(url),
      supabaseAnon:Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
      supabaseService:Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    }
  };
  return NextResponse.json(result,{headers:{"cache-control":"no-store"}});
}
