import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyFamilySession } from "@/lib/familySession";
import { readMiniAppDashboard } from "@/lib/miniAppData";
import { createFamilyTask } from "@/lib/familyMutations";
import { createFamilyEvent } from "@/lib/familyFeatures";

const Body=z.object({message:z.string().min(1).max(4000),history:z.array(z.object({role:z.enum(["user","assistant"]),content:z.string().max(4000)})).max(20).default([])});
const SYSTEM=`تو Family AI هستی؛ دستیار گرم، دقیق و قابل اعتماد خانواده. فارسی روان و دوستانه حرف بزن. داده خصوصی را حدس نزن. اگر Family Context در اختیار داری فقط از همان داده استفاده کن. هیچ‌وقت ادعا نکن چیزی ثبت یا تغییر کرده مگر سرور نتیجه موفق اکشن را برگردانده باشد. پاسخ‌ها کوتاه و کاربردی باشند مگر کاربر توضیح بیشتر بخواهد.`;

function sessionFrom(req:NextRequest){const a=req.headers.get("authorization")||"";return a.startsWith("Bearer ")?verifyFamilySession(a.slice(7)):null}
function fa(n:number){return new Intl.NumberFormat("fa-IR").format(n)}
function familyContext(d:any){return JSON.stringify({family:{name:d.family?.name,members:d.family?.membersCount},profile:d.profile?{name:d.profile.display_name||d.profile.first_name,coins:d.profile.coins,level:d.profile.level,rank:d.profile.rank}:null,birthdays:(d.birthdays||[]).slice(0,8).map((b:any)=>({name:b.display_name||b.first_name,days:b.days,next:b.next})),tasks:(d.tasks||[]).slice(0,10).map((t:any)=>({title:t.title,status:t.status,due:t.due_at})),events:(d.events||[]).slice(0,10).map((e:any)=>({title:e.title,type:e.event_type,starts:e.starts_at}))})}

function parseClock(text:string){const m=text.match(/(?:ساعت\s*)?(\d{1,2})(?::(\d{2}))?/);if(!m)return{h:18,min:0};return{h:Math.max(0,Math.min(23,Number(m[1]))),min:Math.max(0,Math.min(59,Number(m[2]||0)))}}
function relativeDate(text:string){const now=new Date();const {h,min}=parseClock(text);let add=0;if(/پس.?فردا/.test(text))add=2;else if(/فردا/.test(text))add=1;else if(/امروز/.test(text))add=0;else if(/جمعه/.test(text)){const day=now.getDay();add=(5-day+7)%7||7}else return null;const d=new Date(now);d.setDate(d.getDate()+add);d.setHours(h,min,0,0);return d.toISOString()}

async function explicitAction(message:string,session:ReturnType<typeof sessionFrom>){if(!session)return null;
  const task=message.match(/(?:یک\s+)?کار(?:\s+جدید)?[:：]?\s*(.+?)\s*(?:بساز|ثبت\s*کن)$/i);if(task){const title=task[1].trim();const data=await createFamilyTask(session.familyId,session.userId,{title,rewardCoins:0});return`✅ کار «${title}» برای خانواده ثبت شد.`}
  const event=message.match(/(?:رویداد|برنامه|دورهمی)[:：]?\s*(.+?)\s+(امروز|فردا|پس.?فردا|جمعه)(.*?)(?:بساز|ثبت\s*کن)$/i);if(event){const startsAt=relativeDate(`${event[2]} ${event[3]}`);if(!startsAt)return"برای ثبت رویداد، زمان رو هم واضح بگو؛ مثلاً «دورهمی جمعه ساعت ۲۰ ثبت کن».";const title=event[1].trim();await createFamilyEvent(session.familyId,session.userId,{title,startsAt,eventType:"event"});return`📅 رویداد «${title}» با موفقیت در تقویم خانواده ثبت شد.`}
  return null;
}

export async function POST(req:NextRequest){
  try{
    const body=Body.parse(await req.json());const session=sessionFrom(req);let dashboard:any=null;if(session)dashboard=await readMiniAppDashboard(session.familyId,session.userId).catch(()=>null);
    const actionReply=await explicitAction(body.message,session);if(actionReply)return NextResponse.json({reply:actionReply,action:true});
    if(dashboard&&/تولد/.test(body.message)&&/(نزدیک|کیه|کی هست|چه موقع|چه روز)/.test(body.message)){const rows=(dashboard.birthdays||[]).slice(0,5);const reply=rows.length?rows.map((b:any,i:number)=>`${i+1}. ${b.display_name||b.first_name||"عضو خانواده"} — ${b.days===0?"امروز":`${fa(b.days)} روز دیگه`}`).join("\n"):"فعلاً تاریخ تولدی برای اعضای خانواده ثبت نشده.";return NextResponse.json({reply:`🎂 تولدهای نزدیک:\n${reply}`,grounded:true})}
    const base=process.env.AI_BASE_URL?.replace(/\/$/,"");const key=process.env.AI_API_KEY;const model=process.env.AI_MODEL;if(!base||!key||!model)return NextResponse.json({reply:dashboard?"من به داده‌های Family Bot وصل هستم 💜 ولی کلید مدل زبانی هنوز روی سرور تنظیم نشده. می‌تونی فعلاً درباره تولدهای نزدیک بپرسی یا صریح بگی «کار ... ثبت کن».":"من آماده‌ام 💜 فعلاً کلید مدل هوش مصنوعی روی سرور تنظیم نشده.",demo:true});
    const context=dashboard?`\nFamily Context (private, authoritative): ${familyContext(dashboard)}`:"\nFamily Context در این درخواست در دسترس نیست؛ درباره اطلاعات خصوصی خانواده حدس نزن.";
    const response=await fetch(`${base}/chat/completions`,{method:"POST",headers:{"content-type":"application/json",authorization:`Bearer ${key}`},body:JSON.stringify({model,temperature:.55,messages:[{role:"system",content:SYSTEM+context},...body.history,{role:"user",content:body.message}]})});if(!response.ok)throw new Error(`AI provider returned ${response.status}`);const data=await response.json();const reply=data?.choices?.[0]?.message?.content;if(!reply)throw new Error("AI provider returned an empty response");return NextResponse.json({reply,grounded:Boolean(dashboard)});
  }catch(error){const message=error instanceof Error?error.message:"Unknown error";return NextResponse.json({error:message},{status:400})}
}
