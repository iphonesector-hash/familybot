import { NextRequest,NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyFamilySession } from "@/lib/familySession";
import { sendMessage } from "@/lib/bale";
import { CHALLENGE_REWARDS, challengeReward } from "@/lib/challengeRewards";

function db(){const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!url||!key)throw new Error("Family Core database is not configured");return createClient(url,key,{db:{schema:"familybot"},auth:{persistSession:false,autoRefreshToken:false}})}
function sessionFrom(req:NextRequest){const auth=req.headers.get("authorization")||"";return auth.startsWith("Bearer ")?verifyFamilySession(auth.slice(7)):null}
const quizBank=[
  {q:"کدام سیاره به سیاره سرخ معروف است؟",options:["زمین","مریخ","زهره","مشتری"],answer:1},
  {q:"حاصل ۷ × ۸ چند است؟",options:["۵۴","۵۶","۵۸","۶۴"],answer:1},
  {q:"پایتخت ایران کدام شهر است؟",options:["شیراز","تهران","تبریز","مشهد"],answer:1},
  {q:"سریع‌ترین جانور خشکی کدام است؟",options:["یوزپلنگ","اسب","گرگ","شیر"],answer:0},
];

async function memberId(familyId:string,userId:number){const r=await db().from("members").select("id").eq("family_id",familyId).eq("bale_user_id",userId).single();if(r.error)throw r.error;return r.data.id}
async function grant(familyId:string,memberId:string,coins:number,cp:number,type:string,ref?:{type:string;id:string}){
  const s=db();
  if(coins>0){
    const bal=await s.rpc("family_add_member_coins",{p_member_id:memberId,p_delta:coins});
    if(bal.error)throw bal.error;
    await s.from("coin_ledger").insert({family_id:familyId,member_id:memberId,amount:coins,reason:type,reference_type:ref?.type||null,reference_id:ref?.id||null});
  }
  if(cp>0){
    const xp=await s.rpc("family_add_member_xp",{p_member_id:memberId,p_delta:cp});
    if(xp.error)throw xp.error;
    await s.from("activity_log").insert({family_id:familyId,member_id:memberId,activity_type:type,xp_delta:cp});
  }
}

export async function POST(req:NextRequest){
  try{
    const session=sessionFrom(req);if(!session)return NextResponse.json({ok:false,error:"unauthorized"},{status:401});
    const body=await req.json();const action=String(body?.action||"");const member=await memberId(session.familyId,session.userId);const s=db();
    if(action==="dice"){const value=Math.floor(Math.random()*6)+1;await grant(session.familyId,member,0,1,"game_play");return NextResponse.json({ok:true,result:{value}})}
    if(action==="coin"){
      const guess=String(body?.guess||"").trim();
      if(guess!=="شیر"&&guess!=="خط")return NextResponse.json({ok:false,error:"guess_required"},{status:400});
      const side=Math.random()<.5?"شیر":"خط";
      const correct=guess===side;
      const reward=correct?challengeReward("coin"):{coins:0,cp:0};
      const ins=await s.from("game_sessions").insert({family_id:session.familyId,chat_id:session.chatId,game_type:"coin_flip",prompt:guess,answer:side,options:[guess,side],reward_coins:reward.coins,status:"closed",winner_bale_user_id:correct?session.userId:null,expires_at:new Date(Date.now()+60000).toISOString()}).select("id").single();
      if(ins.error)throw ins.error;
      if(correct)await grant(session.familyId,member,reward.coins,reward.cp,"coin_win",{type:"game_session",id:ins.data.id});
      else await grant(session.familyId,member,0,1,"game_play");
      return NextResponse.json({ok:true,result:{side,guess,correct,reward,alreadyClaimed:false}});
    }
    if(action==="rps"){
      const choice=Math.max(0,Math.min(2,Number(body?.choice)||0));const bot=Math.floor(Math.random()*3);const outcome=choice===bot?"draw":(choice-bot+3)%3===1?"win":"lose";
      const reward=outcome==="win"?challengeReward("rps"):{coins:0,cp:0};
      if(outcome==="win")await grant(session.familyId,member,reward.coins,reward.cp,"rps_win");
      else await grant(session.familyId,member,0,1,"game_play");
      return NextResponse.json({ok:true,result:{choice,bot,outcome,reward,correct:outcome==="win",alreadyClaimed:false}})
    }
    if(action==="quiz.start"){
      const q=quizBank[Math.floor(Math.random()*quizBank.length)];
      const pay=CHALLENGE_REWARDS.quiz;
      const ins=await s.from("game_sessions").insert({family_id:session.familyId,chat_id:session.chatId,game_type:"mini_quiz",prompt:q.q,answer:String(q.answer),options:q.options,reward_coins:pay.coins,expires_at:new Date(Date.now()+120000).toISOString()}).select("id,prompt,options,reward_coins,expires_at").single();if(ins.error)throw ins.error;return NextResponse.json({ok:true,result:ins.data});
    }
    if(action==="speed.start"){
      const q=quizBank[Math.floor(Math.random()*quizBank.length)];
      const pay=CHALLENGE_REWARDS.quiz;
      const ins=await s.from("game_sessions").insert({family_id:session.familyId,chat_id:session.chatId,game_type:"speed_quiz",prompt:q.q,answer:String(q.answer),options:q.options,reward_coins:pay.coins,expires_at:new Date(Date.now()+120000).toISOString()}).select("id,prompt,options,reward_coins").single();if(ins.error)throw ins.error;
      await sendMessage(session.chatId,`🏁 مسابقه سرعت خانوادگی\n\n${ins.data.prompt}\n\nاولین جواب درست، ${ins.data.reward_coins} Family Coin می‌بره!`,{reply_markup:{inline_keyboard:ins.data.options.map((option:string,index:number)=>[{text:option,callback_data:`quiz:${ins.data.id}:${index}`}])}});
      return NextResponse.json({ok:true,result:{sent:true,reward:ins.data.reward_coins}})
    }
    if(action==="quiz.answer"){
      const id=String(body?.sessionId||"");const option=Math.floor(Number(body?.option));const q=await s.from("game_sessions").select("id,answer,reward_coins,status,expires_at").eq("id",id).eq("family_id",session.familyId).eq("game_type","mini_quiz").single();if(q.error)throw q.error;
      if(q.data.status!=="open")return NextResponse.json({ok:true,result:{correct:false,reward:{coins:0,cp:0},alreadyClaimed:true}});
      if(q.data.expires_at&&new Date(q.data.expires_at).getTime()<Date.now()){await s.from("game_sessions").update({status:"closed"}).eq("id",id);return NextResponse.json({ok:false,error:"quiz_expired"},{status:409})}
      if(String(option)!==String(q.data.answer)){
        await s.from("game_sessions").update({status:"closed"}).eq("id",id).eq("status","open");
        return NextResponse.json({ok:true,result:{correct:false,reward:{coins:0,cp:0},alreadyClaimed:false}});
      }
      const won=await s.from("game_sessions").update({status:"closed",winner_bale_user_id:session.userId}).eq("id",id).eq("status","open").select("id").maybeSingle();
      if(!won.data)return NextResponse.json({ok:true,result:{correct:true,reward:{coins:0,cp:0},alreadyClaimed:true}});
      const pay=challengeReward("quiz");
      await grant(session.familyId,member,pay.coins,pay.cp,"quiz_win",{type:"game_session",id});
      return NextResponse.json({ok:true,result:{correct:true,reward:pay,alreadyClaimed:false}})
    }
    return NextResponse.json({ok:false,error:"unknown_action"},{status:400});
  }catch(error){console.error("family game action failed",error);const message=error instanceof Error?error.message:"game_failed";return NextResponse.json({ok:false,error:message},{status:500})}
}
