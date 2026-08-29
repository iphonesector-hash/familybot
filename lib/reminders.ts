import { createClient } from "@supabase/supabase-js";
import { sendMessage } from "@/lib/bale";
import { readAdminSettings } from "@/lib/adminSettings";

function db(){const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!url||!key)throw new Error("Family Core database is not configured");return createClient(url,key,{db:{schema:"familybot"},auth:{persistSession:false,autoRefreshToken:false}})}

type ReminderKind="task"|"event"|"birthday";

async function delivered(familyId:string,kind:ReminderKind,referenceId:string,slot:string){const supabase=db();const found=await supabase.from("notification_deliveries").select("id").eq("family_id",familyId).eq("kind",kind).eq("reference_id",referenceId).eq("delivery_slot",slot).maybeSingle();if(found.error)throw found.error;return Boolean(found.data)}
async function markDelivered(familyId:string,kind:ReminderKind,referenceId:string,slot:string){const {error}=await db().from("notification_deliveries").insert({family_id:familyId,kind,reference_id:referenceId,delivery_slot:slot});if(error&&error.code!=="23505")throw error}
function hourSlot(date=new Date()){return date.toISOString().slice(0,13)}
function localParts(date:Date,timeZone:string){const parts=new Intl.DateTimeFormat("en-CA",{timeZone,year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",hourCycle:"h23"}).formatToParts(date);const get=(type:string)=>parts.find(x=>x.type===type)?.value||"";return{date:`${get("year")}-${get("month")}-${get("day")}`,month:Number(get("month")),day:Number(get("day")),hour:Number(get("hour"))}}
function faDate(value:string,timeZone:string){return new Date(value).toLocaleString("fa-IR",{timeZone,month:"long",day:"numeric",hour:"2-digit",minute:"2-digit"})}
function reminderLabel(minutes:number){if(minutes===1440)return"حدود یک روز";if(minutes===60)return"حدود یک ساعت";return"حدود ۱۵ دقیقه"}

export async function dispatchDueReminders(){
  const supabase=db();const now=new Date();let sent=0;
  const families=await supabase.from("families").select("id,bale_chat_id,name");if(families.error)throw families.error;
  for(const family of families.data||[]){
    const settings=await readAdminSettings(family.id).catch(()=>null);if(!settings)continue;
    const local=localParts(now,settings.timezone||"Asia/Tehran"),slot=hourSlot(now);
    if(settings.task_reminders_enabled){
      const to=new Date(now.getTime()+Math.max(15,settings.task_reminder_minutes)*60_000).toISOString();
      const tasks=await supabase.from("tasks").select("id,title,due_at").eq("family_id",family.id).in("status",["open","doing"]).not("due_at","is",null).gte("due_at",now.toISOString()).lte("due_at",to).limit(30);if(tasks.error)throw tasks.error;
      for(const task of tasks.data||[]){if(await delivered(family.id,"task",task.id,slot))continue;await sendMessage(family.bale_chat_id,`⏰ یادآوری کار خانوادگی\n${task.title}\nموعد: ${faDate(task.due_at,settings.timezone)}\n${reminderLabel(settings.task_reminder_minutes)} تا موعد باقی مانده.`);await markDelivered(family.id,"task",task.id,slot);sent++}
    }
    if(settings.event_reminders_enabled){
      const to=new Date(now.getTime()+Math.max(15,settings.event_reminder_minutes)*60_000).toISOString();
      const events=await supabase.from("family_events").select("id,title,starts_at").eq("family_id",family.id).gte("starts_at",now.toISOString()).lte("starts_at",to).limit(30);if(events.error)throw events.error;
      for(const event of events.data||[]){if(await delivered(family.id,"event",event.id,slot))continue;await sendMessage(family.bale_chat_id,`📅 یادآوری برنامه خانواده\n${event.title}\nشروع: ${faDate(event.starts_at,settings.timezone)}\n${reminderLabel(settings.event_reminder_minutes)} تا شروع باقی مانده.`);await markDelivered(family.id,"event",event.id,slot);sent++}
    }
    if(settings.birthday_reminders_enabled&&local.hour===settings.birthday_hour){
      const members=await supabase.from("members").select("id,display_name,first_name,birthday").eq("family_id",family.id).not("birthday","is",null);if(members.error)throw members.error;
      for(const member of members.data||[]){const birthday=new Date(`${member.birthday}T00:00:00Z`);if(birthday.getUTCMonth()+1!==local.month||birthday.getUTCDate()!==local.day)continue;if(await delivered(family.id,"birthday",member.id,local.date))continue;await sendMessage(family.bale_chat_id,`🎂 امروز تولد ${member.display_name||member.first_name||"یکی از اعضای خانواده"} است!\nبراش کلی آرزوی خوب بفرستید 💜`);await markDelivered(family.id,"birthday",member.id,local.date);sent++}
    }
  }
  return{sent};
}
