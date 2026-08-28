import { createClient } from "@supabase/supabase-js";

function db(){const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!url||!key)throw new Error("Family Core database is not configured");return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}})}

function nextBirthday(dateText:string){const birthday=new Date(`${dateText}T00:00:00Z`),now=new Date();let next=new Date(Date.UTC(now.getUTCFullYear(),birthday.getUTCMonth(),birthday.getUTCDate()));if(next.getTime()<Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate()))next=new Date(Date.UTC(now.getUTCFullYear()+1,birthday.getUTCMonth(),birthday.getUTCDate()));const days=Math.ceil((next.getTime()-Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate()))/86400000);return{next:next.toISOString(),days}}

export async function readMiniAppDashboard(familyId:string,userId:number){
  const supabase=db(),now=new Date().toISOString();
  const [familyRes,profileRes,membersRes,allMembersRes,leaderboardRes,birthdaysRes,tasksRes,eventsRes,memoriesVisibilityRes,memoriesListRes,relationsRes,ownedRes]=await Promise.all([
    supabase.from("families").select("id,name,level,xp,coins,house_level").eq("id",familyId).single(),
    supabase.from("members").select("id,display_name,first_name,relation_label,bio,avatar_url,xp,coins,level,streak,birthday").eq("family_id",familyId).eq("bale_user_id",userId).maybeSingle(),
    supabase.from("members").select("id",{count:"exact",head:true}).eq("family_id",familyId),
    supabase.from("members").select("id,bale_user_id,display_name,first_name,relation_label,avatar_url,xp,coins,level,birthday").eq("family_id",familyId),
    supabase.from("members").select("id,bale_user_id,display_name,first_name,avatar_url,xp,coins,level").eq("family_id",familyId).order("xp",{ascending:false}).limit(10),
    supabase.from("members").select("id,display_name,first_name,avatar_url,birthday").eq("family_id",familyId).not("birthday","is",null),
    supabase.from("tasks").select("id,title,status,due_at,reward_coins,assignee_member_id").eq("family_id",familyId).in("status",["open","doing"]).order("due_at",{ascending:true,nullsFirst:false}).limit(20),
    supabase.from("family_events").select("id,title,event_type,starts_at").eq("family_id",familyId).gte("starts_at",now).order("starts_at",{ascending:true}).limit(12),
    supabase.from("memories").select("id,creator_member_id,visibility").eq("family_id",familyId),
    supabase.from("memories").select("id,creator_member_id,title,caption,media_url,memory_date,tags,visibility,created_at").eq("family_id",familyId).order("memory_date",{ascending:false,nullsFirst:false}).limit(100),
    supabase.from("relationships").select("id,from_member_id,to_member_id,relation_type,created_at").eq("family_id",familyId).order("created_at",{ascending:true}),
    supabase.from("member_items").select("id,item_id,item_name,item_kind,price_paid,created_at").eq("family_id",familyId).order("created_at",{ascending:false}).limit(100),
  ]);
  for(const result of [familyRes,profileRes,membersRes,allMembersRes,leaderboardRes,birthdaysRes,tasksRes,eventsRes,memoriesVisibilityRes,memoriesListRes,relationsRes,ownedRes])if(result.error)throw result.error;
  const family=familyRes.data;if(!family)throw new Error("Family not found");
  const ownMemberId=profileRes.data?.id||"";
  const visibleMemory=(row:{creator_member_id?:string|null;visibility?:string|null})=>row.visibility!=="private"||row.creator_member_id===ownMemberId;
  const visibleMemories=(memoriesListRes.data??[]).filter(visibleMemory).slice(0,24);
  const visibleMemoriesCount=(memoriesVisibilityRes.data??[]).filter(visibleMemory).length;
  const birthdays=(birthdaysRes.data??[]).map(row=>({...row,...nextBirthday(row.birthday as string)})).sort((a,b)=>a.days-b.days).slice(0,12);
  const leaderboard=leaderboardRes.data??[],allMembers=allMembersRes.data??[],ownXp=Number(profileRes.data?.xp||0),rank=profileRes.data?allMembers.filter(row=>Number(row.xp||0)>ownXp).length+1:null;
  const memberXpTotal=allMembers.reduce((sum,row)=>sum+Number(row.xp||0),0),familyXp=Math.max(Number(family.xp||0),memberXpTotal),derivedLevel=Math.max(1,Math.floor(familyXp/500)+1),levelBase=Math.max(Number(family.level||1),derivedLevel),levelFloor=Math.max(0,(levelBase-1)*500),levelCeil=levelBase*500;
  return{
    family:{id:family.id,name:family.name,level:levelBase,xp:familyXp,coins:Number(family.coins||0),houseLevel:Math.max(Number(family.house_level||1),levelBase),membersCount:membersRes.count??0,upcomingEventsCount:eventsRes.data?.length??0,upcomingBirthdaysCount:birthdays.filter(b=>b.days<=30).length,memoriesCount:visibleMemoriesCount,levelProgress:{current:Math.max(0,familyXp-levelFloor),target:Math.max(1,levelCeil-levelFloor)}},
    profile:profileRes.data?{...profileRes.data,rank}:null,
    members:allMembers,
    leaderboard,birthdays,tasks:tasksRes.data??[],events:eventsRes.data??[],memories:visibleMemories,relationships:relationsRes.data??[],ownedItems:ownedRes.data??[],generatedAt:now,
  };
}
