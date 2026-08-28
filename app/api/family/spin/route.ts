import {NextRequest,NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";
import {verifyFamilySession} from "@/lib/familySession";

const rewards=[
  {kind:"coins",amount:250,label:"۲۵۰ سکه"},
  {kind:"xp",amount:120,label:"۱۲۰ XP"},
  {kind:"coins",amount:100,label:"۱۰۰ سکه"},
  {kind:"xp",amount:60,label:"۶۰ XP"},
  {kind:"coins",amount:50,label:"۵۰ سکه"},
  {kind:"xp",amount:30,label:"۳۰ XP"},
] as const;

function db(){
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!key)throw new Error("Family Core database is not configured");
  return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
}
function sessionFrom(req:NextRequest){const auth=req.headers.get("authorization")||"";return auth.startsWith("Bearer ")?verifyFamilySession(auth.slice(7)):null}
async function memberId(familyId:string,userId:number){const r=await db().from("members").select("id").eq("family_id",familyId).eq("bale_user_id",userId).single();if(r.error)throw r.error;return r.data.id as string}

export async function GET(req:NextRequest){
  try{
    const s=sessionFrom(req);if(!s)return NextResponse.json({ok:false,error:"unauthorized"},{status:401});
    const m=await memberId(s.familyId,s.userId);
    const last=await db().from("lucky_wheel_spins").select("last_spun_at,last_reward_kind,last_reward_amount").eq("family_id",s.familyId).eq("member_id",m).maybeSingle();
    if(last.error)throw last.error;
    const nextAt=last.data?new Date(new Date(last.data.last_spun_at).getTime()+24*60*60*1000).toISOString():null;
    return NextResponse.json({ok:true,eligible:!nextAt||Date.now()>=new Date(nextAt).getTime(),nextAt,last:last.data,rewards});
  }catch(error){console.error("spin status failed",error);return NextResponse.json({ok:false,error:"spin_status_failed"},{status:500})}
}

export async function POST(req:NextRequest){
  try{
    const s=sessionFrom(req);if(!s)return NextResponse.json({ok:false,error:"unauthorized"},{status:401});
    const m=await memberId(s.familyId,s.userId);
    const result=await db().rpc("family_spin_lucky_wheel",{p_family_id:s.familyId,p_member_id:m});
    if(result.error)throw result.error;
    const row=result.data as {spun?:boolean;reason?:string;nextSpinAt?:string;rewardKind?:"coins"|"xp";rewardAmount?:number};
    if(!row?.spun)return NextResponse.json({ok:false,error:row?.reason==="cooldown"?"spin_cooldown":"spin_failed",nextAt:row?.nextSpinAt},{status:409});
    const kind=row.rewardKind||"coins",amount=Number(row.rewardAmount||0);
    return NextResponse.json({ok:true,reward:{kind,amount,label:`${amount.toLocaleString("fa-IR")} ${kind==="coins"?"سکه":"XP"}`},nextAt:row.nextSpinAt});
  }catch(error){console.error("daily spin failed",error);return NextResponse.json({ok:false,error:"spin_failed"},{status:500})}
}
