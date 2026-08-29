import { createClient } from "@supabase/supabase-js";

function db(){const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!url||!key)throw new Error("Family Core database is not configured");return createClient(url,key,{db:{schema:"familybot"},auth:{persistSession:false,autoRefreshToken:false}})}

export async function readPlannerData(familyId:string){
  const supabase=db();
  const [pollsRes,eventsRes]=await Promise.all([
    supabase.from("polls").select("id,creator_member_id,question,options,anonymous,closes_at,created_at").eq("family_id",familyId).order("created_at",{ascending:false}).limit(10),
    supabase.from("family_events").select("id,creator_member_id,title,description,event_type,starts_at,ends_at,location_text,created_at").eq("family_id",familyId).order("starts_at",{ascending:true}).limit(20),
  ]);
  if(pollsRes.error)throw pollsRes.error;if(eventsRes.error)throw eventsRes.error;
  const polls=pollsRes.data||[];const ids=polls.map(p=>p.id);let votes:Array<{poll_id:string;option_index:number}>=[];
  if(ids.length){const voteRes=await supabase.from("poll_votes").select("poll_id,option_index").in("poll_id",ids);if(voteRes.error)throw voteRes.error;votes=(voteRes.data||[]) as Array<{poll_id:string;option_index:number}>}
  const now=Date.now();
  const rich=polls.map(p=>{const options=Array.isArray(p.options)?p.options.map(String):[];const own=votes.filter(v=>v.poll_id===p.id);const counts=options.map((_,i)=>own.filter(v=>v.option_index===i).length);const total=counts.reduce((a,b)=>a+b,0);const closed=Boolean(p.closes_at&&new Date(p.closes_at).getTime()<=now);return{...p,closed,options,results:counts.map((count,i)=>({option:options[i],count,percent:total?Math.round(count/total*100):0})),totalVotes:total}});
  return{polls:rich,events:eventsRes.data||[]};
}
