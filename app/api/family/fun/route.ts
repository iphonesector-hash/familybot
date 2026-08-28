import {NextRequest,NextResponse} from "next/server";
import {verifyFamilySession} from "@/lib/familySession";

const bank={
  joke:["چرا کامپیوتر رفت دکتر؟ چون ویروس گرفته بود 😄","به مودم گفتم آروم‌تر کار کن؛ گفت من فقط وقتی وصل باشم حرف می‌زنم!","بابا گفت قبض برق چرا زیاد شده؟ گفتم چون همه‌مون خیلی روشنفکریم 😄"],
  fact:["اختاپوس سه قلب دارد.","عسل در شرایط مناسب می‌تواند سال‌های بسیار طولانی سالم بماند.","اثر انگشت هر انسان تقریباً منحصربه‌فرد است."],
  motivation:["یک کار کوچکِ امروز، از ده تصمیم بزرگِ فردا باارزش‌تره.","خانواده وقتی قوی‌تر می‌شه که موفقیت‌های کوچیک هم دیده بشن.","قرار نیست همه‌چیز یک‌روزه درست بشه؛ فقط امروز یک قدم جلوتر برو."],
  truth:["آخرین چیزی که از خانواده پنهان کردی چی بوده؟ 😄","کدوم عادت خودت رو دوست داری عوض کنی؟","اگر یک روز جای یکی از اعضای خانواده بودی، جای کی رو انتخاب می‌کردی؟"],
  dare:["برای یکی از اعضای خانواده یک تعریف کاملاً واقعی بگو.","۳۰ ثانیه با صدای گوینده اخبار حرف بزن 😄","یک عکس قدیمی بامزه از خودت پیدا کن و درباره‌اش تعریف کن."],
  question:["اگر همه خانواده فردا آزاد باشن، دوست داری کجا برید؟","بهترین خاطره‌ای که امسال با خانواده داشتی چی بوده؟","اگر یک قانون بامزه برای خونه می‌ساختی، چی بود؟"],
  hafez:["دوش وقت سحر از غصه نجاتم دادند\nو اندر آن ظلمت شب آب حیاتم دادند","بر سر آنم که گر ز دست برآید\nدست به کاری زنم که غصه سر آید","رسید مژده که ایام غم نخواهد ماند\nچنان نماند و چنین نیز هم نخواهد ماند"],
};
const riddles=[{q:"آن چیست که هرچه از آن بیشتر برداری، بزرگ‌تر می‌شود؟",a:"چاله"},{q:"چه چیزی مال توست ولی دیگران بیشتر از تو از آن استفاده می‌کنند؟",a:"نامت"},{q:"چه چیزی پا دارد ولی راه نمی‌رود؟",a:"میز"}];
function sessionFrom(req:NextRequest){const a=req.headers.get("authorization")||"";return a.startsWith("Bearer ")?verifyFamilySession(a.slice(7)):null}
function pick<T>(items:T[]){return items[Math.floor(Math.random()*items.length)]}
export async function POST(req:NextRequest){const s=sessionFrom(req);if(!s)return NextResponse.json({ok:false,error:"unauthorized"},{status:401});const body=await req.json().catch(()=>({})),type=String(body?.type||"");if(type==="riddle"){const r=pick(riddles);return NextResponse.json({ok:true,data:{type,text:r.q,answer:r.a}})}if(!(type in bank))return NextResponse.json({ok:false,error:"unknown_fun_type"},{status:400});const text=pick(bank[type as keyof typeof bank]);return NextResponse.json({ok:true,data:{type,text}})}
