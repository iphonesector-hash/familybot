import {NextRequest,NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";
import {verifyFamilySession} from "@/lib/familySession";

const rewards=[
  {kind:"coins",amount:15,label:"۱۵ سکه",weight:24},
  {kind:"xp",amount:10,label:"۱۰ XP",weight:22},
  {kind:"coins",amount:25,label:"۲۵ سکه",weight:20},
  {kind:"xp",amount:20,label:"۲۰ XP",weight:16},
  {kind:"coins",amount:50,label:"۵۰ سکه",weight:10},
  {kind:"xp",amount:40,label:"۴۰ XP",weight:6},
  {kind:"coins",amount:100,label:"۱۰۰ سکه",weight:2},
] as const;

type RewardKind="coins"|"xp";
function db(){
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!key)throw new Error("Family Core database is not configured");
  return createClient(url,key,{db:{schema:"familybot"},auth:{persistSession:false,autoRefreshToken:false}});
}
function sessionFrom(req:NextRequest){const auth=req.headers.get("authorization")||"";return auth.startsWith("Bearer ")?verifyFamilySession(auth.slice(7)):null}
async function memberId(familyId:string,userId:number){const r=await db().from("members").select("id").eq("family_id",familyId).eq("bale_user_id",userId).single();if(r.error)throw r.error;return r.data.id as string}
function pickReward(){const total=rewards.reduce((n,r)=>n+r.weight,0);let roll=Math.random()*total;for(const r of rewards){roll-=r.weight;if(roll<=0)return r}return rewards[0]}

export async function GET(req:NextRequest){
  try{
    const s=sessionFrom(req);if(!s)return NextResponse.json({ok:false,error:"unauthorized"},{status:401});
    const m=await memberId(s.familyId,s.userId);
    const last=await db().from("daily_spin_claims").select("claimed_at,reward_kind,reward_amount").eq("family_id",s.familyId).eq("member_id",m).order("claimed_at",{ascending:false}).limit(1).maybeSingle();
    if(last.error)throw last.error;
    const nextAt=last.data?new Date(new Date(last.data.claimed_at).getTime()+24*60*60*1000).toISOString():null;
    return NextResponse.json({ok:true,eligible:!nextAt||Date.now()>=new Date(nextAt).getTime(),nextAt,last:last.data,rewards:rewards.map(({kind,amount,label})=>({kind,amount,label}))},{headers:{"cache-control":"no-store"}});
  }catch(error){console.error("spin status failed",error);return NextResponse.json({ok:false,error:"spin_status_failed"},{status:500})}
}

export async function POST(req:NextRequest){
  try{
    const s=sessionFrom(req);if(!s)return NextResponse.json({ok:false,error:"unauthorized"},{status:401});
    const m=await memberId(s.familyId,s.userId);
    const reward=pickReward();
    const result=await db().rpc("family_claim_daily_spin_atomic",{p_family_id:s.familyId,p_member_id:m,p_reward_kind:reward.kind as RewardKind,p_reward_amount:reward.amount});
    if(result.error)throw result.error;
    const row=result.data as {claimed?:boolean;nextAt?:string;kind?:RewardKind;amount?:number};
    if(!row?.claimed)return NextResponse.json({ok:false,error:"spin_cooldown",nextAt:row?.nextAt},{status:409});
    const kind=(row.kind||reward.kind) as RewardKind,amount=Number(row.amount||reward.amount);
    return NextResponse.json({ok:true,reward:{kind,amount,label:`${amount.toLocaleString("fa-IR")} ${kind==="coins"?"سکه":"XP"}`},nextAt:row.nextAt},{headers:{"cache-control":"no-store"}});
  }catch(error){console.error("daily spin failed",error);return NextResponse.json({ok:false,error:"spin_failed"},{status:500})}
}
