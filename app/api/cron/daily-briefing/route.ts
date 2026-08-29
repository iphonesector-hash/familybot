import {NextRequest,NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";
import {buildDailyBriefing} from "@/lib/dailyBriefing";
import {sendMessage} from "@/lib/bale";

function db(){const u=process.env.NEXT_PUBLIC_SUPABASE_URL,k=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!u||!k)throw new Error('Family Core database is not configured');return createClient(u,k,{db:{schema:'familybot'},auth:{persistSession:false,autoRefreshToken:false}})}
function allowed(req:NextRequest){const expected=process.env.CRON_SECRET||'';const bearer=(req.headers.get('authorization')||'').replace(/^Bearer\s+/i,'');const header=req.headers.get('x-cron-secret')||'';return Boolean(expected&&(bearer===expected||header===expected))}
function tehranDate(){return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Tehran',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())}
const noStore={"cache-control":"no-store"};

export async function POST(req:NextRequest){
 if(!allowed(req))return NextResponse.json({ok:false,error:'unauthorized'},{status:401,headers:noStore});
 try{
  const body=await req.json().catch(()=>({})),slot=body?.slot==='evening'?'evening':'morning',supabase=db();
  const rows=await supabase.from('families').select('id,bale_chat_id');if(rows.error)throw rows.error;
  const text=await buildDailyBriefing(slot),date=tehranDate(),results:Array<{familyId:string;chatId:string|number;ok:boolean;duplicate?:boolean;error?:string}>=[];
  for(const family of rows.data||[]){
   if(!family.bale_chat_id)continue;
   const claim=await supabase.from('briefing_deliveries').insert({family_id:family.id,briefing_date:date,slot}).select('id').maybeSingle();
   if(claim.error&&claim.error.code!=='23505')throw claim.error;
   if(!claim.data){results.push({familyId:family.id,chatId:family.bale_chat_id,ok:true,duplicate:true});continue}
   try{await sendMessage(family.bale_chat_id,text);results.push({familyId:family.id,chatId:family.bale_chat_id,ok:true})}catch(error){await supabase.from('briefing_deliveries').delete().eq('id',claim.data.id);results.push({familyId:family.id,chatId:family.bale_chat_id,ok:false,error:error instanceof Error?error.message:'send_failed'})}
  }
  return NextResponse.json({ok:true,slot,date,total:results.length,sent:results.filter(x=>x.ok&&!x.duplicate).length,duplicates:results.filter(x=>x.duplicate).length,failed:results.filter(x=>!x.ok).length},{headers:noStore});
 }catch(error){console.error('daily briefing cron failed',error);return NextResponse.json({ok:false,error:'daily_briefing_failed'},{status:500,headers:noStore})}
}
export async function GET(){return NextResponse.json({ok:true,service:'familybot-daily-briefing',schedule:'09:00 and 21:00 Asia/Tehran; activate via Supabase pg_cron after final deploy'},{headers:noStore})}
