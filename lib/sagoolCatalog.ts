export type SagoolStage="puppy"|"playful"|"clever"|"guardian"|"legendary";
export type SagoolState={stage:SagoolStage;level:number;xp:number;hunger:number;thirst:number;energy:number;cleanliness:number;happiness:number;bond:number;lastCareAt?:string|null};
export const SAGool_STAGES=[
{stage:"puppy" as const,min:1,title:"توله",asset:"/assets/sagool/stages/01-puppy.png"},
{stage:"playful" as const,min:5,title:"بازیگوش",asset:"/assets/sagool/stages/02-playful.png"},
{stage:"clever" as const,min:12,title:"باهوش",asset:"/assets/sagool/stages/03-clever.png"},
{stage:"guardian" as const,min:20,title:"نگهبان",asset:"/assets/sagool/stages/04-guardian.png"},
{stage:"legendary" as const,min:30,title:"افسانه‌ای",asset:"/assets/sagool/stages/05-legendary.png"}
];
export const SAGool_DAILY=[
{id:"feed",title:"یک وعده غذا بده",xp:12,coins:8},
{id:"water",title:"ظرف آب را پر کن",xp:8,coins:6},
{id:"play",title:"یک بار با سگول بازی کن",xp:15,coins:10},
{id:"clean",title:"سگول را تمیز کن",xp:10,coins:7},
{id:"learn",title:"یک تمرین کوتاه انجام بده",xp:18,coins:12}
];
export function stageFor(level:number){return [...SAGool_STAGES].reverse().find(x=>level>=x.min)||SAGool_STAGES[0]}
export function sagoolAdvice(s:SagoolState){const needs=[{v:s.thirst,t:"سگول تشنه‌ست؛ اول براش آب بریز 💧"},{v:s.hunger,t:"وقت غذاست؛ یک وعده خوشمزه به سگول بده."},{v:s.energy,t:"سگول خسته‌ست؛ بذارش کمی بخوابه."},{v:s.cleanliness,t:"وقت حموم و تمیزکاریه."},{v:s.happiness,t:"دلش بازی می‌خواد؛ توپش رو بردار!"},{v:s.bond,t:"چند دقیقه نوازشش کن تا صمیمیت‌تون بیشتر بشه."}].sort((a,b)=>a.v-b.v);return needs[0].v<45?needs[0].t:"همه‌چیز عالیه؛ امروز یک تمرین هوش با سگول انجام بده ✨"}
