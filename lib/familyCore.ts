import {createClient} from "@supabase/supabase-js";

type BaleIdentity={id:number;first_name?:string;last_name?:string;username?:string;photo_url?:string};
export type FamilyContext={
  family:{id:string;bale_chat_id:number;name:string;level:number;xp:number;coins:number};
  member:{id:string;bale_user_id:number;display_name:string|null;first_name:string|null;avatar_url?:string|null;xp:number;coins:number;level:number;streak:number;created_at:string;role?:string|null;is_founder?:boolean|null};
};
export type GroupSettings={anti_flood:boolean;anti_link:boolean;flood_limit:number;flood_window_seconds:number;flood_mute_minutes:number;warn_limit:number;welcome_enabled:boolean};

function db(){
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!key)return null;
  return createClient(url,key,{db:{schema:"familybot"},auth:{persistSession:false,autoRefreshToken:false}});
}
export function familyCoreEnabled(){return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL&&process.env.SUPABASE_SERVICE_ROLE_KEY)}
export function isFounder(ctx:FamilyContext|null|undefined){return Boolean(ctx?.member?.is_founder||ctx?.member?.role==="founder")}

export async function ensureFamilyMember(chatId:number,chatTitle:string|undefined,user:BaleIdentity):Promise<FamilyContext|null>{
  const s=db();if(!s)return null;
  let family=await s.from("families").select("id,bale_chat_id,name,level,xp,coins").eq("bale_chat_id",chatId).maybeSingle();
  if(family.error)throw family.error;
  if(!family.data){
    family=await s.from("families").insert({bale_chat_id:chatId,name:chatTitle||"خانواده ما"}).select("id,bale_chat_id,name,level,xp,coins").single();
    if(family.error)throw family.error;
  }
  const display=[user.first_name,user.last_name].filter(Boolean).join(" ")||user.username||`عضو ${user.id}`;
  const payload:Record<string,unknown>={family_id:family.data.id,bale_user_id:user.id,first_name:user.first_name??null,last_name:user.last_name??null,username:user.username??null,display_name:display,last_active_at:new Date().toISOString()};
  if(user.photo_url)payload.avatar_url=user.photo_url;
  const member=await s.from("members").upsert(payload,{onConflict:"family_id,bale_user_id"}).select("id,bale_user_id,display_name,first_name,avatar_url,xp,coins,level,streak,created_at,role,is_founder").single();
  if(member.error)throw member.error;
  const settings=await s.from("group_settings").upsert({family_id:family.data.id},{onConflict:"family_id",ignoreDuplicates:true});
  if(settings.error)throw settings.error;
  return{family:family.data,member:member.data} as FamilyContext;
}

export async function addActivityReward(ctx:FamilyContext,reason="message",amountXp=1){
  const s=db();if(!s||amountXp<=0)return;
  const reward=await s.rpc("family_add_member_xp",{p_member_id:ctx.member.id,p_delta:amountXp});
  if(reward.error)throw reward.error;
  const log=await s.from("activity_log").insert({family_id:ctx.family.id,member_id:ctx.member.id,activity_type:reason,xp_delta:amountXp});
  if(log.error)throw log.error;
}
export async function getProfile(ctx:FamilyContext){
  const s=db();if(!s)return ctx.member;
  const r=await s.from("members").select("display_name,first_name,avatar_url,xp,coins,level,streak,role,is_founder").eq("id",ctx.member.id).single();
  if(r.error)return ctx.member;
  return r.data;
}
export async function getLeaderboard(familyId:string,limit=5){
  const s=db();if(!s)return[];
  const r=await s.from("members").select("display_name,first_name,avatar_url,xp,level,coins,is_founder").eq("family_id",familyId).order("xp",{ascending:false}).limit(Math.max(1,Math.min(5,limit)));
  if(r.error)throw r.error;return r.data??[];
}
export async function claimDaily(ctx:FamilyContext){
  const s=db();if(!s)return{ok:false as const,reason:"disabled"};
  const day=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Tehran",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
  const r=await s.rpc("family_claim_daily_atomic",{p_family_id:ctx.family.id,p_member_id:ctx.member.id,p_claim_date:day,p_reward:25});
  if(r.error)throw r.error;
  const row=r.data as {claimed?:boolean;reward?:number;coins?:number}|null;
  if(!row?.claimed)return{ok:false as const,reason:"claimed"};
  return{ok:true as const,reward:Number(row.reward||25),coins:Number(row.coins||0)};
}
export async function addWarning(familyId:string,actorId:number,targetId:number,reason?:string){
  const s=db();if(!s)return 0;
  const r=await s.from("warnings").insert({family_id:familyId,actor_bale_user_id:actorId,target_bale_user_id:targetId,reason:reason||null}).select("id").single();
  if(r.error)throw r.error;return countWarnings(familyId,targetId);
}
export async function countWarnings(familyId:string,targetId:number){
  const s=db();if(!s)return 0;
  const r=await s.from("warnings").select("id",{count:"exact",head:true}).eq("family_id",familyId).eq("target_bale_user_id",targetId).is("cleared_at",null);
  if(r.error)throw r.error;return r.count??0;
}
export async function clearWarnings(familyId:string,targetId:number){
  const s=db();if(!s)return;
  const r=await s.from("warnings").update({cleared_at:new Date().toISOString()}).eq("family_id",familyId).eq("target_bale_user_id",targetId).is("cleared_at",null);
  if(r.error)throw r.error;
}
export async function getGroupSettings(familyId:string):Promise<GroupSettings>{
  const defaults:GroupSettings={anti_flood:true,anti_link:false,flood_limit:5,flood_window_seconds:5,flood_mute_minutes:10,warn_limit:3,welcome_enabled:true};
  const s=db();if(!s)return defaults;
  const r=await s.from("group_settings").select("anti_flood,anti_link,flood_limit,flood_window_seconds,flood_mute_minutes,warn_limit,welcome_enabled").eq("family_id",familyId).maybeSingle();
  if(r.error)throw r.error;return{...defaults,...(r.data??{})};
}
export async function recordFloodEvent(familyId:string,userId:number,settings:GroupSettings){
  const s=db();if(!s||!settings.anti_flood)return{exceeded:false,count:0};
  const cutoff=new Date(Date.now()-settings.flood_window_seconds*1000).toISOString();
  const ins=await s.from("flood_events").insert({family_id:familyId,bale_user_id:userId});if(ins.error)throw ins.error;
  const r=await s.from("flood_events").select("id",{count:"exact",head:true}).eq("family_id",familyId).eq("bale_user_id",userId).gte("created_at",cutoff);
  if(r.error)throw r.error;const count=r.count??0;
  if(count>settings.flood_limit)await s.from("flood_events").delete().eq("family_id",familyId).eq("bale_user_id",userId).lt("created_at",new Date().toISOString());
  return{exceeded:count>settings.flood_limit,count};
}
export async function logModeration(familyId:string,actorId:number|undefined,targetId:number|undefined,action:string,reason?:string){
  const s=db();if(!s)return;
  const r=await s.from("moderation_actions").insert({family_id:familyId,actor_bale_user_id:actorId??null,target_bale_user_id:targetId??null,action,reason:reason||null});if(r.error)throw r.error;
}
export async function createQuizSession(ctx:FamilyContext){
  const s=db();if(!s)return null;
  const bank=[
    {q:"کدام سیاره به سیاره سرخ معروف است؟",options:["زمین","مریخ","زهره","مشتری"],answer:"1"},
    {q:"حاصل ۷ × ۸ چند است؟",options:["۵۴","۵۶","۵۸","۶۴"],answer:"1"},
    {q:"پایتخت ایران کدام شهر است؟",options:["شیراز","تهران","تبریز","مشهد"],answer:"1"},
    {q:"کدام حیوان سریع‌ترین جانور خشکی است؟",options:["یوزپلنگ","اسب","گرگ","شیر"],answer:"0"}
  ];
  const q=bank[Math.floor(Math.random()*bank.length)];
  const r=await s.from("game_sessions").insert({family_id:ctx.family.id,chat_id:ctx.family.bale_chat_id,game_type:"quiz",prompt:q.q,answer:q.answer,options:q.options,reward_coins:15,expires_at:new Date(Date.now()+120000).toISOString()}).select("id,prompt,options,reward_coins").single();
  if(r.error)throw r.error;return r.data as {id:string;prompt:string;options:string[];reward_coins:number};
}
export async function resolveQuiz(sessionId:string,userId:number,optionIndex:number,ctx:FamilyContext){
  const s=db();if(!s)return{ok:false as const,reason:"disabled"};
  const row=await s.from("game_sessions").select("id,answer,reward_coins,status,expires_at").eq("id",sessionId).maybeSingle();
  const session=row.data;if(!session||session.status!=="open")return{ok:false as const,reason:"closed"};
  if(session.expires_at&&new Date(session.expires_at).getTime()<Date.now()){await s.from("game_sessions").update({status:"closed"}).eq("id",sessionId);return{ok:false as const,reason:"expired"};}
  if(String(optionIndex)!==String(session.answer))return{ok:false as const,reason:"wrong"};
  const reward=Number(session.reward_coins||15);
  const won=await s.from("game_sessions").update({status:"closed",winner_bale_user_id:userId}).eq("id",sessionId).eq("status","open").select("id").maybeSingle();
  if(!won.data)return{ok:false as const,reason:"closed"};
  const bal=await s.rpc("family_add_member_coins",{p_member_id:ctx.member.id,p_delta:reward});if(bal.error)throw bal.error;
  const led=await s.from("coin_ledger").insert({family_id:ctx.family.id,member_id:ctx.member.id,amount:reward,reason:"quiz_win",reference_type:"game_session",reference_id:sessionId});if(led.error)throw led.error;
  await addActivityReward(ctx,"quiz_win",10);return{ok:true as const,reward};
}
