import {NextRequest,NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";
import {verifyFamilySession} from "@/lib/familySession";

type Reward=
  |{kind:"coins"|"xp";amount:number;label:string;weight:number}
  |{kind:"item";amount:1;label:string;weight:number;itemId:string;itemName:string;itemKind:"sagool"|"house"|"profile"};
const rewards:Reward[]=[
  {kind:"coins",amount:15,label:"۱۵ سکه",weight:22},
  {kind:"xp",amount:10,label:"۱۰ XP",weight:20},
  {kind:"coins",amount:25,label:"۲۵ سکه",weight:18},
  {kind:"xp",amount:20,label:"۲۰ XP",weight:14},
  {kind:"coins",amount:50,label:"۵۰ سکه",weight:9},
  {kind:"xp",amount:40,label:"۴۰ XP",weight:6},
  {kind:"item",amount:1,label:"استخوان کهکشانی",weight:5,itemId:"sagool_bone",itemName:"استخوان کهکشانی",itemKind:"sagool"},
  {kind:"item",amount:1,label:"قاب عکس خانواده",weight:3,itemId:"family_photo_frame",itemName:"قاب عکس خانواده",itemKind:"house"},
  {kind:"coins",amount:100,label:"۱۰۰ سکه",weight:2},
  {kind:"item",amount:1,label:"نشان جهانی",weight:1,itemId:"cosmic_badge",itemName:"نشان جهانی",itemKind:"profile"},
];

function db(){
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!key)throw new Error("Family Core database is not configured");
  return createClient(url,key,{db:{schema:"familybot"},auth:{persistSession:false,autoRefreshToken:false}});
}
function sessionFrom(req:NextRequest){const auth=req.headers.get("authorization")||"";return auth.startsWith("Bearer ")?verifyFamilySession(auth.slice(7)):null}
async function memberId(familyId:string,userId:number){const r=await db().from("members").select("id").eq("family_id",familyId).eq("bale_user_id",userId).single();if(r.error)throw r.error;return r.data.id as string}
function pickReward(){const total=rewards.reduce((n,r)=>n+r.weight,0);let roll=Math.random()*total;for(const r of rewards){roll-=r.weight;if(roll<=0)return r}return rewards[0]}
function publicReward(r:Reward){return r.kind==="item"?{kind:r.kind,amount:1,label:r.label,itemId:r.itemId,itemName:r.itemName,itemKind:r.itemKind}:{kind:r.kind,amount:r.amount,label:r.label}}

export async function GET(req:NextRequest){
  try{
    const s=sessionFrom(req);if(!s)return NextResponse.json({ok:false,error:"unauthorized"},{status:401});
    const m=await memberId(s.familyId,s.userId),supabase=db();
    const [legacy,current]=await Promise.all([
      supabase.from("daily_spin_claims").select("claimed_at,reward_kind,reward_amount").eq("family_id",s.familyId).eq("member_id",m).order("claimed_at",{ascending:false}).limit(1).maybeSingle(),
      supabase.from("wheel_claims").select("claimed_at,reward_kind,reward_amount,item_id,item_name,item_kind").eq("family_id",s.familyId).eq("member_id",m).order("claimed_at",{ascending:false}).limit(1).maybeSingle(),
    ]);
    if(legacy.error)throw legacy.error;if(current.error)throw current.error;
    const candidates=[legacy.data,current.data].filter(Boolean) as Array<{claimed_at:string;reward_kind:string;reward_amount:number;item_id?:string|null;item_name?:string|null;item_kind?:string|null}>;
    const last=candidates.sort((a,b)=>new Date(b.claimed_at).getTime()-new Date(a.claimed_at).getTime())[0]||null;
    const nextAt=last?new Date(new Date(last.claimed_at).getTime()+24*60*60*1000).toISOString():null;
    return NextResponse.json({ok:true,eligible:!nextAt||Date.now()>=new Date(nextAt).getTime(),nextAt,last,rewards:rewards.map(publicReward)},{headers:{"cache-control":"no-store"}});
  }catch(error){console.error("spin status failed",error);return NextResponse.json({ok:false,error:"spin_status_failed"},{status:500})}
}

export async function POST(req:NextRequest){
  try{
    const s=sessionFrom(req);if(!s)return NextResponse.json({ok:false,error:"unauthorized"},{status:401});
    const m=await memberId(s.familyId,s.userId),reward=pickReward();
    const item=reward.kind==="item"?reward:null;
    const result=await db().rpc("family_claim_daily_spin_reward_atomic",{
      p_family_id:s.familyId,
      p_member_id:m,
      p_reward_kind:reward.kind,
      p_reward_amount:reward.amount,
      p_item_id:item?.itemId??null,
      p_item_name:item?.itemName??null,
      p_item_kind:item?.itemKind??null,
    });
    if(result.error)throw result.error;
    const row=result.data as {claimed?:boolean;nextAt?:string;kind?:"coins"|"xp"|"item";amount?:number;itemId?:string;itemName?:string;itemKind?:string;founder?:boolean};
    if(!row?.claimed)return NextResponse.json({ok:false,error:"spin_cooldown",nextAt:row?.nextAt},{status:409});
    const kind=row.kind||reward.kind,amount=Number(row.amount||reward.amount);
    const responseReward=kind==="item"
      ?{kind:"item",amount:1,label:String(row.itemName||item?.itemName||reward.label),itemId:String(row.itemId||item?.itemId||""),itemName:String(row.itemName||item?.itemName||reward.label),itemKind:String(row.itemKind||item?.itemKind||"sagool")}
      :{kind,amount,label:`${amount.toLocaleString("fa-IR")} ${kind==="coins"?"سکه":"XP"}`};
    return NextResponse.json({ok:true,reward:responseReward,nextAt:row.nextAt,founder:Boolean(row.founder)},{headers:{"cache-control":"no-store"}});
  }catch(error){console.error("daily spin failed",error);return NextResponse.json({ok:false,error:"spin_failed"},{status:500})}
}
