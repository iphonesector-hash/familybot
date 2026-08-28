import { createClient } from "@supabase/supabase-js";
import { sendMessage } from "@/lib/bale";

function db(){const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!url||!key)throw new Error("Family Core database is not configured");return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}})}

type ReminderKind="task"|"event"|"birthday";

async function delivered(familyId:string,kind:ReminderKind,referenceId:string,slot:string){const supabase=db();const found=await supabase.from("notification_deliveries").select("id").eq("family_id",familyId).eq("kind",kind).eq("reference_id",referenceId).eq("delivery_slot",slot).maybeSingle();if(found.error)throw found.error;return Boolean(found.data)}
async function markDelivered(familyId:string,kind:ReminderKind,referenceId:string,slot:string){const {error}=await db().from("notification_deliveries").insert({family_id:familyId,kind,reference_id:referenceId,delivery_slot:slot});if(error&&error.code!=="23505")throw error}
function hourSlot(date=new Date()){return date.toISOString().slice(0,13)}
function daySlot(date=new Date()){return date.toISOString().slice(0,10)}
function faDate(value:string){return new Date(value).toLocaleString("fa-IR",{month:"long",day:"numeric",hour:"2-digit",minute:"2-digit"})}

export async function dispatchDueReminders(){
  const supabase=db();const now=new Date();const soon=new Date(now.getTime()+60*60*1000);const today=daySlot(now);let sent=0;
  const families=await supabase.from("families").select("id,bale_chat_id,name");if(families.error)throw families.error;
  for(const family of families.data||[]){
    const [tasks,events,birthdays]=await Promise.all([
      supabase.from("tasks").select("id,title,due_at,assignee_member_id").eq("family_id",family.id).in("status",["open","doing"]).not("due_at","is",null).gte("due_at",now.toISOString()).lte("due_at",soon.toISOString()),
      supabase.from("family_events").select("id,title,starts_at,location_text").eq("family_id",family.id).gte("starts_at",now.toISOString()).lte("starts_at",soon.toISOString()),
      supabase.from("members").select("id,display_name,first_name,birthday").eq("family_id",family.id).not("birthday","is",null),
    ]);
    if(tasks.error||events.error||birthdays.error)throw tasks.error||events.error||birthdays.error;
    for(const task of tasks.data||[]){const slot=hourSlot();if(await delivered(family.id,"task",task.id,slot))continue;let assignee="";if(task.assignee_member_id){const m=await supabase.from("members").select("display_name,first_name").eq("id",task.assignee_member_id).maybeSingle();assignee=m.data?`\n👤 مسئول: ${m.data.display_name||m.data.first_name||"عضو خانواده"}`:""}await sendMessage(Number(family.bale_chat_id),`⏰ یادآوری کار خانواده\n\n✅ ${task.title}${assignee}\n🕒 مهلت: ${faDate(task.due_at)}`);await markDelivered(family.id,"task",task.id,slot);sent++}
    for(const event of events.data||[]){const slot=hourSlot();if(await delivered(family.id,"event",event.id,slot))continue;await sendMessage(Number(family.bale_chat_id),`📅 برنامه خانواده نزدیکه\n\n💜 ${event.title}\n🕒 ${faDate(event.starts_at)}${event.location_text?`\n📍 ${event.location_text}`:""}`);await markDelivered(family.id,"event",event.id,slot);sent++}
    for(const m of birthdays.data||[]){const raw=String(m.birthday||"");if(!raw)continue;const [,month,day]=raw.split("-").map(Number);const monthNow=now.getUTCMonth()+1,dayNow=now.getUTCDate();if(month!==monthNow||day!==dayNow)continue;const ref=String(m.id),slot=today;if(await delivered(family.id,"birthday",ref,slot))continue;await sendMessage(Number(family.bale_chat_id),`🎂 امروز تولد ${m.display_name||m.first_name||"یکی از عزیزای خانواده"} هست!\nFamily Bot آماده‌ست که جشن رو شروع کنیم 💜🎉`);await markDelivered(family.id,"birthday",ref,slot);sent++}
  }
  return{sent,checkedFamilies:families.data?.length||0,at:now.toISOString()};
}
