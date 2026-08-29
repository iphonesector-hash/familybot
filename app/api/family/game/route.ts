import { NextRequest,NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyFamilySession } from "@/lib/familySession";
import { sendMessage } from "@/lib/bale";

function db(){const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!url||!key)throw new Error("Family Core database is not configured");return createClient(url,key,{db:{schema:"familybot"},auth:{persistSession:false,autoRefreshToken:false}})}
function sessionFrom(req:NextRequest){const auth=req.headers.get("authorization")||"";return auth.startsWith("Bearer ")?verifyFamilySession(auth.slice(7)):null}
const quizBank=[
  {q:"کدام سیاره به سیاره سرخ معروف است؟",options:["زمین","مریخ","زهره","مشتری"],answer:1},
  {q:"حاصل ۷ × ۸ چند است؟",options:["۵۴","۵۶","۵۸","۶۴"],answer:1},
  {q:"پایتخت ایران کدام شهر است؟",options:["شیراز","تهران","تبریز","مشهد"],answer:1},
  {q:"سریع‌ترین جانور خشکی کدام است؟",options:["یوزپلنگ","اسب","گرگ","شیر"],answer:0},
];

async function memberId(familyId:string,userId:number){const r=await db().from("members").select("id").eq("family_id",familyId).eq("bale_user_id",userId).single();if(r.error)throw r.error;return r.data.id}
async function xp(familyId:string,memberId:string,type:string,delta:number){const s=db();const r=await s.rpc("family_add_member_xp",{p_member_id:memberId,p_delta:delta});if(r.error)throw r.error;await s.from("activity_log").insert({family_id:familyId,member_id:memberId,activity_type:type,xp_delta:delta})}

export async function POST(req:NextRequest){
  try{
    const session=sessionFrom(req);if(!session)return NextResponse.json({ok:false,error:"unauthorized"},{status:401});
    const body=await req.json();const action=String(body?.action||"");const member=await memberId(session.familyId,session.userId);const s=db();
    if(action==="dice"){const value=Math.floor(Math.random()*6)+1;await xp(session.familyId,member,"game_play",1);return NextResponse.json({ok:true,result:{value}})}
    if(action==="coin"){const side=Math.random()<.5?"شیر":"خط";await xp(session.familyId,member,"game_play",1);return NextResponse.json({ok:true,result:{side}})}
    if(action==="rps"){
      const choice=Math.max(0,Math.min(2,Number(body?.choice)||0));const bot=Math.floor(Math.random()*3);const outcome=choice===bot?"draw":(choice-bot+3)%3===1?"win":"lose";let reward=0;
      if(outcome==="win"){reward=5;const bal=await s.rpc("family_add_member_coins",{p_member_id:member,p_delta:reward});if(bal.error)throw bal.error;await s.from("coin_ledger").insert({family_id:session.familyId,member_id:member,amount:reward,reason:"rps_win"});await xp(session.familyId,member,"game_win",3)}else await xp(session.familyId,member,"game_play",1);
      return NextResponse.json({ok:true,result:{choice,bot,outcome,reward}})
    }
    if(action==="quiz.start"){
      const q=quizBank[Math.floor(Math.random()*quizBank.length)];const ins=await s.from("game_sessions").insert({family_id:session.familyId,chat_id:session.chatId,game_type:"mini_quiz",prompt:q.q,answer:String(q.answer),options:q.options,reward_coins:15,expires_at:new Date(Date.now()+120000).toISOString()}).select("id,prompt,options,reward_coins,expires_at").single();if(ins.error)throw ins.error;return NextResponse.json({ok:true,result:ins.data});
    }
    if(action==="speed.start"){
      const q=quizBank[Math.floor(Math.random()*quizBank.length)];const ins=await s.from("game_sessions").insert({family_id:session.familyId,chat_id:session.chatId,game_type:"speed_quiz",prompt:q.q,answer:String(q.answer),options:q.options,reward_coins:20,expires_at:new Date(Date.now()+120000).toISOString()}).select("id,prompt,options,reward_coins").single();if(ins.error)throw ins.error;
      await sendMessage(session.chatId,`🏁 مسابقه سرعت خانوادگی\n\n${ins.data.prompt}\n\nاولین جواب درست، ${ins.data.reward_coins} Family Coin می‌بره!`,{reply_markup:{inline_keyboard:ins.data.options.map((option:string,index:number)=>[{text:option,callback_data:`quiz:${ins.data.id}:${index}`}])}});
      return NextResponse.json({ok:true,result:{sent:true,reward:ins.data.reward_coins}})
    }
    if(action==="quiz.answer"){
      const id=String(body?.sessionId||"");const option=Math.floor(Number(body?.option));const q=await s.from("game_sessions").select("id,answer,reward_coins,status,expires_at").eq("id",id).eq("family_id",session.familyId).eq("game_type","mini_quiz").single();if(q.error)throw q.error;if(q.data.status!=="open")return NextResponse.json({ok:false,error:"quiz_closed"},{status:409});if(q.data.expires_at&&new Date(q.data.expires_at).getTime()<Date.now()){await s.from("game_sessions").update({status:"closed"}).eq("id",id);return NextResponse.json({ok:false,error:"quiz_expired"},{status:409})}if(String(option)!==String(q.data.answer))return NextResponse.json({ok:true,result:{correct:false}});
      const won=await s.from("game_sessions").update({status:"closed",winner_bale_user_id:session.userId}).eq("id",id).eq("status","open").select("id").maybeSingle();if(!won.data)return NextResponse.json({ok:false,error:"quiz_closed"},{status:409});const reward=Number(q.data.reward_coins||15);const bal=await s.rpc("family_add_member_coins",{p_member_id:member,p_delta:reward});if(bal.error)throw bal.error;await s.from("coin_ledger").insert({family_id:session.familyId,member_id:member,amount:reward,reason:"quiz_win",reference_type:"game_session",reference_id:id});await xp(session.familyId,member,"quiz_win",10);return NextResponse.json({ok:true,result:{correct:true,reward}})
    }
    return NextResponse.json({ok:false,error:"unknown_action"},{status:400});
  }catch(error){console.error("family game action failed",error);const message=error instanceof Error?error.message:"game_failed";return NextResponse.json({ok:false,error:message},{status:500})}
}
