import {completeChat} from "@/lib/aiProvider";
import {contentHash,isDuplicate,normalizeFa} from "@/lib/contentHash";
import {isFamilySafe} from "@/lib/contentSafety";
import {CULTURE_EXTRA,FUN_BANK,pickFresh,riddleOptions,type FunKind} from "@/lib/funBank";
import {DEZFULI_POEMS,DEZFULI_PROVERBS,DEZFULI_WORDS,dezfuliSourceLabel,dezfuliSourceMode} from "@/lib/dezfuliCulture";
import {cachedDezfuliRemote} from "@/lib/dezfuliIngest";
import {WIKI_CHISTAN_RIDDLES} from "@/lib/riddleGrounded";
import {validateContent,validateJoke} from "@/lib/contentValidation";

export type ContentKind=FunKind|"proverb"|"poem"|"dezfuli-proverb"|"dezfuli-poem"|"dezfuli-word";
export type SourceMode="live"|"cached-remote"|"verified-import"|"sector-ai"|"curated-local";
export type SourcedItem={
  id:string;
  kind:ContentKind;
  text:string;
  extra?:string;
  options?:string[];
  source:string;
  sourceLabel:string;
  sourceMode:SourceMode;
  sourceUrl?:string;
  fetchedAt:string;
  contentHash:string;
};

export const JOKE_SOURCE_ORDER=["sector-ai","curated-local"] as const;
export const RIDDLE_SOURCE_ORDER=["wikipedia-fa-chistan","wiki-chistan-import","curated-local"] as const;
export const DEZFULI_SOURCE_ORDER=["dezfuli-ingest","dezfuli-verified-import"] as const;

type Adapter={
  id:string;
  kinds:ContentKind[];
  resolve:(kind:ContentKind,recent:string[])=>Promise<SourcedItem|null>;
};

const cache=new Map<string,{item:SourcedItem;exp:number}>();
function ttl(kind:ContentKind){
  if(kind==="hafez"||kind==="poem"||kind==="proverb")return 4*24*60*60*1000;
  if(kind.startsWith("dezfuli"))return 3*24*60*60*1000;
  if(kind==="riddle")return 2*24*60*60*1000;
  return 12*60*60*1000;
}
function logSource(kind:string,source:string,status:string,mode?:string){
  console.info("[content.source]",{kind,source,status,mode});
}
async function timed<T>(ms:number,work:()=>Promise<T>):Promise<T|null>{
  try{return await Promise.race([work(),new Promise<null>(resolve=>setTimeout(()=>resolve(null),ms))])}
  catch{return null}
}
function item(partial:Omit<SourcedItem,"fetchedAt"|"contentHash"|"id"> & {id?:string}):SourcedItem{
  const hash=contentHash(partial.kind,partial.text);
  return {
    id:partial.id||`${partial.source}-${hash}`,
    kind:partial.kind,
    text:partial.text,
    extra:partial.extra,
    options:partial.options,
    source:partial.source,
    sourceLabel:partial.sourceLabel,
    sourceMode:partial.sourceMode,
    sourceUrl:partial.sourceUrl,
    fetchedAt:new Date().toISOString(),
    contentHash:hash
  };
}

async function ganjoorHafez():Promise<SourcedItem|null>{
  const data=await timed(5000,async()=>{
    const r=await fetch("https://api.ganjoor.net/api/ganjoor/hafez/faal",{cache:"no-store",headers:{accept:"application/json"}});
    if(!r.ok)throw new Error("ganjoor_http");
    return r.json();
  });
  if(!data)return null;
  const title=String(data.title||data.fullTitle||"غزل حافظ");
  const verses=Array.isArray(data.verses)?data.verses.map((v:any)=>String(v.text||v.t1||"").trim()).filter(Boolean):[];
  const plain=String(data.plainText||"").replace(/\r/g,"").trim();
  const text=[title,verses.length?verses.join("\n"):plain].filter(Boolean).join("\n");
  if(normalizeFa(text).length<20)return null;
  const url=data.fullUrl?`https://ganjoor.net${data.fullUrl}`:"https://ganjoor.net/hafez";
  return item({kind:"hafez",text,source:"ganjoor",sourceLabel:"گنجور",sourceMode:"live",sourceUrl:url,extra:""});
}

async function ganjoorPoem(kind:ContentKind):Promise<SourcedItem|null>{
  const poetId=kind==="hafez"?2:3;
  const data=await timed(5000,async()=>{
    const r=await fetch(`https://api.ganjoor.net/api/ganjoor/poem/random?poetId=${poetId}`,{cache:"no-store"});
    if(!r.ok)throw new Error("ganjoor_http");
    return r.json();
  });
  if(!data)return null;
  const title=String(data.title||data.fullTitle||"");
  const body=String(data.plainText||"").replace(/\r/g,"").trim();
  if(!body)return null;
  const url=data.fullUrl?`https://ganjoor.net${data.fullUrl}`:"https://ganjoor.net";
  return item({kind,text:`${title}\n${body}`.trim(),source:"ganjoor",sourceLabel:"گنجور",sourceMode:"live",sourceUrl:url,extra:title});
}

async function wikiFact():Promise<SourcedItem|null>{
  const data=await timed(5000,async()=>{
    const r=await fetch("https://fa.wikipedia.org/api/rest_v1/page/random/summary",{cache:"no-store",redirect:"follow",headers:{accept:"application/json","user-agent":"FamilyBot/1.0"}});
    if(!r.ok)throw new Error("wiki_http");
    return r.json();
  });
  if(!data)return null;
  const title=String(data.title||"");
  const extract=String(data.extract||"").trim();
  if(extract.length<40)return null;
  return item({kind:"fact",text:`${title}\n${extract}`,source:"wikipedia-fa",sourceLabel:"ویکی‌پدیا",sourceMode:"live",sourceUrl:data.content_urls?.desktop?.page||"https://fa.wikipedia.org",extra:title});
}

async function wikiApi(params:Record<string,string>){
  const url=`https://fa.wikipedia.org/w/api.php?${new URLSearchParams({format:"json",origin:"*",...params})}`;
  const r=await fetch(url,{cache:"no-store",headers:{accept:"application/json","user-agent":"FamilyBot/1.0"},signal:AbortSignal.timeout(5000)});
  if(!r.ok)throw new Error("wiki_http");
  return r.json();
}

function groundedWikiRiddle(recent:string[]):SourcedItem|null{
  const unused=WIKI_CHISTAN_RIDDLES.filter(x=>!recent.includes(x.id)&&!isDuplicate(contentHash("riddle",x.text),recent));
  if(!unused.length)return null;
  const row=unused[Math.floor(Math.random()*unused.length)];
  return item({
    id:row.id,
    kind:"riddle",
    text:row.text,
    extra:row.extra,
    options:[...row.options],
    source:"wiki-chistan-import",
    sourceLabel:"ویکی‌پدیا",
    sourceMode:"verified-import",
    sourceUrl:row.sourceUrl
  });
}

async function wikipediaChistanLive(recent:string[]):Promise<SourcedItem|null>{
  const data=await timed(5000,()=>wikiApi({action:"parse",page:"چیستان",prop:"wikitext"}));
  const raw=String(data?.parse?.wikitext?.["*"]||"");
  if(raw.length<80)return null;
  const found:Array<{q:string;a:string}>=[];
  const anbe=raw.match(/لغز «انبه»[\s\S]{0,80}«([^»]{8,80})»/);
  if(anbe)found.push({q:anbe[1],a:"انبه"});
  const megraz=raw.match(/لغز «مقراض»[\s\S]{0,80}«([^»]{8,90})»/);
  if(megraz)found.push({q:megraz[1],a:"مقراض"});
  const sag=raw.match(/«([^»]{10,80}بنشیند[^»]{0,40})»[^«]{0,40}سگ/);
  if(sag)found.push({q:sag[1],a:"سگ"});
  const piri=raw.match(/«([^»]{10,80}پنهان[^»]{0,40})»[^«]{0,40}پیری/);
  if(piri)found.push({q:piri[1],a:"پیری"});
  const usable=found.filter(x=>isFamilySafe(x.q)&&!isDuplicate(contentHash("riddle",x.q),recent));
  if(!usable.length)return null;
  const pick=usable[Math.floor(Math.random()*usable.length)];
  const fillers=["سایه","آینه","ابر","زمان"].filter(x=>x!==pick.a);
  return item({
    kind:"riddle",
    text:pick.q.replace(/[«»]/g,"").trim(),
    extra:pick.a,
    options:[pick.a,...fillers].slice(0,4),
    source:"wikipedia-fa-chistan",
    sourceLabel:"ویکی‌پدیا",
    sourceMode:"live",
    sourceUrl:"https://fa.wikipedia.org/wiki/چیستان"
  });
}

async function aiFill(kind:ContentKind):Promise<SourcedItem|null>{
  const prompts:Partial<Record<ContentKind,string>>={
    joke:"یک جوک کوتاه و طبیعی فارسی برای جمع خانوادگی بنویس. جوک باید واقعاً ساختار شوخی و پایان خنده‌دار داشته باشد. متن توضیحی، مقاله، تعریف طنز، جمله انگیزشی یا لطیفه بی‌معنی ننویس. سیاسی، جنسی، توهین‌آمیز، قومیتی، مذهبی یا تحقیرکننده نباشد. حداکثر چند جمله کوتاه. فقط خود جوک را بنویس.",
    motivation:"یک جمله انگیزشی کوتاه فارسی برای فضای خانواده بنویس.",
  };
  const prompt=prompts[kind];
  if(!prompt)return null;
  let result=await timed(5500,()=>completeChat({messages:[{role:"user",content:prompt}],temperature:.7,timeoutMs:5000,logTag:"[ai.content]"}));
  if(!result?.ok)return null;
  let text=result.text.trim();
  if(kind==="joke"&&!validateJoke({text,source:"sector-ai",sourceMode:"sector-ai"}).accepted){
    console.info("[content.reject]",{kind:"joke",source:"sector-ai",reason:validateJoke({text}).reason});
    result=await timed(5500,()=>completeChat({messages:[{role:"user",content:`${prompt}\nپاسخ قبلی رد شد. حتماً یک موقعیت کوتاه و پایان غافلگیرکننده روشن بنویس؛ فقط خود جوک.`}],temperature:.65,timeoutMs:5000,logTag:"[ai.content]"}));
    if(!result?.ok)return null;text=result.text.trim();
    const retry=validateJoke({text,source:"sector-ai",sourceMode:"sector-ai"});if(!retry.accepted){console.info("[content.reject]",{kind:"joke",source:"sector-ai",reason:retry.reason});return null;}
  }
  if(!isFamilySafe(text))return null;
  if(kind==="riddle"){
    const q=text.match(/سؤال[:：]\s*(.+)/)?.[1]?.trim()||text.split("\n")[0]?.trim();
    const answer=text.match(/جواب[:：]\s*(.+)/)?.[1]?.trim()||"";
    const extras=[text.match(/گزینه۲[:：]\s*(.+)/)?.[1],text.match(/گزینه۳[:：]\s*(.+)/)?.[1],text.match(/گزینه۴[:：]\s*(.+)/)?.[1]].map(x=>String(x||"").trim()).filter(Boolean);
    const explain=text.match(/توضیح[:：]\s*(.+)/)?.[1]?.trim();
    if(!q||!answer)return null;
    const options=[answer,...extras.filter(x=>x!==answer)].slice(0,4);
    while(options.length<4)options.push(["سایه","آینه","ابر","زمان"][options.length]||"نامه");
    return item({kind,text:q,extra:answer,options,source:"sector-ai",sourceLabel:"ساخته‌شده با سکتور AI",sourceMode:"sector-ai",sourceUrl:explain});
  }
  return item({kind,text,source:"sector-ai",sourceLabel:"ساخته‌شده با سکتور AI",sourceMode:"sector-ai"});
}

function localItem(kind:ContentKind,recent:string[]):SourcedItem|null{
  if(kind==="joke"||kind==="fact"||kind==="riddle"||kind==="motivation"||kind==="hafez"){
    const row=pickFresh(FUN_BANK[kind],recent);
    return item({id:row.id,kind,text:row.text,extra:row.extra,options:kind==="riddle"?riddleOptions(row):undefined,source:"curated-local",sourceLabel:"بایگانی خانواده",sourceMode:"curated-local"});
  }
  if(kind==="proverb"){
    const row=pickFresh(CULTURE_EXTRA.proverbs,recent);
    return item({id:row.id,kind,text:row.text,extra:row.meaning,source:"curated-local",sourceLabel:"بایگانی خانواده",sourceMode:"curated-local"});
  }
  if(kind==="poem"){
    const row=pickFresh(CULTURE_EXTRA.poems,recent);
    return item({id:row.id,kind,text:row.text,extra:row.meaning,source:"curated-local",sourceLabel:"بایگانی خانواده",sourceMode:"curated-local"});
  }
  if(kind==="dezfuli-word"){
    const row=pickFresh(DEZFULI_WORDS,recent);
    return item({id:row.id,kind,text:`معنی «${row.word}» چیه؟`,extra:row.meaning,options:[...row.options],source:row.source,sourceLabel:dezfuliSourceLabel(row.source),sourceMode:dezfuliSourceMode(row.source)});
  }
  if(kind==="dezfuli-proverb"){
    const row=pickFresh(DEZFULI_PROVERBS,recent);
    return item({id:row.id,kind,text:row.text,extra:row.meaning,source:row.source,sourceLabel:dezfuliSourceLabel(row.source),sourceMode:"verified-import"});
  }
  if(kind==="dezfuli-poem"){
    const row=pickFresh(DEZFULI_POEMS,recent);
    return item({id:row.id,kind,text:row.text,extra:row.meaning,source:row.source,sourceLabel:dezfuliSourceLabel(row.source),sourceMode:"verified-import"});
  }
  return null;
}

async function remoteDezfuliWord(recent:string[]):Promise<SourcedItem|null>{
  const rows=await cachedDezfuliRemote();
  const fresh=rows.filter(x=>!isDuplicate(x.contentHash,recent));
  if(!fresh.length)return null;
  const row=fresh[Math.floor(Math.random()*fresh.length)];
  return item({
    kind:"dezfuli-word",
    text:`معنی «${row.word}» چیه؟`,
    extra:row.meaning,
    source:row.source,
    sourceLabel:row.sourceLabel,
    sourceMode:"cached-remote",
    sourceUrl:row.sourceUrl
  });
}

const remoteAdapters:Adapter[]=[
  {id:"ganjoor",kinds:["hafez","poem"],resolve:async(kind,recent)=>{
    const raw=kind==="hafez"?await ganjoorHafez():await ganjoorPoem(kind);
    if(!raw)return null;
    if(isDuplicate(raw.contentHash,recent))return null;
    return raw;
  }},
  {id:"wikipedia-fa",kinds:["fact"],resolve:async(_kind,recent)=>{
    const raw=await wikiFact();
    if(!raw||isDuplicate(raw.contentHash,recent))return null;
    return raw;
  }},
  {id:"wikipedia-fa-chistan",kinds:["riddle"],resolve:async(_kind,recent)=>wikipediaChistanLive(recent)},
  {id:"wiki-chistan-import",kinds:["riddle"],resolve:async(_kind,recent)=>groundedWikiRiddle(recent)},
  {id:"dezfuli-ingest",kinds:["dezfuli-word"],resolve:async(_kind,recent)=>remoteDezfuliWord(recent)},
  {id:"sector-ai",kinds:["joke","motivation"],resolve:async(kind,recent)=>{
    const raw=await aiFill(kind);
    if(!raw||isDuplicate(raw.contentHash,recent))return null;
    return raw;
  }}
];

export async function resolveContentAsync(kind:ContentKind, recent:string[]):Promise<SourcedItem>{
  const now=Date.now();
  for(const [key,hit] of cache){
    if(hit.exp<now)cache.delete(key);
  }
  const cached=[...cache.values()].filter(x=>x.item.kind===kind&&!isDuplicate(x.item.contentHash,recent));
  if(cached.length){
    const hit=cached[Math.floor(Math.random()*cached.length)].item;
    logSource(kind,hit.source,"cache",hit.sourceMode==="live"?"cached-remote":hit.sourceMode);
    return {...hit,sourceMode:hit.sourceMode==="live"?"cached-remote":hit.sourceMode};
  }
  for(const adapter of remoteAdapters){
    if(!adapter.kinds.includes(kind))continue;
    const found=await adapter.resolve(kind,recent);
    if(found){
      const quality=validateContent(kind,found);
      if(!quality.accepted){console.info("[content.reject]",{kind,source:found.source,reason:quality.reason});logSource(kind,adapter.id,"quality_rejected",found.sourceMode);continue;}
      cache.set(found.contentHash,{item:found,exp:now+ttl(kind)});
      logSource(kind,adapter.id,"success",found.sourceMode);
      return found;
    }
    logSource(kind,adapter.id,"timeout_or_invalid");
  }
  const local=localItem(kind,recent);
  if(local){
    const quality=validateContent(kind,local);
    if(!quality.accepted){console.info("[content.reject]",{kind,source:local.source,reason:quality.reason});throw new Error(`invalid_curated_${kind}`);}
    logSource(kind,local.source,"fallback",local.sourceMode);
    return local;
  }
  logSource(kind,"none","fallback");
  return item({kind,text:"محتوا فعلاً در دسترس نیست.",source:"fallback",sourceLabel:"fallback",sourceMode:"curated-local"});
}

export function poolSize(kind:ContentKind){
  if(kind==="joke"||kind==="fact"||kind==="riddle"||kind==="motivation"||kind==="hafez") return FUN_BANK[kind].length;
  if(kind==="proverb") return CULTURE_EXTRA.proverbs.length;
  if(kind==="poem") return CULTURE_EXTRA.poems.length;
  if(kind==="dezfuli-proverb") return DEZFULI_PROVERBS.length;
  if(kind==="dezfuli-poem") return DEZFULI_POEMS.length;
  return DEZFULI_WORDS.length;
}

export async function interpretHafez(poem:string){
  const result=await completeChat({
    messages:[{role:"user",content:`این غزل حافظ را در دو جمله کوتاه و خانوادگی تعبیر کن. شعر را بازنویسی نکن:\n${poem.slice(0,900)}`}],
    temperature:.4,
    timeoutMs:5000,
    logTag:"[ai.hafez]"
  });
  return result.ok?result.text:"";
}
