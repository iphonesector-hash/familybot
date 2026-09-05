import {searchLive,groundedSearchContext,LIVE_SEARCH_WARNING} from "@/lib/webSearch";
import {NextRequest,NextResponse} from "next/server";
import {z} from "zod";
import {verifyFamilySession} from "@/lib/familySession";
import {readMiniAppDashboard} from "@/lib/miniAppData";
import {createFamilyTask} from "@/lib/familyMutations";
import {createFamilyEvent,createFamilyPoll,transferFamilyCoins} from "@/lib/familyFeatures";
import {findFamilyMemberByName,normalizeFaNumber} from "@/lib/memberLookup";
import {readAiMemory,rememberAiTurn} from "@/lib/aiMemory";
import {aiProviderMeta,completeChat} from "@/lib/aiProvider";

const Body=z.object({message:z.string().min(1).max(4000),history:z.array(z.object({role:z.enum(["user","assistant"]),content:z.string().max(4000)})).max(20).default([])});
const SYSTEM=`تو «سکتور AI» هستی؛ دستیار گرم، دقیق و حرفه‌ای خانواده بزرگ جهانی. فارسی روان و دوستانه حرف بزن. داده خصوصی را حدس نزن. فقط وقتی نتیجه موفق سرور داری بگو کاری انجام شده. اگر نتایج جستجوی وب داده شد، آن‌ها را از داده خصوصی خانواده جدا بدان و خلاصه کن. حافظه گذشته فقط برای تداوم گفتگوست و نباید از آن نتیجه حساس یا قطعی بسازی. پاسخ‌ها کاربردی و نسبتاً کوتاه باشند. اگر کاربر فقط سلام کرد، با «سلام» شروع کن و خودت را معرفی کن.`;

function sessionFrom(req:NextRequest){const a=req.headers.get("authorization")||"";return a.startsWith("Bearer ")?verifyFamilySession(a.slice(7)):null}
function fa(n:number){return new Intl.NumberFormat("fa-IR").format(n)}
function familyContext(d:any){return JSON.stringify({family:{name:d.family?.name,members:d.family?.membersCount},profile:d.profile?{name:d.profile.display_name||d.profile.first_name,coins:d.profile.coins,level:d.profile.level,rank:d.profile.rank}:null,members:(d.members||[]).slice(0,30).map((m:any)=>({name:m.display_name||m.first_name,relation:m.relation_label})),birthdays:(d.birthdays||[]).slice(0,8).map((b:any)=>({name:b.display_name||b.first_name,days:b.days,next:b.next})),tasks:(d.tasks||[]).slice(0,10).map((t:any)=>({title:t.title,status:t.status,due:t.due_at})),events:(d.events||[]).slice(0,10).map((e:any)=>({title:e.title,type:e.event_type,starts:e.starts_at}))})}
function parseClock(text:string){const m=normalizeFaNumber(text).match(/(?:ساعت\s*)?(\d{1,2})(?::(\d{2}))?/);if(!m)return{h:18,min:0};return{h:Math.max(0,Math.min(23,Number(m[1]))),min:Math.max(0,Math.min(59,Number(m[2]||0)))}}
function relativeDate(text:string){const {h,min}=parseClock(text),parts=Object.fromEntries(new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Tehran",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date()).filter(x=>x.type!=="literal").map(x=>[x.type,x.value])),base=new Date(Date.UTC(Number(parts.year),Number(parts.month)-1,Number(parts.day)));let add=0;if(/پس.?فردا/.test(text))add=2;else if(/فردا/.test(text))add=1;else if(/امروز/.test(text))add=0;else if(/جمعه/.test(text)){const day=base.getUTCDay();add=(5-day+7)%7||7}else return null;base.setUTCDate(base.getUTCDate()+add);return new Date(Date.UTC(base.getUTCFullYear(),base.getUTCMonth(),base.getUTCDate(),h,min)-12600000).toISOString()}
function logAi(event:string,meta:Record<string,unknown>={}){console.info("[ai.chat]",event,meta)}

async function explicitAction(message:string,session:NonNullable<ReturnType<typeof sessionFrom>>){
  const task=message.match(/(?:یک\s+)?کار(?:\s+جدید)?[:：]?\s*(.+?)\s*(?:بساز|ثبت\s*کن)$/i);
  if(task){const title=task[1].trim();await createFamilyTask(session.familyId,session.userId,{title,rewardCoins:0});return`✅ کار «${title}» ثبت شد.`}
  const event=message.match(/(?:رویداد|برنامه|دورهمی)[:：]?\s*(.+?)\s+(امروز|فردا|پس.?فردا|جمعه)(.*?)(?:بساز|ثبت\s*کن)$/i);
  if(event){const startsAt=relativeDate(`${event[2]} ${event[3]}`);if(!startsAt)return"زمان رو واضح‌تر بگو؛ مثلاً «دورهمی جمعه ساعت ۲۰ ثبت کن».";const title=event[1].trim();await createFamilyEvent(session.familyId,session.userId,{title,startsAt,eventType:"event"});return`📅 رویداد «${title}» ثبت شد.`}
  const poll=message.match(/(?:نظرسنجی|رأی.?گیری)[:：]?\s*(.+?)\s+گزینه(?:‌| )?ها[:：]?\s*(.+?)\s*(?:بساز|ثبت\s*کن)$/i);
  if(poll){const question=poll[1].trim(),options=poll[2].split(/[،,|]/).map(x=>x.trim()).filter(Boolean);if(options.length<2)return"حداقل دو گزینه بده.";await createFamilyPoll(session.familyId,session.userId,{question,options});return`📊 نظرسنجی «${question}» ساخته شد.`}
  const normalized=normalizeFaNumber(message),a=normalized.match(/(?:به\s+)(.+?)\s+(\d+)\s*سکه\s*(?:بده|منتقل\s*کن)$/i),b=normalized.match(/(\d+)\s*سکه\s+(?:به\s+)(.+?)\s*(?:بده|منتقل\s*کن)$/i);
  if(a||b){const name=(a?.[1]||b?.[2]||"").trim(),amount=Number(a?.[2]||b?.[1]||0);try{const target=await findFamilyMemberByName(session.familyId,name),result=await transferFamilyCoins(session.familyId,session.userId,{targetMemberId:target.id,amount});return`🪙 ${fa(result.amount)} سکه به ${result.target.name} منتقل شد.`}catch(e){const m=e instanceof Error?e.message:"";if(m==="member_not_found")return`عضوی با نام «${name}» پیدا نکردم.`;if(m==="insufficient_coins")return"سکه کافی نداری.";throw e}}
  return null;
}
export async function POST(req:NextRequest){
  try{
    const session=sessionFrom(req);
    if(!session){logAi("rejected_unauthorized");return NextResponse.json({error:"unauthorized"},{status:401})}
    logAi("request_accepted",{family:session.familyId.slice(0,8)});
    const body=Body.parse(await req.json());
    const dashboard=await readMiniAppDashboard(session.familyId,session.userId).catch(()=>null);
    const actionReply=await explicitAction(body.message,session);
    if(actionReply){void rememberAiTurn(session.familyId,session.userId,body.message,actionReply).catch(()=>{});logAi("final_reply",{ok:true,kind:"action"});return NextResponse.json({reply:actionReply,action:true})}
    if(dashboard&&/تولد/.test(body.message)&&/(نزدیک|کیه|کی هست|چه موقع|چه روز)/.test(body.message)){
      const rows=(dashboard.birthdays||[]).slice(0,5);
      const reply=`🎂 تولدهای نزدیک:\n${rows.length?rows.map((b:any,i:number)=>`${i+1}. ${b.display_name||b.first_name||"عضو خانواده"} — ${b.days===0?"امروز":`${fa(b.days)} روز دیگه`}`).join("\n"):"فعلاً تولدی ثبت نشده."}`;
      void rememberAiTurn(session.familyId,session.userId,body.message,reply).catch(()=>{});
      logAi("final_reply",{ok:true,kind:"grounded"});
      return NextResponse.json({reply,grounded:true});
    }
    const web=await searchLive(body.message);
    if(web.used&&!web.ok){
      logAi("live_search_failed",{provider:web.provider,error:web.error,missingEnv:web.missingEnv});
      return NextResponse.json({reply:LIVE_SEARCH_WARNING,searched:false,grounded:false});
    }
    if(web.quote){
      // Structured prices are rendered verbatim; an LLM cannot alter a rate or unit.
      return NextResponse.json({reply:web.quote,searched:true,grounded:true,sources:web.sources,fetchedAt:web.fetchedAt});
    }
    const key=process.env.GROQ_API_KEY||process.env.AI_API_KEY;
    if(!key){logAi("provider_missing_key");return NextResponse.json({reply:"سکتور AI به Family Core وصله، اما کلید مدل زبانی تنظیم نشده."})}
    const meta=aiProviderMeta();
    logAi("provider_selected",{provider:meta.provider,model:meta.model,host:meta.baseHost,pathname:meta.pathname,keyConfigured:meta.keyConfigured});
    const memory=await readAiMemory(session.familyId,session.userId,10).catch(()=>[]);
    const context=dashboard?`\nFamily Context خصوصی و معتبر: ${familyContext(dashboard)}`:"\nFamily Context در دسترس نیست.";
    const webContext=groundedSearchContext(web);
    const result=await completeChat({
      messages:[{role:"system",content:SYSTEM+context+webContext},...memory.filter(x=>x.role!=="summary").map(x=>({role:x.role as "user"|"assistant",content:x.content})),...body.history.slice(-6),{role:"user",content:body.message}],
      temperature:.48,
      timeoutMs:14000,
      logTag:"[ai.chat]"
    });
    if(!result.ok){
      logAi("final_reply",{ok:false,kind:result.timeout?"timeout":"provider"});
      return NextResponse.json({error:result.error},{status:result.status===0?502:result.status===504?504:502});
    }
    const reply=result.text;
    void rememberAiTurn(session.familyId,session.userId,body.message,reply).catch(()=>{});
    logAi("final_reply",{ok:true,kind:"model",searched:web.used,webOk:web.ok});
    return NextResponse.json({reply,grounded:web.ok||Boolean(dashboard),searched:web.ok,sources:web.sources,fetchedAt:web.ok?web.fetchedAt:undefined});
  }catch(e){
    logAi("final_reply",{ok:false,kind:e instanceof Error?e.message:"ai_failed"});
    return NextResponse.json({error:e instanceof Error?e.message:"ai_failed"},{status:400});
  }
}
