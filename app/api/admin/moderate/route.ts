import { NextRequest,NextResponse } from "next/server";
import { requireLiveAdmin } from "@/lib/adminAuth";
import { baleApi } from "@/lib/bale";
import { addWarning,clearWarnings,logModeration } from "@/lib/familyCore";

const actions=new Set(["warn","unwarn","mute","ban","unban"]);
export async function POST(req:NextRequest){try{
  const session=await requireLiveAdmin(req);if(!session)return NextResponse.json({ok:false,error:"admin_required"},{status:403});
  const body=await req.json() as {action?:string;targetUserId?:number;reason?:string;minutes?:number};const action=String(body.action||"");const target=Number(body.targetUserId);const reason=String(body.reason||"").slice(0,500);
  if(!actions.has(action)||!Number.isFinite(target)||target<=0)return NextResponse.json({ok:false,error:"invalid_request"},{status:400});
  if(target===session.userId)return NextResponse.json({ok:false,error:"self_moderation_not_allowed"},{status:409});
  let warningCount:number|undefined;
  if(action==="warn")warningCount=await addWarning(session.familyId,session.userId,target,reason||"اخطار از پنل مدیریت");
  else if(action==="unwarn")await clearWarnings(session.familyId,target);
  else if(action==="mute"){const minutes=Math.max(1,Math.min(10080,Number(body.minutes)||10));await baleApi("restrictChatMember",{chat_id:session.chatId,user_id:target,permissions:{can_send_messages:false},until_date:Math.floor(Date.now()/1000)+minutes*60});}
  else if(action==="ban")await baleApi("banChatMember",{chat_id:session.chatId,user_id:target});
  else if(action==="unban")await baleApi("unbanChatMember",{chat_id:session.chatId,user_id:target,only_if_banned:true});
  await logModeration(session.familyId,session.userId,target,action,reason||"Mini App admin action");
  return NextResponse.json({ok:true,action,targetUserId:target,warningCount});
}catch(error){console.error("admin moderation failed",error);return NextResponse.json({ok:false,error:"moderation_failed"},{status:500})}}
