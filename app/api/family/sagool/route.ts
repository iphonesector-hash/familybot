import {NextRequest,NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";
import {verifyFamilySession} from "@/lib/familySession";
import {stageFor} from "@/lib/sagoolCatalog";

type SagoolAction="feed"|"water"|"play"|"sleep"|"clean"|"train"|"pet"|"walk";
const ACTION_XP:Record<SagoolAction,number>={feed:10,water:8,play:14,sleep:8,clean:10,train:18,pet:10,walk:16};
function session(req:NextRequest){const a=req.headers.get("authorization")||"";return a.startsWith("Bearer ")?verifyFamilySession(a.slice(7)):null}
function db(){const u=process.env.NEXT_PUBLIC_SUPABASE_URL,k=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!u||!k)throw new Error("db_not_configured");return createClient(u,k,{db:{schema:"familybot"},auth:{persistSession:false,autoRefreshToken:false}})}
function tehranClock(){const p=Object.fromEntries(new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Tehran",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date()).filter(x=>x.type!=="literal").map(x=>[x.type,x.value]));const y=Number(p.year),m=Number(p.month),d=Number(p.day),local=Date.UTC(y,m-1,d),dow=new Date(local).getUTCDay(),daysFromMonday=(dow+6)%7,weekLocal=local-daysFromMonday*86400000;const iso=(ms:number)=>new Date(ms).toISOString().slice(0,10);return{today:iso(local),weekStart:iso(weekLocal),dayStartUtc:new Date(local-12600000).toISOString(),weekStartUtc:new Date(weekLocal-12600000).toISOString()}}
function normalizePet(p:any){const level=Math.max(1,Number(p.level||1));return{...p,level,stage:stageFor(level).stage,cleanliness:Number(p.hygiene??p.cleanliness??0),bond:Number(p.affection??p.bond??0)}}
async function member(s:ReturnType<typeof db>,familyId:string,userId:number){const r=await s.from("members").select("id,is_founder,role,coins,xp").eq("family_id",familyId).eq("bale_user_id",userId).single();if(r.error)throw r.error;return r.data}
async function readAll(familyId:string,userId:number){const s=db(),m=await member(s,familyId,userId),clock=tehranClock();const ensure=await s.from("sagool_pets").upsert({family_id:familyId,member_id:m.id},{onConflict:"member_id",ignoreDuplicates:true});if(ensure.error)throw ensure.error;const[pet,inventory,missions,actions,claims]=await Promise.all([
 s.from("sagool_pets").select("*").eq("family_id",familyId).eq("member_id",m.id).single(),
 s.from("sagool_inventory").select("item_id,quantity,equipped,acquired_at").eq("family_id",familyId).eq("member_id",m.id).order("acquired_at",{ascending:false}),
 s.from("sagool_solo_missions").select("code,title,description,action_type,target,reward_coins,reward_xp,cadence,sort_order").eq("active",true).order("sort_order"),
 s.from("sagool_action_log").select("action,created_at").eq("family_id",familyId).eq("member_id",m.id).gte("created_at",clock.weekStartUtc),
 s.from("sagool_daily_claims").select("mission_key,claim_date").eq("family_id",familyId).eq("member_id",m.id).gte("claim_date",clock.weekStart)
]);
 for(const r of[pet,inventory,missions,actions,claims])if(r.error)throw r.error;
 const logs=actions.data||[],claimed=claims.data||[];
 const missionRows=(missions.data||[]).map((x:any)=>{const start=x.cadence==="weekly"?clock.weekStartUtc:clock.dayStartUtc;const progress=logs.filter((a:any)=>a.created_at>=start&&(x.action_type==="care_any"||a.action===x.action_type)).length;const claimDate=x.cadence==="weekly"?clock.weekStart:clock.today;return{...x,progress:Math.min(progress,Number(x.target||1)),complete:progress>=Number(x.target||1),claimed:claimed.some((c:any)=>c.mission_key===x.code&&String(c.claim_date)===claimDate)}});
 return{state:normalizePet(pet.data),founder:Boolean(m.is_founder||m.role==="founder"),member:{coins:m.coins,xp:m.xp},inventory:inventory.data||[],missions:missionRows};
}
export async function GET(req:NextRequest){const ses=session(req);if(!ses)return NextResponse.json({ok:false,error:"unauthorized"},{status:401});try{return NextResponse.json({ok:true,data:await readAll(ses.familyId,ses.userId)},{headers:{"cache-control":"no-store"}})}catch(e){console.error(e);return NextResponse.json({ok:false,error:"sagool_read_failed"},{status:500})}}
export async function POST(req:NextRequest){const ses=session(req);if(!ses)return NextResponse.json({ok:false,error:"unauthorized"},{status:401});try{const body=await req.json() as {action?:string;missionKey?:string};const s=db(),m=await member(s,ses.familyId,ses.userId);
 if(body.action==="claim_mission"){const key=String(body.missionKey||"").slice(0,80);if(!key)return NextResponse.json({ok:false,error:"mission_required"},{status:400});const r=await s.rpc("sagool_claim_daily_mission_atomic",{p_family_id:ses.familyId,p_member_id:m.id,p_mission_key:key});if(r.error)throw r.error;return NextResponse.json({ok:true,data:{result:r.data,...await readAll(ses.familyId,ses.userId)}})}
 if(!body.action||!(body.action in ACTION_XP))return NextResponse.json({ok:false,error:"unknown_action"},{status:400});const action=body.action as SagoolAction;const r=await s.rpc("sagool_interact_atomic",{p_family_id:ses.familyId,p_member_id:m.id,p_action:action,p_cost:0,p_xp:ACTION_XP[action]});if(r.error)throw r.error;const all=await readAll(ses.familyId,ses.userId);const messages:Record<SagoolAction,string>={feed:"سگول با اشتها غذا خورد!",water:"آب تازه خورد 💧",play:"چه بازی خوبی! سگول کلی ذوق کرد ✨",sleep:"سگول یک استراحت حسابی کرد 🌙",clean:"سگول تمیز و مرتب شد ✨",train:"یک ترفند تازه تمرین کرد 🧠",pet:"از نوازشت خیلی خوشش اومد 💜",walk:"پیاده‌روی امروز انجام شد 🐾"};return NextResponse.json({ok:true,data:{...all,message:messages[action]}})
 }catch(e){const message=e instanceof Error?e.message:"sagool_action_failed";console.error(e);return NextResponse.json({ok:false,error:message.includes("insufficient_coins")?"insufficient_coins":"sagool_action_failed"},{status:500})}}
