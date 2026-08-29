import {NextRequest,NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";
import {verifyFamilySession} from "@/lib/familySession";

function db(){const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!url||!key)throw new Error("Family Core database is not configured");return createClient(url,key,{db:{schema:"familybot"},auth:{persistSession:false,autoRefreshToken:false}})}
function sessionFrom(req:NextRequest){const auth=req.headers.get("authorization")||"";return auth.startsWith("Bearer ")?verifyFamilySession(auth.slice(7)):null}
function shuffle<T>(items:T[]){return [...items].sort(()=>Math.random()-.5)}
function memberName(row:{display_name?:string|null;first_name?:string|null}){return String(row.display_name||row.first_name||"").trim()}

export async function POST(req:NextRequest){
  try{
    const session=sessionFrom(req);if(!session)return NextResponse.json({ok:false,error:"unauthorized"},{status:401});
    const body=await req.json() as {action?:string;sessionId?:string;option?:number};const supabase=db();
    const member=await supabase.from("members").select("id").eq("family_id",session.familyId).eq("bale_user_id",session.userId).single();if(member.error)throw member.error;
    if(body.action==="start"){
      const rows=await supabase.from("members").select("id,display_name,first_name,relation_label,birthday").eq("family_id",session.familyId).limit(50);if(rows.error)throw rows.error;
      const members=(rows.data||[]).filter(x=>memberName(x));if(members.length<3)return NextResponse.json({ok:false,error:"trivia_needs_three_members"},{status:409});
      const nameCounts=new Map<string,number>();for(const m of members){const n=memberName(m);nameCounts.set(n,(nameCounts.get(n)||0)+1)}
      const usable=members.filter(m=>(nameCounts.get(memberName(m))||0)===1);if(usable.length<3)return NextResponse.json({ok:false,error:"trivia_needs_unique_names"},{status:409});
      const relationCounts=new Map<string,number>();const birthdayCounts=new Map<string,number>();for(const m of usable){if(m.relation_label)relationCounts.set(m.relation_label,(relationCounts.get(m.relation_label)||0)+1);if(m.birthday)birthdayCounts.set(m.birthday,(birthdayCounts.get(m.birthday)||0)+1)}
      const relationCandidates=usable.filter(x=>x.relation_label&&relationCounts.get(x.relation_label)===1);const birthdayCandidates=usable.filter(x=>x.birthday&&birthdayCounts.get(x.birthday)===1);const useRelation=relationCandidates.length>0&&(birthdayCandidates.length===0||Math.random()<.6);const pool=useRelation?relationCandidates:birthdayCandidates;
      if(!pool.length)return NextResponse.json({ok:false,error:"trivia_needs_profile_data"},{status:409});
      const target=pool[Math.floor(Math.random()*pool.length)],answerName=memberName(target);let prompt="";if(useRelation)prompt=`کدام عضو خانواده با نسبت «${target.relation_label}» ثبت شده؟`;else {const date=new Date(`${target.birthday}T00:00:00Z`).toLocaleDateString("fa-IR",{month:"long",day:"numeric"});prompt=`تولد کدام عضو در ${date} ثبت شده؟`}
      const distractors=shuffle(usable.filter(x=>x.id!==target.id)).slice(0,3).map(memberName);const options=shuffle([answerName,...distractors]);const answer=String(options.findIndex(x=>x===answerName));const ins=await supabase.from("game_sessions").insert({family_id:session.familyId,chat_id:session.chatId,game_type:"family_trivia",prompt,answer,options,reward_coins:12,expires_at:new Date(Date.now()+120000).toISOString()}).select("id,prompt,options,reward_coins,expires_at").single();if(ins.error)throw ins.error;return NextResponse.json({ok:true,result:ins.data});
    }
    if(body.action==="answer"){
      const id=String(body.sessionId||"");const option=Math.floor(Number(body.option));const q=await supabase.from("game_sessions").select("id,answer,reward_coins,status,expires_at").eq("id",id).eq("family_id",session.familyId).eq("game_type","family_trivia").single();if(q.error)throw q.error;if(q.data.status!=="open")return NextResponse.json({ok:false,error:"trivia_closed"},{status:409});if(q.data.expires_at&&new Date(q.data.expires_at).getTime()<Date.now()){await supabase.from("game_sessions").update({status:"closed"}).eq("id",id);return NextResponse.json({ok:false,error:"trivia_expired"},{status:409})}if(String(option)!==String(q.data.answer))return NextResponse.json({ok:true,result:{correct:false}});
      const won=await supabase.from("game_sessions").update({status:"closed",winner_bale_user_id:session.userId}).eq("id",id).eq("status","open").select("id").maybeSingle();if(!won.data)return NextResponse.json({ok:false,error:"trivia_closed"},{status:409});const reward=Number(q.data.reward_coins||12);const coin=await supabase.rpc("family_add_member_coins",{p_member_id:member.data.id,p_delta:reward});if(coin.error)throw coin.error;const xp=await supabase.rpc("family_add_member_xp",{p_member_id:member.data.id,p_delta:8});if(xp.error)throw xp.error;await Promise.all([supabase.from("coin_ledger").insert({family_id:session.familyId,member_id:member.data.id,amount:reward,reason:"family_trivia_win",reference_type:"game_session",reference_id:id}),supabase.from("activity_log").insert({family_id:session.familyId,member_id:member.data.id,activity_type:"game_win",xp_delta:8,metadata:{game:"family_trivia"}})]);return NextResponse.json({ok:true,result:{correct:true,reward,xp:8}});
    }
    return NextResponse.json({ok:false,error:"unknown_action"},{status:400});
  }catch(error){console.error("family trivia failed",error);return NextResponse.json({ok:false,error:error instanceof Error?error.message:"trivia_failed"},{status:500})}
}
