import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(){
  const appUrl=(process.env.NEXT_PUBLIC_APP_URL||"").replace(/\/$/,"");
  const supabaseUrl=(process.env.NEXT_PUBLIC_SUPABASE_URL||"").replace(/\/$/,"");
  const serviceKey=process.env.SUPABASE_SERVICE_ROLE_KEY||"";
  const ref=supabaseUrl.match(/^https:\/\/([a-z0-9-]+)\.supabase\.co$/i)?.[1]||null;
  let database={ok:false,error:"not_configured",familiesCount:null as number|null};
  if(supabaseUrl&&serviceKey){
    try{
      const client=createClient(supabaseUrl,serviceKey,{auth:{persistSession:false,autoRefreshToken:false},db:{schema:"familybot"}});
      const result=await client.from("families").select("id",{count:"exact",head:true});
      database=result.error?{ok:false,error:result.error.code||"query_failed",familiesCount:null}:{ok:true,error:"",familiesCount:result.count??0};
    }catch{ database={ok:false,error:"exception",familiesCount:null}; }
  }
  return NextResponse.json({
    ok:database.ok,
    appUrl,
    appUrlMatchesExpected:appUrl==="https://familybot-gray.vercel.app",
    supabaseProjectRef:ref,
    matchesLoveHub:ref==="ouuyarzxlusoebjiphgm",
    configured:{
      botToken:Boolean(process.env.BALE_BOT_TOKEN),
      webhookSecret:Boolean(process.env.BALE_WEBHOOK_PATH_TOKEN||process.env.BALE_WEBHOOK_SECRET),
      memberSession:Boolean(process.env.FAMILY_MEMBER_SESSION_SECRET),
      adminSession:Boolean(process.env.FAMILY_ADMIN_SESSION_SECRET),
      supabaseUrl:Boolean(supabaseUrl),
      supabaseService:Boolean(serviceKey)
    },
    database
  },{headers:{"cache-control":"no-store"}});
}
