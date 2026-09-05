import {NextRequest,NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";
import {verifyFamilySession} from "@/lib/familySession";
import {resolveContent,type ContentKind} from "@/lib/contentSources";
import {riddleOptions} from "@/lib/funBank";
import {challengeReward} from "@/lib/challengeRewards";
import {startDezfuliQuiz} from "@/lib/dezfuliQuiz";
import {interpretHafez} from "@/lib/contentRemote";

function sessionFrom(req:NextRequest){const a=req.headers.get("authorization")||"";return a.startsWith("Bearer ")?verifyFamilySession(a.slice(7)):null}
function db(){const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!url||!key)throw new Error("Family Core database is not configured");return createClient(url,key,{db:{schema:"familybot"},auth:{persistSession:false,autoRefreshToken:false}})}
const KINDS=new Set<ContentKind>(["joke","fact","riddle","motivation","hafez","proverb","poem","dezfuli-proverb","dezfuli-poem","dezfuli-word"]);
function shuffle<T>(items:T[]){return [...items].sort(()=>Math.random()-.5)}

export async function POST(req:NextRequest){
  const session=sessionFrom(req);
  if(!session) return NextResponse.json({ok:false,error:"unauthorized"},{status:401});
  const b=await req.json().catch(()=>({}));
  const action=String(b.action||"");
  const type=String(b.type||"") as ContentKind;
  const recent=[...Array.isArray(b.recent)?b.recent.map(String):[],...Array.isArray(b.recentHashes)?b.recentHashes.map(String):[]].slice(0,50);
  if(action==="riddle.answer"||(type==="riddle"&&action==="answer")){
    try{
      const id=String(b.sessionId||"");
      const option=Math.floor(Number(b.option));
      const s=db();
      const member=await s.from("members").select("id").eq("family_id",session.familyId).eq("bale_user_id",session.userId).single();
      if(member.error)throw member.error;
      const q=await s.from("game_sessions").select("id,answer,options,status,expires_at,prompt").eq("id",id).eq("family_id",session.familyId).eq("game_type","riddle").single();
      if(q.error)throw q.error;
      const options=Array.isArray(q.data.options)?q.data.options as string[]:[];
      const correctIndex=Number(q.data.answer);
      const meaning=options[correctIndex]||"";
      if(q.data.status!=="open")return NextResponse.json({ok:true,correct:false,alreadyClaimed:true,reward:{coins:0,cp:0},meaning,answer:meaning});
      if(q.data.expires_at&&new Date(q.data.expires_at).getTime()<Date.now()){
        await s.from("game_sessions").update({status:"closed"}).eq("id",id);
        return NextResponse.json({ok:false,error:"riddle_expired"},{status:409});
      }
      const correct=option===correctIndex;
      const closed=await s.from("game_sessions").update({status:"closed",winner_bale_user_id:correct?session.userId:null}).eq("id",id).eq("status","open").select("id").maybeSingle();
      if(!closed.data)return NextResponse.json({ok:true,correct,alreadyClaimed:true,reward:{coins:0,cp:0},meaning,answer:meaning});
      if(!correct)return NextResponse.json({ok:true,correct:false,alreadyClaimed:false,reward:{coins:0,cp:0},meaning,answer:meaning});
      const pay=challengeReward("riddle");
      const coins=await s.rpc("family_add_member_coins",{p_member_id:member.data.id,p_delta:pay.coins});if(coins.error)throw coins.error;
      const xp=await s.rpc("family_add_member_xp",{p_member_id:member.data.id,p_delta:pay.cp});if(xp.error)throw xp.error;
      await Promise.all([
        s.from("coin_ledger").insert({family_id:session.familyId,member_id:member.data.id,amount:pay.coins,reason:"riddle_win",reference_type:"game_session",reference_id:id}),
        s.from("activity_log").insert({family_id:session.familyId,member_id:member.data.id,activity_type:"riddle_win",xp_delta:pay.cp})
      ]);
      return NextResponse.json({ok:true,correct:true,alreadyClaimed:false,reward:pay,meaning,answer:meaning});
    }catch(e){
      console.error("riddle answer failed",e);
      return NextResponse.json({ok:false,error:"riddle_failed"},{status:500});
    }
  }
  if(!KINDS.has(type)) return NextResponse.json({ok:false,error:"unknown_fun_type"},{status:400});
  let sourced;
  try{sourced=await resolveContent(type,recent)}catch{return NextResponse.json({ok:false,error:"content_unavailable"},{status:503})}
  if(type==="dezfuli-word"){
    try{return NextResponse.json({ok:true,data:await startDezfuliQuiz(db(),session,sourced)})}
    catch{return NextResponse.json({ok:false,error:"quiz_unavailable"},{status:503})}
  }
  if(type==="riddle"){
    try{
      const options=shuffle(sourced.options?.length?sourced.options:riddleOptions({id:sourced.id,text:sourced.text,extra:sourced.extra}));
      const answer=String(sourced.extra||"").split("/")[0].trim();
      const index=Math.max(0,options.findIndex(x=>x===answer||x.includes(answer)));
      const s=db();
      const pay=challengeReward("riddle");
      const ins=await s.from("game_sessions").insert({family_id:session.familyId,chat_id:session.chatId,game_type:"riddle",prompt:sourced.text,answer:String(index),options,reward_coins:pay.coins,expires_at:new Date(Date.now()+10*60*1000).toISOString()}).select("id").single();
      if(ins.error)throw ins.error;
      return NextResponse.json({ok:true,data:{type:"riddle",id:sourced.id,sessionId:ins.data.id,text:sourced.text,options,source:sourced.source,sourceLabel:sourced.sourceLabel,sourceMode:sourced.sourceMode,contentHash:sourced.contentHash}});
    }catch(e){
      console.error("riddle start failed",e);
      return NextResponse.json({ok:false,error:"riddle_failed"},{status:500});
    }
  }
  let interpretation=sourced.extra||"";

  if(type==="hafez"&&sourced.source==="ganjoor"){
    interpretation=await interpretHafez(sourced.text);
  }

  return NextResponse.json({ok:true,data:{type,id:sourced.id,text:sourced.text,interpretation,source:sourced.source,sourceLabel:sourced.sourceLabel,sourceMode:sourced.sourceMode,sourceUrl:sourced.sourceUrl,contentHash:sourced.contentHash,fetchedAt:sourced.fetchedAt}});
}
