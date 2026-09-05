import {readAiMemory,rememberAiTurn} from "@/lib/aiMemory";
import {completeChat} from "@/lib/aiProvider";
import {readMiniAppDashboard} from "@/lib/miniAppData";
import {groundedSearchContext,LIVE_SEARCH_WARNING,searchLive} from "@/lib/webSearch";

function familyContext(d:any){if(!d)return"";return JSON.stringify({family:{name:d.family?.name,members:d.family?.membersCount},profile:d.profile?{name:d.profile.display_name||d.profile.first_name,level:d.profile.level,rank:d.profile.rank}:null,birthdays:(d.birthdays||[]).slice(0,5).map((x:any)=>({name:x.display_name||x.first_name,days:x.days})),tasks:(d.tasks||[]).slice(0,8).map((x:any)=>({title:x.title,status:x.status,due:x.due_at})),events:(d.events||[]).slice(0,8).map((x:any)=>({title:x.title,starts:x.starts_at}))})}
export async function answerSectorInGroup(input:{familyId:string;userId:number;message:string}){
  const message=input.message.trim().slice(0,3500);
  if(!message)return"";
  const[dashboard,memory,web]=await Promise.all([
    readMiniAppDashboard(input.familyId,input.userId).catch(()=>null),
    readAiMemory(input.familyId,input.userId,8).catch(()=>[]),
    searchLive(message)
  ]);
  if(web.used&&!web.ok){
    console.info("[ai.group]","live_search_failed",{provider:web.provider,error:web.error,missingEnv:web.missingEnv});
    return LIVE_SEARCH_WARNING;
  }
  const direct=web.answer||web.quote;
  if(direct){
    void rememberAiTurn(input.familyId,input.userId,message,direct).catch(()=>{});
    console.info("[ai.group]","live_search_reply",{provider:web.provider,sources:web.sources.length});
    return direct.slice(0,3500);
  }
  const system=`تو «سکتور» هستی؛ دستیار هوشمند خانواده بزرگ جهانی داخل گروه بله. فارسی روان، صمیمی و کوتاه جواب بده. اطلاعات خصوصی خانواده را فقط از Family Context بگیر و هرگز حدس نزن. داده عمومی وب را ممکن است ناقص بدان. اگر کاربر فقط سلام کرد، با «درود، من هوش مصنوعی سکتور هستم؛ چطور می‌تونم کمکتون کنم؟» شروع کن. از افشای اطلاعات خصوصی یک عضو برای اعضای دیگر خودداری کن. هرگز فرایند فکر، تحلیل داخلی، reasoning یا تگ‌های think/analysis را نمایش نده.`;
  const context=dashboard?`\nFamily Context خصوصی: ${familyContext(dashboard)}`:"\nFamily Context در دسترس نیست.";
  const webContext=groundedSearchContext(web);
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
