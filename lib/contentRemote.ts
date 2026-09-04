import {contentHash,isDuplicate,normalizeFa} from "@/lib/contentHash";
import {CULTURE_EXTRA,FUN_BANK,pickFresh,riddleOptions,type FunKind} from "@/lib/funBank";
import {DEZFULI_POEMS,DEZFULI_PROVERBS,DEZFULI_WORDS} from "@/lib/dezfuliCulture";

export type ContentKind=FunKind|"proverb"|"poem"|"dezfuli-proverb"|"dezfuli-poem"|"dezfuli-word";
export type SourcedItem={
  id:string;
  kind:ContentKind;
  text:string;
  extra?:string;
  options?:string[];
  source:string;
  sourceLabel:string;
  sourceUrl?:string;
  fetchedAt:string;
  contentHash:string;
};

type Adapter={
  id:string;
  kinds:ContentKind[];
  resolve:(kind:ContentKind,recent:string[])=>Promise<SourcedItem|null>;
};

const cache=new Map<string,{item:SourcedItem;exp:number}>();
function ttl(kind:ContentKind){
  if(kind==="hafez"||kind==="poem"||kind==="proverb")return 4*24*60*60*1000;
  if(kind.startsWith("dezfuli"))return 3*24*60*60*1000;
  return 12*60*60*1000;
}
function logSource(kind:string,source:string,status:string){
  console.info("[content.source]",{kind,source,status});
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
  return item({kind:"hafez",text,source:"ganjoor",sourceLabel:"گنجور",sourceUrl:url,extra:""});
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
  return item({kind,text:`${title}\n${body}`.trim(),source:"ganjoor",sourceLabel:"گنجور",sourceUrl:url,extra:title});
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
  return item({kind:"fact",text:`${title}\n${extract}`,source:"wikipedia-fa",sourceLabel:"ویکی‌پدیا",sourceUrl:data.content_urls?.desktop?.page||"https://fa.wikipedia.org",extra:title});
}

async function aiFill(kind:ContentKind):Promise<SourcedItem|null>{
  const key=process.env.GROQ_API_KEY||process.env.AI_API_KEY;
  if(!key)return null;
  const prompts:Partial<Record<ContentKind,string>>={
    joke:"یک جوک کوتاه فارسی خانوادگی بساز. سیاسی، توهین‌آمیز یا جنسی نباشد. فقط متن جوک.",
    riddle:"یک چیستان کوتاه فارسی خانوادگی با جواب یک کلمه‌ای بساز. خروجی دقیقاً دو خط: سؤال سپس جواب.",
    motivation:"یک جمله انگیزشی کوتاه فارسی برای فضای خانواده بنویس.",
    fact:"یک دانستنی کوتاه و معتبر فارسی بنویس. حدس نزن."
  };
  const prompt=prompts[kind];
  if(!prompt)return null;
  const data=await timed(5500,async()=>{
    const base=(process.env.AI_BASE_URL||"https://api.groq.com/openai/v1").replace(/\/$/,"");
    const model=process.env.AI_MODEL||"llama-3.3-70b-versatile";
    const r=await fetch(`${base}/chat/completions`,{
      method:"POST",
      headers:{"content-type":"application/json",authorization:`Bearer ${key}`},
      body:JSON.stringify({model,temperature:.7,messages:[{role:"user",content:prompt}]})
    });
    if(!r.ok)throw new Error("ai_http");
    return r.json();
  });
  const text=String(data?.choices?.[0]?.message?.content||"").trim();
  if(text.length<8)return null;
  if(kind==="riddle"){
    const [q,...rest]=text.split("\n").map((x:string)=>x.trim()).filter(Boolean);
    const answer=rest.join(" ").replace(/^جواب[:：]?\s*/,"");
    if(!q||!answer)return null;
    return item({kind,text:q,extra:answer,source:"sector-ai",sourceLabel:"ساخته‌شده با سکتور AI"});
  }
  return item({kind,text,source:"sector-ai",sourceLabel:"ساخته‌شده با سکتور AI"});
}

function localItem(kind:ContentKind,recent:string[]):SourcedItem|null{
  if(kind==="joke"||kind==="fact"||kind==="riddle"||kind==="motivation"||kind==="hafez"){
    const row=pickFresh(FUN_BANK[kind],recent);
    return item({id:row.id,kind,text:row.text,extra:row.extra,options:kind==="riddle"?riddleOptions(row):undefined,source:"curated-local",sourceLabel:"بایگانی خانواده"});
  }
  if(kind==="proverb"){
    const row=pickFresh(CULTURE_EXTRA.proverbs,recent);
    return item({id:row.id,kind,text:row.text,extra:row.meaning,source:"curated-local",sourceLabel:"بایگانی خانواده"});
  }
  if(kind==="poem"){
    const row=pickFresh(CULTURE_EXTRA.poems,recent);
    return item({id:row.id,kind,text:row.text,extra:row.meaning,source:"curated-local",sourceLabel:"بایگانی خانواده"});
  }
  if(kind==="dezfuli-word"){
    const row=pickFresh(DEZFULI_WORDS,recent);
    return item({id:row.id,kind,text:`معنی «${row.word}» چیه؟`,extra:row.meaning,options:[...row.options],source:row.source,sourceLabel:row.source});
  }
  if(kind==="dezfuli-proverb"){
    const row=pickFresh(DEZFULI_PROVERBS,recent);
    return item({id:row.id,kind,text:row.text,extra:row.meaning,source:row.source,sourceLabel:row.source});
  }
  if(kind==="dezfuli-poem"){
    const row=pickFresh(DEZFULI_POEMS,recent);
    return item({id:row.id,kind,text:row.text,extra:row.meaning,source:row.source,sourceLabel:row.source});
  }
  return null;
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
  {id:"sector-ai",kinds:["joke","riddle","motivation","fact"],resolve:async(kind,recent)=>{
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
    logSource(kind,hit.source,"cache");
    return hit;
  }
  for(const adapter of remoteAdapters){
    if(!adapter.kinds.includes(kind))continue;
    const found=await adapter.resolve(kind,recent);
    if(found){
      cache.set(found.contentHash,{item:found,exp:now+ttl(kind)});
      logSource(kind,adapter.id,"success");
      return found;
    }
    logSource(kind,adapter.id,"timeout_or_invalid");
  }
  const local=localItem(kind,recent);
  if(local){
    logSource(kind,local.source,"fallback");
    return local;
  }
  logSource(kind,"none","fallback");
  return item({kind,text:"محتوا فعلاً در دسترس نیست.",source:"fallback",sourceLabel:"fallback"});
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
  const key=process.env.GROQ_API_KEY||process.env.AI_API_KEY;
  if(!key)return "";
  const data=await timed(5000,async()=>{
    const base=(process.env.AI_BASE_URL||"https://api.groq.com/openai/v1").replace(/\/$/,"");
    const model=process.env.AI_MODEL||"llama-3.3-70b-versatile";
    const r=await fetch(`${base}/chat/completions`,{
      method:"POST",
      headers:{"content-type":"application/json",authorization:`Bearer ${key}`},
      body:JSON.stringify({model,temperature:.4,messages:[{role:"user",content:`این غزل حافظ را در دو جمله کوتاه و خانوادگی تعبیر کن. شعر را بازنویسی نکن:\n${poem.slice(0,900)}`}]})
    });
    if(!r.ok)throw new Error("ai_http");
    return r.json();
  });
  return String(data?.choices?.[0]?.message?.content||"").trim();
}
