import { createClient } from "@supabase/supabase-js";

function db(){const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!url||!key)throw new Error("Family Core database is not configured");return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}})}

async function member(familyId:string,userId:number){const r=await db().from("members").select("id,bale_user_id,display_name,first_name,coins,xp,level,streak").eq("family_id",familyId).eq("bale_user_id",userId).single();if(r.error)throw r.error;return r.data}

export async function createFamilyEvent(familyId:string,userId:number,input:{title?:string;description?:string;startsAt?:string;endsAt?:string|null;location?:string;eventType?:string}){
  const m=await member(familyId,userId);const title=String(input.title||"").trim().slice(0,160);const startsAt=String(input.startsAt||"").trim();if(!title||!startsAt)throw new Error("event_title_and_time_required");
  const {data,error}=await db().from("family_events").insert({family_id:familyId,creator_member_id:m.id,title,description:String(input.description||"").slice(0,1200)||null,event_type:String(input.eventType||"event").slice(0,40),starts_at:startsAt,ends_at:input.endsAt||null,location_text:String(input.location||"").slice(0,240)||null}).select("id,title,description,event_type,starts_at,ends_at,location_text,created_at").single();if(error)throw error;return data;
}

export async function createFamilyPoll(familyId:string,userId:number,input:{question?:string;options?:string[];anonymous?:boolean;closesAt?:string|null}){
  const m=await member(familyId,userId);const question=String(input.question||"").trim().slice(0,300);const options=(input.options||[]).map(x=>String(x).trim().slice(0,120)).filter(Boolean).slice(0,8);if(!question||options.length<2)throw new Error("poll_question_and_options_required");
  const {data,error}=await db().from("polls").insert({family_id:familyId,creator_member_id:m.id,question,options,anonymous:Boolean(input.anonymous),closes_at:input.closesAt||null}).select("id,question,options,anonymous,closes_at,created_at").single();if(error)throw error;return data;
}

export async function voteFamilyPoll(familyId:string,userId:number,pollId:string,optionIndex:number){
  const supabase=db();const m=await member(familyId,userId);const poll=await supabase.from("polls").select("id,options,closes_at").eq("id",pollId).eq("family_id",familyId).single();if(poll.error)throw poll.error;if(poll.data.closes_at&&new Date(poll.data.closes_at).getTime()<Date.now())throw new Error("poll_closed");const options=Array.isArray(poll.data.options)?poll.data.options:[];if(optionIndex<0||optionIndex>=options.length)throw new Error("invalid_poll_option");
  const {data,error}=await supabase.from("poll_votes").upsert({poll_id:pollId,member_id:m.id,option_index:optionIndex},{onConflict:"poll_id,member_id"}).select("id,poll_id,option_index,created_at").single();if(error)throw error;return data;
}

export async function transferFamilyCoins(familyId:string,userId:number,input:{targetUserId?:number;targetMemberId?:string;amount?:number;note?:string}){
  const supabase=db();const sender=await member(familyId,userId);const amount=Math.max(1,Math.min(100000,Math.floor(Number(input.amount)||0)));if(!amount)throw new Error("invalid_amount");let targetQuery=supabase.from("members").select("id,bale_user_id,display_name,first_name").eq("family_id",familyId);targetQuery=input.targetMemberId?targetQuery.eq("id",input.targetMemberId):targetQuery.eq("bale_user_id",Number(input.targetUserId));const target=await targetQuery.single();if(target.error)throw target.error;if(target.data.id===sender.id)throw new Error("cannot_transfer_to_self");
  const result=await supabase.rpc("family_transfer_coins_atomic",{p_family_id:familyId,p_sender_id:sender.id,p_target_id:target.data.id,p_amount:amount});if(result.error)throw result.error;const row=result.data as {senderCoins?:number;targetCoins?:number;amount?:number}|null;
  return{amount:Number(row?.amount||amount),note:String(input.note||"").slice(0,200)||null,senderCoins:Number(row?.senderCoins||0),target:{id:target.data.id,bale_user_id:target.data.bale_user_id,name:target.data.display_name||target.data.first_name||"عضو خانواده",coins:Number(row?.targetCoins||0)}};
}

const ACHIEVEMENTS=[
  {id:"first_task",title:"دست به کار",description:"اولین کار خانوادگی را کامل کن",icon:"tasks",reward:20},
  {id:"memory_keeper",title:"خاطره‌نگار",description:"اولین خاطره خانواده را ثبت کن",icon:"memories",reward:20},
  {id:"quiz_winner",title:"ذهن درخشان",description:"یک کوئیز خانوادگی را ببر",icon:"trophy",reward:25},
  {id:"social_100",title:"عضو فعال",description:"به ۱۰۰ XP برس",icon:"spark",reward:30},
] as const;

export async function evaluateAchievements(familyId:string,userId:number){
  const supabase=db();const m=await member(familyId,userId);const [tasks,memories,quiz]=await Promise.all([supabase.from("tasks").select("id",{count:"exact",head:true}).eq("family_id",familyId).eq("assignee_member_id",m.id).eq("status","done"),supabase.from("memories").select("id",{count:"exact",head:true}).eq("family_id",familyId).eq("creator_member_id",m.id),supabase.from("coin_ledger").select("id",{count:"exact",head:true}).eq("family_id",familyId).eq("member_id",m.id).eq("reason","quiz_win")]);
  const eligible=new Set<string>();if((tasks.count||0)>0)eligible.add("first_task");if((memories.count||0)>0)eligible.add("memory_keeper");if((quiz.count||0)>0)eligible.add("quiz_winner");if(Number(m.xp||0)>=100)eligible.add("social_100");
  await supabase.from("achievements").upsert(ACHIEVEMENTS.map(a=>({id:a.id,title:a.title,description:a.description,icon:a.icon,reward_coins:a.reward})),{onConflict:"id"});const owned=await supabase.from("member_achievements").select("achievement_id").eq("member_id",m.id);if(owned.error)throw owned.error;const ownedSet=new Set((owned.data||[]).map(x=>x.achievement_id));let reward=0;const unlocked:string[]=[];for(const id of eligible){if(ownedSet.has(id))continue;const a=ACHIEVEMENTS.find(x=>x.id===id)!;const ins=await supabase.from("member_achievements").insert({member_id:m.id,achievement_id:id});if(!ins.error){const balance=await supabase.rpc("family_add_member_coins",{p_member_id:m.id,p_delta:a.reward});if(balance.error)throw balance.error;reward+=a.reward;unlocked.push(id);await supabase.from("coin_ledger").insert({family_id:familyId,member_id:m.id,amount:a.reward,reason:"achievement_unlock",reference_type:"achievement",reference_id:id})}}
  return{unlocked,reward,catalog:ACHIEVEMENTS};
}

export async function readMissions(familyId:string,userId:number){
  const supabase=db();const m=await member(familyId,userId);const today=new Date();today.setHours(0,0,0,0);const week=new Date(today);week.setDate(today.getDate()-((today.getDay()+6)%7));const [dailyMessages,dailyTasks,weeklyGames]=await Promise.all([supabase.from("activity_log").select("id",{count:"exact",head:true}).eq("family_id",familyId).eq("member_id",m.id).eq("activity_type","message").gte("created_at",today.toISOString()),supabase.from("tasks").select("id",{count:"exact",head:true}).eq("family_id",familyId).eq("assignee_member_id",m.id).eq("status","done").gte("completed_at",today.toISOString()),supabase.from("activity_log").select("id",{count:"exact",head:true}).eq("family_id",familyId).eq("member_id",m.id).in("activity_type",["quiz_win","game_win"]).gte("created_at",week.toISOString())]);
  return[
    {id:"daily_messages",title:"گفت‌وگوی خانوادگی",kind:"daily",progress:Math.min(10,dailyMessages.count||0),target:10,reward:10},
    {id:"daily_task",title:"یک کار رو تموم کن",kind:"daily",progress:Math.min(1,dailyTasks.count||0),target:1,reward:20},
    {id:"weekly_games",title:"۳ برد این هفته",kind:"weekly",progress:Math.min(3,weeklyGames.count||0),target:3,reward:40},
  ];
}

export async function readPollsAndEvents(familyId:string){const supabase=db();const [polls,events]=await Promise.all([supabase.from("polls").select("id,question,options,anonymous,closes_at,created_at").eq("family_id",familyId).order("created_at",{ascending:false}).limit(10),supabase.from("family_events").select("id,title,description,event_type,starts_at,ends_at,location_text,created_at").eq("family_id",familyId).order("starts_at",{ascending:true}).limit(20)]);if(polls.error)throw polls.error;if(events.error)throw events.error;return{polls:polls.data||[],events:events.data||[]}}
