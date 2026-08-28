import { createClient } from "@supabase/supabase-js";

function db(){const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!url||!key)throw new Error("Family Core database is not configured");return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}})}

async function ownMemberId(familyId:string,userId:number){const {data,error}=await db().from("members").select("id").eq("family_id",familyId).eq("bale_user_id",userId).single();if(error)throw error;return data.id as string}

export async function closeOwnPoll(familyId:string,userId:number,pollId:string){const supabase=db();const memberId=await ownMemberId(familyId,userId);const poll=await supabase.from("polls").select("id,creator_member_id,closes_at").eq("family_id",familyId).eq("id",pollId).single();if(poll.error)throw poll.error;if(poll.data.creator_member_id!==memberId)throw new Error("poll_not_owned");const closedAt=new Date().toISOString();const {data,error}=await supabase.from("polls").update({closes_at:closedAt}).eq("id",pollId).eq("family_id",familyId).select("id,closes_at").single();if(error)throw error;return data}

export async function cancelOwnEvent(familyId:string,userId:number,eventId:string){const supabase=db();const memberId=await ownMemberId(familyId,userId);const event=await supabase.from("family_events").select("id,creator_member_id,title").eq("family_id",familyId).eq("id",eventId).single();if(event.error)throw event.error;if(event.data.creator_member_id!==memberId)throw new Error("event_not_owned");const {error}=await supabase.from("family_events").delete().eq("family_id",familyId).eq("id",eventId);if(error)throw error;return{id:eventId,title:event.data.title}}
