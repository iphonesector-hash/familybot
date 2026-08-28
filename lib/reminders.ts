import { createClient } from "@supabase/supabase-js";
import { sendMessage } from "@/lib/bale";
import { readAdminSettings } from "@/lib/adminSettings";

function db(){const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!url||!key)throw new Error("Family Core database is not configured");return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}})}

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
    const timezone=settings.timezone||"Asia/Tehran";const localNow=localParts(now,timezone);
    const taskSoon=new Date(now.getTime()+settings.task_reminder_minutes*60*1000);
    const eventSoon=new Date(now.getTime()+settings.event_reminder_minutes*60*1000);
    const [tasks,events,birthdays]=await Promise.all([
      settings.task_reminders_enabled?supabase.from("tasks").select("id,title,due_at,assignee_member_id").eq("family_id",family.id).in("status",["open","doing"]).not("due_at","is",null).gte("due_at",now.toISOString()).lte("due_at",taskSoon.toISOString()):Promise.resolve({data:[],error:null}),
      settings.event_reminders_enabled?supabase.from("family_events").select("id,title,starts_at,location_text").eq("family_id",family.id).gte("starts_at",now.toISOString()).lte("starts_at",eventSoon.toISOString()):Promise.resolve({data:[],error:null}),
      settings.birthday_reminders_enabled?supabase.from("members").select("id,display_name,first_name,birthday").eq("family_id",family.id).not("birthday","is",null):Promise.resolve({data:[],error:null}),
    ]);
    if(tasks.error||events.error||birthdays.error)throw tasks.error||events.error||birthdays.error;
    for(const task of tasks.data||[]){const slot=`${task.id}:${task.due_at}:${settings.task_reminder_minutes}`;if(await delivered(family.id,"task",task.id,slot))continue;let assignee="";if(task.assignee_member_id){const m=await supabase.from("members").select("display_name,first_name").eq("id",task.assignee_member_id).maybeSingle();assignee=m.data?`\n👤 مسئول: ${m.data.display_name||m.data.first_name||"عضو خانواده"}`:""}await sendMessage(Number(family.bale_chat_id),`⏰ یادآوری کار خانواده\n\n✅ ${task.title}${assignee}\n🕒 مهلت: ${faDate(task.due_at,timezone)}\n🔔 ${reminderLabel(settings.task_reminder_minutes)} تا مهلت`);await markDelivered(family.id,"task",task.id,slot);sent++}
    for(const event of events.data||[]){const slot=`${event.id}:${event.starts_at}:${settings.event_reminder_minutes}`;if(await delivered(family.id,"event",event.id,slot))continue;await sendMessage(Number(family.bale_chat_id),`📅 برنامه خانواده نزدیکه\n\n💜 ${event.title}\n🕒 ${faDate(event.starts_at,timezone)}${event.location_text?`\n📍 ${event.location_text}`:""}\n🔔 ${reminderLabel(settings.event_reminder_minutes)} تا شروع`);await markDelivered(family.id,"event",event.id,slot);sent++}
    if(localNow.hour===settings.birthday_hour){for(const m of birthdays.data||[]){const raw=String(m.birthday||"");if(!raw)continue;const [,month,day]=raw.split("-").map(Number);if(month!==localNow.month||day!==localNow.day)continue;const ref=String(m.id),slot=localNow.date;if(await delivered(family.id,"birthday",ref,slot))continue;await sendMessage(Number(family.bale_chat_id),`🎂 امروز تولد ${m.display_name||m.first_name||"یکی از عزیزای خانواده"} هست!\nFamily Bot آماده‌ست که جشن رو شروع کنیم 💜🎉`);await markDelivered(family.id,"birthday",ref,slot);sent++}}
  }
  return{sent,checkedFamilies:families.data?.length||0,at:now.toISOString()};
}
