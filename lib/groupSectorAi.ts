import {readAiMemory,rememberAiTurn} from "@/lib/aiMemory";
import {completeChat} from "@/lib/aiProvider";
import {readMiniAppDashboard} from "@/lib/miniAppData";

function stripHtml(v:string){return v.replace(/<[^>]+>/g," ").replace(/&/g,"&").replace(/"/g,'"').replace(/&#x27;/g,"'").replace(/\s+/g," ").trim()}
function needsWeb(q:string){return /(امروز|الان|آخرین|جدیدترین|خبر|قیمت|آب.?وهوا|اینترنت|سرچ|جستجو|به.?روز)/i.test(q)}
async function publicWebContext(q:string){if(!needsWeb(q))return"";try{const r=await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}`,{headers:{"user-agent":"Mozilla/5.0 FamilyBot/1.0"},cache:"no-store",signal:AbortSignal.timeout(5000)});if(!r.ok)return"";const html=await r.text(),rows=[...html.matchAll(/class="result__snippet"[^>]*>([\s\S]*?)<\/a>|class="result__snippet"[^>]*>([\s\S]*?)<\/div>/g)].slice(0,4).map(m=>stripHtml(m[1]||m[2]||"")).filter(Boolean);return rows.join("\n• ").slice(0,3000)}catch{return""}}
function familyContext(d:any){if(!d)return"";return JSON.stringify({family:{name:d.family?.name,members:d.family?.membersCount},profile:d.profile?{name:d.profile.display_name||d.profile.first_name,level:d.profile.level,rank:d.profile.rank}:null,birthdays:(d.birthdays||[]).slice(0,5).map((x:any)=>({name:x.display_name||x.first_name,days:x.days})),tasks:(d.tasks||[]).slice(0,8).map((x:any)=>({title:x.title,status:x.status,due:x.due_at})),events:(d.events||[]).slice(0,8).map((x:any)=>({title:x.title,starts:x.starts_at}))})}
export async function answerSectorInGroup(input:{familyId:string;userId:number;message:string}){
  const message=input.message.trim().slice(0,3500);
  if(!message)return"";
  const[dashboard,memory,web]=await Promise.all([
    readMiniAppDashboard(input.familyId,input.userId).catch(()=>null),
    readAiMemory(input.familyId,input.userId,8).catch(()=>[]),
    publicWebContext(message)
  ]);
  const system=`تو «سکتور» هستی؛ دستیار هوشمند خانواده بزرگ جهانی داخل گروه بله. فارسی روان، صمیمی و کوتاه جواب بده. اطلاعات خصوصی خانواده را فقط از Family Context بگیر و هرگز حدس نزن. داده عمومی وب را ممکن است ناقص بدان. اگر کاربر فقط سلام کرد، با «درود، من هوش مصنوعی سکتور هستم؛ چطور می‌تونم کمکتون کنم؟» شروع کن. از افشای اطلاعات خصوصی یک عضو برای اعضای دیگر خودداری کن.`;
  const context=dashboard?`\nFamily Context خصوصی: ${familyContext(dashboard)}`:"\nFamily Context در دسترس نیست.";
  const webContext=web?`\nداده عمومی تازه وب:\n• ${web}`:"";
  const result=await completeChat({
    messages:[
      {role:"system",content:system+context+webContext},
      ...memory.filter(x=>x.role!=="summary").slice(-6).map(x=>({role:x.role as "user"|"assistant",content:x.content})),
      {role:"user",content:message}
    ],
    temperature:.45,
    maxTokens:650,
    timeoutMs:12000,
    logTag:"[ai.group]"
  });
  if(!result.ok)throw new Error(result.error||"group_ai_failed");
  void rememberAiTurn(input.familyId,input.userId,message,result.text).catch(()=>{});
  return result.text.slice(0,3500);
}
