import {createClient} from "@supabase/supabase-js";

const MEMORY_BUCKET="familybot-memories";
function db(){const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!url||!key)throw new Error("Family Core database is not configured");return createClient(url,key,{db:{schema:"familybot"},auth:{persistSession:false,autoRefreshToken:false}})}
function nextBirthday(dateText:string){const birthday=new Date(`${dateText}T00:00:00Z`),now=new Date();let next=new Date(Date.UTC(now.getUTCFullYear(),birthday.getUTCMonth(),birthday.getUTCDate()));if(next.getTime()<Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate()))next=new Date(Date.UTC(now.getUTCFullYear()+1,birthday.getUTCMonth(),birthday.getUTCDate()));return{next:next.toISOString(),days:Math.ceil((next.getTime()-Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate()))/86400000)}}
async function signedMemoryMedia(s:ReturnType<typeof db>,value:string|null|undefined){if(!value)return null;if(!value.startsWith("storage:"))return value;const signed=await s.storage.from(MEMORY_BUCKET).createSignedUrl(value.slice(8),1800);return signed.error?null:signed.data.signedUrl}
function founderRow<T extends {is_founder?:boolean|null;role?:string|null}>(row:T){return{...row,is_founder:Boolean(row.is_founder||row.role==="founder")}}

export async function readMiniAppDashboard(familyId:string,userId:number){
  const s=db(),now=new Date().toISOString();
  const[familyRes,profileRes,membersRes,allMembersRes,leaderboardRes,birthdaysRes,tasksRes,eventsRes,memoriesVisibilityRes,memoriesListRes,relationsRes,ownedRes]=await Promise.all([
    s.from("families").select("id,name,level,xp,coins,house_level").eq("id",familyId).single(),
    s.from("members").select("id,display_name,first_name,relation_label,bio,avatar_url,xp,coins,level,streak,birthday,role,is_founder").eq("family_id",familyId).eq("bale_user_id",userId).maybeSingle(),
    s.from("members").select("id",{count:"exact",head:true}).eq("family_id",familyId),
    s.from("members").select("id,bale_user_id,display_name,first_name,relation_label,avatar_url,xp,coins,level,birthday,role,is_founder").eq("family_id",familyId),
    s.from("members").select("id,bale_user_id,display_name,first_name,avatar_url,xp,coins,level,role,is_founder").eq("family_id",familyId).order("xp",{ascending:false}).limit(5),
    s.from("members").select("id,display_name,first_name,avatar_url,birthday").eq("family_id",familyId).not("birthday","is",null),
    s.from("tasks").select("id,title,status,due_at,reward_coins,assignee_member_id").eq("family_id",familyId).in("status",["open","doing"]).order("due_at",{ascending:true,nullsFirst:false}).limit(20),
    s.from("family_events").select("id,title,event_type,starts_at").eq("family_id",familyId).gte("starts_at",now).order("starts_at",{ascending:true}).limit(12),
    s.from("memories").select("id,creator_member_id,visibility").eq("family_id",familyId),
    s.from("memories").select("id,creator_member_id,title,caption,media_url,memory_date,tags,visibility,created_at").eq("family_id",familyId).order("memory_date",{ascending:false,nullsFirst:false}).limit(100),
    s.from("relationships").select("id,from_member_id,to_member_id,relation_type,created_at").eq("family_id",familyId).order("created_at",{ascending:true}),
    s.from("member_items").select("id,item_id,item_name,item_kind,price_paid,created_at").eq("family_id",familyId).order("created_at",{ascending:false}).limit(100)
  ]);
  for(const r of[familyRes,profileRes,membersRes,allMembersRes,leaderboardRes,birthdaysRes,tasksRes,eventsRes,memoriesVisibilityRes,memoriesListRes,relationsRes,ownedRes])if(r.error)throw r.error;
  const family=familyRes.data;if(!family)throw new Error("Family not found");
  const profile=profileRes.data?founderRow(profileRes.data):null;
  const ownMemberId=profile?.id||"";
  const viewerRes=ownMemberId?await s.from("memory_viewers").select("memory_id").eq("member_id",ownMemberId):{data:[],error:null};
  if(viewerRes.error)throw viewerRes.error;
  const allowed=new Set((viewerRes.data||[]).map(x=>x.memory_id));
  const visible=(r:{id?:string;creator_member_id?:string|null;visibility?:string|null})=>r.visibility==="family"||r.creator_member_id===ownMemberId||(r.visibility==="selected"&&Boolean(r.id&&allowed.has(r.id)));
  const raw=(memoriesListRes.data??[]).filter(visible).slice(0,24);
  const memories=await Promise.all(raw.map(async r=>({...r,media_url:await signedMemoryMedia(s,r.media_url)})));
  const birthdays=(birthdaysRes.data??[]).map(r=>({...r,...nextBirthday(r.birthday as string)})).sort((a,b)=>a.days-b.days).slice(0,12);
  const leaderboard=(leaderboardRes.data??[]).map(founderRow);
  const all=(allMembersRes.data??[]).map(founderRow);
  const ownXp=Number(profile?.xp||0),rank=profile?all.filter(r=>Number(r.xp||0)>ownXp).length+1:null;
  const memberXp=all.reduce((n,r)=>n+Number(r.xp||0),0),familyXp=Math.max(Number(family.xp||0),memberXp),derived=Math.max(1,Math.floor(familyXp/500)+1),level=Math.max(Number(family.level||1),derived),floor=(level-1)*500,ceil=level*500;
  return{
    family:{id:family.id,name:family.name,level,xp:familyXp,coins:Number(family.coins||0),houseLevel:Math.max(1,Math.min(10,Number(family.house_level||1))),membersCount:membersRes.count??0,upcomingEventsCount:eventsRes.data?.length??0,upcomingBirthdaysCount:birthdays.filter(b=>b.days<=30).length,memoriesCount:(memoriesVisibilityRes.data??[]).filter(visible).length,levelProgress:{current:Math.max(0,familyXp-floor),target:Math.max(1,ceil-floor)}},
    profile:profile?{...profile,rank}:null,
    members:all,
    leaderboard,
    birthdays,
    tasks:tasksRes.data??[],events:eventsRes.data??[],memories,relationships:relationsRes.data??[],ownedItems:ownedRes.data??[],
    permissions:{isFounder:Boolean(profile?.is_founder),canManage:Boolean(profile?.is_founder)},
    generatedAt:now
  };
}
