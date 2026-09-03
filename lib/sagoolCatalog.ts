import {SAGOOL_LEVELS, sagoolAsset, sagoolLevelFromXp} from "@/lib/sagoolProgression";

export type SagoolStage="puppy"|"playful"|"clever"|"guardian"|"legendary";
export type SagoolState={stage:SagoolStage;level:number;xp:number;hunger:number;thirst:number;energy:number;hygiene:number;happiness:number;affection:number;health:number;lastTickAt?:string|null};
export type SagoolMission={code:string;title:string;description?:string|null;actionType:string;target:number;rewardCoins:number;rewardXp:number;cadence:"daily"|"weekly";progress:number;complete:boolean;claimed:boolean};

export const SAGool_STAGES=[
{stage:"puppy" as const,min:1,title:"توله",asset:"/assets/sagool/stages/01-puppy.png"},
{stage:"playful" as const,min:5,title:"بازیگوش",asset:"/assets/sagool/stages/02-playful.png"},
{stage:"clever" as const,min:12,title:"باهوش",asset:"/assets/sagool/stages/03-clever.png"},
{stage:"guardian" as const,min:20,title:"نگهبان",asset:"/assets/sagool/stages/04-guardian.png"},
{stage:"legendary" as const,min:30,title:"افسانه‌ای",asset:"/assets/sagool/stages/05-legendary.png"}
];

export function stageFor(level:number){
  const lv=Math.min(10,Math.max(1,Math.floor(Number(level)||1)));
  const row=SAGOOL_LEVELS[lv-1];
  const stage:SagoolStage=lv>=9?"legendary":lv>=7?"guardian":lv>=5?"clever":lv>=3?"playful":"puppy";
  return {stage,min:lv,title:row.title,asset:sagoolAsset(lv),blurb:row.blurb};
}

export function sagoolAdvice(s:SagoolState){
  const needs=[
    {v:s.thirst,t:"سگول تشنه‌ست؛ اول براش آب تازه بریز."},
    {v:s.hunger,t:"وقت غذاست؛ یک وعده خوشمزه به سگول بده."},
    {v:s.energy,t:"سگول خسته‌ست؛ بذارش کمی بخوابه."},
    {v:s.happiness,t:"دلش بازی می‌خواد؛ باهاش بازی کن."},
  ].sort((a,b)=>a.v-b.v);
  return needs[0].v<45?needs[0].t:"همه‌چیز عالیه؛ امروز هم مراقبت کن تا سگول رشد کنه.";
}

export function displayLevelFromXp(xp:number){return sagoolLevelFromXp(xp)}
