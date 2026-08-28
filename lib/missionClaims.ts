import { createClient } from "@supabase/supabase-js";
import { readMissions } from "./familyFeatures";

function db(){const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!url||!key)throw new Error("Family Core database is not configured");return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}})}
function periodKey(kind:string){const now=new Date();if(kind==="daily")return now.toISOString().slice(0,10);const d=new Date(now);d.setHours(0,0,0,0);d.setDate(d.getDate()-((d.getDay()+6)%7));return`week:${d.toISOString().slice(0,10)}`}

export async function claimMission(familyId:string,userId:number,missionId:string){
  const supabase=db();const member=await supabase.from("members").select("id").eq("family_id",familyId).eq("bale_user_id",userId).single();if(member.error)throw member.error;
  const missions=await readMissions(familyId,userId);const mission=missions.find(m=>m.id===missionId);if(!mission)throw new Error("unknown_mission");if(mission.progress<mission.target)throw new Error("mission_not_complete");const key=periodKey(mission.kind);
  const claim=await supabase.rpc("family_claim_mission_atomic",{p_family_id:familyId,p_member_id:member.data.id,p_mission_id:mission.id,p_period_key:key,p_reward:mission.reward});if(claim.error)throw claim.error;const row=claim.data as {claimed?:boolean;alreadyClaimed?:boolean;reward?:number;coins?:number}|null;
  return{alreadyClaimed:Boolean(row?.alreadyClaimed||!row?.claimed),reward:Number(row?.reward||0),coins:Number(row?.coins||0),mission};
}