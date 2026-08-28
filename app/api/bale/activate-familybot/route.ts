import {NextResponse} from "next/server";
import {baleApi} from "@/lib/bale";
import {getBaleWebhookSecret} from "@/lib/baleWebhookSecret";

const BASE="https://familybot-gray.vercel.app";

export async function GET(){
  if(process.env.VERCEL_ENV!=="production")return NextResponse.json({ok:false,error:"not_found"},{status:404,headers:{"cache-control":"no-store"}});
  const secret=getBaleWebhookSecret();
  if(!process.env.BALE_BOT_TOKEN||!secret)return NextResponse.json({ok:false,error:"webhook_env_incomplete"},{status:503,headers:{"cache-control":"no-store"}});
  try{
    const expected=`${BASE}/api/bale/webhook?secret=${encodeURIComponent(secret)}`;
    await baleApi("setWebhook",{url:expected});
    const raw=await baleApi<{ok?:boolean;result?:{url?:string;pending_update_count?:number;last_error_message?:string;last_error_date?:number}}>("getWebhookInfo");
    const info=raw.result||{};
    return NextResponse.json({ok:true,registered:info.url===expected,baseUrl:BASE,path:"/api/bale/webhook",pendingUpdateCount:Number(info.pending_update_count||0),lastError:info.last_error_message||null,lastErrorDate:info.last_error_date||null},{headers:{"cache-control":"no-store"}});
  }catch(error){
    console.error("Bale webhook activation failed",error);
    return NextResponse.json({ok:false,error:"activation_failed"},{status:502,headers:{"cache-control":"no-store"}});
  }
}
