import { NextRequest,NextResponse } from "next/server";
import { baleApi } from "@/lib/bale";

function authorized(req:NextRequest){
  const secret=process.env.BALE_WEBHOOK_SECRET;
  if(!secret)return false;
  const auth=req.headers.get("authorization")||"";
  const supplied=auth.startsWith("Bearer ")?auth.slice(7):req.headers.get("x-familybot-doctor-secret")||"";
  return supplied===secret;
}

export async function GET(req:NextRequest){
  if(!authorized(req))return NextResponse.json({ok:false,error:"unauthorized"},{status:401});
  try{
    const info=await baleApi<any>("getWebhookInfo",{});
    const result=info?.result??{};
    const expectedBase=(process.env.NEXT_PUBLIC_APP_URL||"").replace(/\/$/,"");
    const expectedUrl=expectedBase?`${expectedBase}/api/bale/webhook`:null;
    const actualUrl=typeof result.url==="string"?result.url:null;
    return NextResponse.json({
      ok:true,
      webhook:{
        configured:Boolean(actualUrl),
        matchesExpected:Boolean(actualUrl&&expectedUrl&&actualUrl.split("?")[0]===expectedUrl),
        actualUrl:actualUrl?actualUrl.split("?")[0]:null,
        expectedUrl,
        pendingUpdateCount:Number(result.pending_update_count||0),
        lastErrorDate:result.last_error_date||null,
        lastErrorMessage:result.last_error_message||null,
        maxConnections:result.max_connections||null,
        allowedUpdates:result.allowed_updates||null
      }
    });
  }catch(error){
    console.error("Bale webhook doctor failed",error);
    return NextResponse.json({ok:false,error:"doctor_failed"},{status:500});
  }
}
