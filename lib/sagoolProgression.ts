export type SagoolMood = "idle"|"happy"|"hungry"|"thirsty"|"sleepy"|"sleeping"|"playing"|"eating"|"drinking"|"levelup";

export const SAGOOL_MAX_LEVEL = 10;

/** Cumulative XP required to BE that level. */
export const SAGOOL_XP_THRESHOLDS = [0, 80, 200, 360, 560, 820, 1140, 1540, 2040, 2680] as const;

export const SAGOOL_LEVELS = [
  {level:1, title:"نوزاد", blurb:"سگول خیلی کوچولو تازه چشم باز کرده.", moodHint:"idle"},
  {level:2, title:"توله بیدار", blurb:"کمی بزرگ‌تر و کنجکاوتر شده.", moodHint:"happy"},
  {level:3, title:"کودک بازیگوش", blurb:"جزئیات صورت و بدن کامل‌تر شده.", moodHint:"playing"},
  {level:4, title:"سگول جوان", blurb:"Young Sagool؛ انرژی و شیطنت بیشتر.", moodHint:"playing"},
  {level:5, title:"میانه رشد", blurb:"جثه متعادل و نگاه هوشمندانه‌تر.", moodHint:"idle"},
  {level:6, title:"نوجوان", blurb:"Teen Sagool با گردنبند نئونی.", moodHint:"happy"},
  {level:7, title:"قوی و کامل", blurb:"فرم بدن محکم‌تر و بالغ‌تر.", moodHint:"idle"},
  {level:8, title:"نزدیک بزرگسال", blurb:"شانه و یال کامل‌تر شده.", moodHint:"happy"},
  {level:9, title:"بزرگسال ویژه", blurb:"Adult Premium با زره سبک.", moodHint:"happy"},
  {level:10,title:"نسخه نهایی", blurb:"سگول کامل JAHANI با تاج و زره.", moodHint:"levelup"},
] as const;

export function sagoolLevelFromXp(xp:number){
  const n=Math.max(0,Number(xp)||0);
  let level=1;
  for(let i=0;i<SAGOOL_XP_THRESHOLDS.length;i++) if(n>=SAGOOL_XP_THRESHOLDS[i]) level=i+1;
  return Math.min(SAGOOL_MAX_LEVEL,level);
}

export function sagoolXpProgress(xp:number){
  const level=sagoolLevelFromXp(xp);
  const floor=SAGOOL_XP_THRESHOLDS[level-1]||0;
  const next=level>=SAGOOL_MAX_LEVEL?floor:SAGOOL_XP_THRESHOLDS[level];
  return {level,floor,next,current:Math.max(0,xp-floor),target:Math.max(1,next-floor),maxed:level>=SAGOOL_MAX_LEVEL};
}

/** Character sprites use the 5-stage RGBA cutouts, not studio JPGs. */
export function sagoolAsset(level:number){
  const lv=Math.min(SAGOOL_MAX_LEVEL,Math.max(1,Math.floor(level)||1));
  const file=lv>=9?"05-legendary":lv>=7?"04-guardian":lv>=5?"03-clever":lv>=3?"02-playful":"01-puppy";
  return `/assets/sagool/stages/${file}.png`;
}

export function sagoolMoodFromNeeds(s:{hunger:number;thirst:number;energy:number;happiness:number}, action?:string):SagoolMood{
  if(action==="feed") return "eating";
  if(action==="water") return "drinking";
  if(action==="play") return "playing";
  if(action==="sleep") return "sleeping";
  if(s.energy<28) return "sleepy";
  if(s.hunger<32) return "hungry";
  if(s.thirst<32) return "thirsty";
  if(s.happiness>=70 && s.hunger>=55 && s.thirst>=55) return "happy";
  return "idle";
}

export const CARE_ACTIONS = [
  {id:"feed", title:"غذا", need:"hunger", art:"/assets/sagool/care/feed.svg"},
  {id:"water", title:"آب", need:"thirst", art:"/assets/sagool/care/water.svg"},
  {id:"play", title:"بازی", need:"happiness", art:"/assets/sagool/care/play.svg"},
  {id:"sleep", title:"خواب", need:"energy", art:"/assets/sagool/care/sleep.svg"},
] as const;
