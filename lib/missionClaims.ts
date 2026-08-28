import { createClient } from "@supabase/supabase-js";
import { readMissions } from "./familyFeatures";

function db(){const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!url||!key)throw new Error("Family Core database is not configured");return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}})}
function periodKey(kind:string){const now=new Date();if(kind==="daily")return now.toISOString().slice(0,10);const d=new Date(now);d.setHours(0,0,0,0);d.setDate(d.getDate()-((d.getDay()+6)%7));return`week:${d.toISOString().slice(0,10)}`}

export async function claimMission(familyId:string,userId:number,missionId:string){
  const supabase=db();const member=await supabase.from("members").select("id,coins").eq("family_id",familyId).eq("bale_user_id",userId).single();if(member.error)throw member.error;
  const missions=await readMissions(familyId,userId);const mission=missions.find(m=>m.id===missionId);if(!mission)throw new Error("unknown_mission");if(mission.progress<mission.target)throw new Error("mission_not_complete");const key=periodKey(mission.kind);
  const existing=await supabase.from("mission_claims").select("id").eq("member_id",member.data.id).eq("mission_id",mission.id).eq("period_key",key).maybeSingle();if(existing.error)throw existing.error;if(existing.data)return{alreadyClaimed:true,reward:0,mission};
  const inserted=await supabase.from("mission_claims").insert({family_id:familyId,member_id:member.data.id,mission_id:mission.id,period_key:key,reward_coins:mission.reward}).select("id").single();if(inserted.error)throw inserted.error;const next=Number(member.data.coins||0)+mission.reward;const update=await supabase.from("members").update({coins:next}).eq("id",member.data.id);if(update.error)throw update.error;await supabase.from("coin_ledger").insert({family_id:familyId,member_id:member.data.id,amount:mission.reward,reason:"mission_claim",reference_type:"mission",reference_id:`${mission.id}:${key}`});return{alreadyClaimed:false,reward:mission.reward,coins:next,mission};
}
