import poems from "@/lib/contentData/ganjoor.json";
import {contentHash,normalizeFa} from "@/lib/contentHash";
import {isFamilySafe} from "@/lib/contentSafety";
import type {SourcedItem} from "@/lib/contentRemote";

export const GANJOOR_POETS=[2,7,5,4,3,6,9,10] as const;
export function parseGanjoor(data:unknown,kind:"hafez"|"poem"):SourcedItem|null{
  if(!data||typeof data!=="object")return null;
  const d=data as Record<string,unknown>;
  if(!Number.isInteger(d.id)||typeof d.fullUrl!=="string"||!/^\/[a-z0-9/-]+$/i.test(d.fullUrl))return null;
  if(kind==="hafez"&&!d.fullUrl.startsWith("/hafez/"))return null;
  const verses=Array.isArray(d.verses)?d.verses as {text?:string;vOrder?:number}[]:[];
  const lines=[...verses].sort((a,b)=>Number(a.vOrder)-Number(b.vOrder)).map(v=>typeof v.text==="string"?v.text.trim():"").filter(Boolean);
  // Only source verses, never Ganjoor's AI summaries or prose descriptions. Complete pairs.
  const body=lines.slice(0,kind==="hafez"?12:4);
  if(body.length<2)return null;
  if(body.length%2)body.pop();
  const text=`${String(d.fullTitle||d.title||"")}\n${body.join("\n")}`;
  if(normalizeFa(text).length<20||!isFamilySafe(text))return null;
  return {id:`ganjoor-${d.id}`,kind,text,source:"ganjoor",sourceLabel:"گنجور",sourceMode:"live",sourceKey:String(d.id),sourceUrl:`https://ganjoor.net${d.fullUrl}`,fetchedAt:new Date().toISOString(),contentHash:contentHash(kind,text)};
}
export async function ganjoorContent(kind:"hafez"|"poem",recent:string[]):Promise<SourcedItem|null>{
  for(let attempt=0;attempt<3;attempt++){
    try{
      const poet=kind==="hafez"?2:GANJOOR_POETS[Math.floor(Math.random()*GANJOOR_POETS.length)];
      const seed=poems.filter(p=>p.poetId===poet);
      const path=[2,3,5,7].includes(poet)?`poem/random?poetId=${poet}`:`poem/${seed[Math.floor(Math.random()*seed.length)]?.sourceKey}`;
      const r=await fetch(`https://api.ganjoor.net/api/ganjoor/${path}`,{cache:"no-store",signal:AbortSignal.timeout(4500)});
      const row=r.ok?parseGanjoor(await r.json(),kind):null;
      if(row&&row.sourceUrl?.split("/")[3]!==({2:"hafez",3:"khayyam",4:"ferdousi",5:"moulavi",6:"nezami",7:"saadi",9:"attar",10:"sanaee"} as Record<number,string>)[poet])continue;
      if(row&&!recent.includes(row.contentHash)&&!recent.includes(row.id))return row;
    }catch{/* Try another poem, then the attributed import. */}
  }
  const rows=poems.filter(p=>kind!=="hafez"||p.poetId===2).map(p=>({...p,kind,contentHash:contentHash(kind,p.text),sourceMode:"verified-import" as const}));
  return chooseContent(rows,recent);
}
export function chooseContent<T extends {id:string;contentHash:string}>(rows:readonly T[],recent:string[]):T|null{
  if(!rows.length)return null;
  const unused=rows.filter(r=>!recent.includes(r.contentHash)&&!recent.includes(r.id));
  if(unused.length)return unused[Math.floor(Math.random()*unused.length)];
  // Exhausted small pools cycle least-recently-seen, never pick randomly from recent.
  return [...rows].sort((a,b)=>Math.max(recent.indexOf(b.contentHash),recent.indexOf(b.id))-Math.max(recent.indexOf(a.contentHash),recent.indexOf(a.id)))[0];
}
