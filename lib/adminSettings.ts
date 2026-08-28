import { createClient } from "@supabase/supabase-js";

export type AdminGroupSettings={
  anti_flood:boolean;anti_link:boolean;
  lock_photo:boolean;lock_video:boolean;lock_document:boolean;lock_forward:boolean;
  lock_sticker:boolean;lock_gif:boolean;lock_voice:boolean;lock_audio:boolean;lock_text:boolean;
  flood_limit:number;flood_window_seconds:number;flood_mute_minutes:number;warn_limit:number;
  welcome_enabled:boolean;welcome_message:string;
  timezone:string;task_reminders_enabled:boolean;event_reminders_enabled:boolean;birthday_reminders_enabled:boolean;
  task_reminder_minutes:number;event_reminder_minutes:number;birthday_hour:number;
};

const defaults:AdminGroupSettings={
  anti_flood:true,anti_link:false,
  lock_photo:false,lock_video:false,lock_document:false,lock_forward:false,
  lock_sticker:false,lock_gif:false,lock_voice:false,lock_audio:false,lock_text:false,
  flood_limit:5,flood_window_seconds:5,flood_mute_minutes:10,warn_limit:3,
  welcome_enabled:true,welcome_message:"💜 {name} خوش اومدی!\nاینجا خونه دیجیتال خانواده‌ست؛ بازی، خاطره، برنامه و Family AI همه کنار هم هستن.",
  timezone:"Asia/Tehran",task_reminders_enabled:true,event_reminders_enabled:true,birthday_reminders_enabled:true,
  task_reminder_minutes:60,event_reminder_minutes:60,birthday_hour:9
};

function db(){const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!url||!key)throw new Error("Family Core database is not configured");return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}})}
const columns="anti_flood,anti_link,lock_photo,lock_video,lock_document,lock_forward,lock_sticker,lock_gif,lock_voice,lock_audio,lock_text,flood_limit,flood_window_seconds,flood_mute_minutes,warn_limit,welcome_enabled,welcome_message,timezone,task_reminders_enabled,event_reminders_enabled,birthday_reminders_enabled,task_reminder_minutes,event_reminder_minutes,birthday_hour";

function validTimezone(value:unknown){const tz=String(value||defaults.timezone).slice(0,80);try{new Intl.DateTimeFormat("en-US",{timeZone:tz}).format(new Date());return tz}catch{return defaults.timezone}}
function reminderMinutes(value:unknown,fallback:number){const n=Number(value);return [15,60,1440].includes(n)?n:fallback}

export async function readAdminSettings(familyId:string){const {data,error}=await db().from("group_settings").select(columns).eq("family_id",familyId).maybeSingle();if(error)throw error;return {...defaults,...(data??{})} as AdminGroupSettings}

export async function writeAdminSettings(familyId:string,input:Partial<AdminGroupSettings>){
  const clean:AdminGroupSettings={
    anti_flood:Boolean(input.anti_flood),anti_link:Boolean(input.anti_link),
    lock_photo:Boolean(input.lock_photo),lock_video:Boolean(input.lock_video),lock_document:Boolean(input.lock_document),lock_forward:Boolean(input.lock_forward),
    lock_sticker:Boolean(input.lock_sticker),lock_gif:Boolean(input.lock_gif),lock_voice:Boolean(input.lock_voice),lock_audio:Boolean(input.lock_audio),lock_text:Boolean(input.lock_text),
    welcome_enabled:Boolean(input.welcome_enabled),welcome_message:String(input.welcome_message||defaults.welcome_message).slice(0,1500),
    flood_limit:Math.max(3,Math.min(20,Number(input.flood_limit)||5)),flood_window_seconds:Math.max(2,Math.min(30,Number(input.flood_window_seconds)||5)),flood_mute_minutes:Math.max(1,Math.min(10080,Number(input.flood_mute_minutes)||10)),warn_limit:Math.max(1,Math.min(10,Number(input.warn_limit)||3)),
    timezone:validTimezone(input.timezone),task_reminders_enabled:Boolean(input.task_reminders_enabled),event_reminders_enabled:Boolean(input.event_reminders_enabled),birthday_reminders_enabled:Boolean(input.birthday_reminders_enabled),
    task_reminder_minutes:reminderMinutes(input.task_reminder_minutes,60),event_reminder_minutes:reminderMinutes(input.event_reminder_minutes,60),birthday_hour:Math.max(0,Math.min(23,Number(input.birthday_hour)||9))
  };
  const {data,error}=await db().from("group_settings").upsert({family_id:familyId,...clean,updated_at:new Date().toISOString()},{onConflict:"family_id"}).select(columns).single();if(error)throw error;return data as AdminGroupSettings
}

export async function readModerationLog(familyId:string,limit=30){const {data,error}=await db().from("moderation_actions").select("id,actor_bale_user_id,target_bale_user_id,action,reason,metadata,created_at").eq("family_id",familyId).order("created_at",{ascending:false}).limit(Math.max(1,Math.min(100,limit)));if(error)throw error;return data??[]}

export async function readWhitelist(familyId:string){const {data,error}=await db().from("moderation_whitelist").select("bale_user_id,label,created_at").eq("family_id",familyId).order("created_at",{ascending:false});if(error)throw error;return data??[]}
export async function replaceWhitelist(familyId:string,rows:Array<{bale_user_id:number;label?:string}>){const supabase=db();const clean=rows.filter(x=>Number.isFinite(Number(x.bale_user_id))).slice(0,100).map(x=>({family_id:familyId,bale_user_id:Number(x.bale_user_id),label:String(x.label||"").slice(0,80)||null}));const del=await supabase.from("moderation_whitelist").delete().eq("family_id",familyId);if(del.error)throw del.error;if(clean.length){const ins=await supabase.from("moderation_whitelist").insert(clean);if(ins.error)throw ins.error}return readWhitelist(familyId)}
export async function isWhitelisted(familyId:string,userId:number){const {data,error}=await db().from("moderation_whitelist").select("bale_user_id").eq("family_id",familyId).eq("bale_user_id",userId).maybeSingle();if(error)throw error;return Boolean(data)}

export async function readAdminStats(familyId:string){
  const supabase=db();const since=new Date(Date.now()-24*60*60*1000).toISOString();
  const [members,warnings,moderation,activity,deleted]=await Promise.all([
    supabase.from("members").select("id",{count:"exact",head:true}).eq("family_id",familyId),
    supabase.from("warnings").select("id",{count:"exact",head:true}).eq("family_id",familyId).is("cleared_at",null),
    supabase.from("moderation_actions").select("id",{count:"exact",head:true}).eq("family_id",familyId).gte("created_at",since),
    supabase.from("activity_log").select("id",{count:"exact",head:true}).eq("family_id",familyId).gte("created_at",since),
    supabase.from("moderation_actions").select("id",{count:"exact",head:true}).eq("family_id",familyId).in("action",["content_lock","anti_link_delete","anti_flood_mute"]).gte("created_at",since)
  ]);
  return {members:members.count??0,activeWarnings:warnings.count??0,moderation24h:moderation.count??0,activity24h:activity.count??0,deleted24h:deleted.count??0};
}
