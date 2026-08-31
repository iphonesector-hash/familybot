import {SAGOOL_LEVELS} from "@/lib/progressionCatalog";

export type SagoolStage=`level-${1|2|3|4|5|6|7|8|9|10}`;
export type SagoolState={stage:SagoolStage;level:number;xp:number;hunger:number;thirst:number;energy:number;hygiene:number;happiness:number;affection:number;health:number;lastTickAt?:string|null};
export type SagoolMission={code:string;title:string;description?:string|null;actionType:string;target:number;rewardCoins:number;rewardXp:number;cadence:"daily"|"weekly";progress:number;complete:boolean;claimed:boolean};

export const SAGool_STAGES=SAGOOL_LEVELS.map(x=>({stage:`level-${x.level}` as SagoolStage,min:x.level,title:x.title,asset:x.asset}));
export function stageFor(level:number){const n=Math.max(1,Math.min(10,Math.floor(Number(level)||1)));return SAGool_STAGES[n-1]||SAGool_STAGES[0]}
export function sagoolAdvice(s:SagoolState){const needs=[{v:s.thirst,t:"سگول تشنه‌ست؛ اول براش آب تازه بریز 💧"},{v:s.hunger,t:"وقت غذاست؛ یک وعده خوشمزه به سگول بده."},{v:s.energy,t:"سگول خسته‌ست؛ بذارش کمی بخوابه."},{v:s.hygiene,t:"وقت حموم و تمیزکاریه."},{v:s.happiness,t:"دلش بازی می‌خواد؛ اسباب‌بازیش رو بردار!"},{v:s.affection,t:"چند دقیقه نوازشش کن تا صمیمیت‌تون بیشتر بشه."}].sort((a,b)=>a.v-b.v);return needs[0].v<45?needs[0].t:s.level<10?"حال سگول عالیه؛ نیازهای ارتقای سطح بعدی رو کامل کن ✨":"سگول به سطح افسانه‌ای رسیده؛ حالا ازش مراقبت کن و تجهیزات خاصش رو جمع کن 👑"}
