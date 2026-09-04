import {contentHash,normalizeFa} from "@/lib/contentHash";
import {isFamilySafe} from "@/lib/contentSafety";

export type IngestedDezfuli={
  word:string;
  meaning:string;
  source:string;
  sourceLabel:string;
  sourceUrl:string;
  sourceMode:"cached-remote";
  contentHash:string;
  fetchedAt:string;
};

type Cache={at:number;items:IngestedDezfuli[]};
const TTL=3*24*60*60*1000;
let cache:Cache|null=null;
let inflight:Promise<IngestedDezfuli[]>|null=null;

function strip(html:string){
  return html.replace(/<script[\s\S]*?<\/script>/gi," ").replace(/<style[\s\S]*?<\/style>/gi," ").replace(/<[^>]+>/g," ").replace(/&nbsp;/g," ").replace(/&/g,"&").replace(/\s+/g," ").trim();
}

function pair(word:string,meaning:string,source:string,label:string,url:string):IngestedDezfuli|null{
  const w=normalizeFa(word).slice(0,48);
  const m=normalizeFa(meaning).slice(0,80);
  if(w.length<2||m.length<2)return null;
  if(w.length>40||m.length>70)return null;
  if(!isFamilySafe(`${w} ${m}`))return null;
  return {
    word:w,
    meaning:m,
    source,
    sourceLabel:label,
    sourceUrl:url,
    sourceMode:"cached-remote",
    contentHash:contentHash("dezfuli-word",`${w}:${m}`),
    fetchedAt:new Date().toISOString()
  };
}

async function timedText(url:string,ms=6000){
  try{
    const r=await fetch(url,{cache:"no-store",headers:{accept:"text/html","user-agent":"FamilyBot/1.0"},signal:AbortSignal.timeout(ms)});
    if(!r.ok)return "";
    return await r.text();
  }catch{
    return "";
  }
}

function parseTelegram(html:string){
  const out:IngestedDezfuli[]=[];
  const blocks=[...html.matchAll(/class="tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>/g)].map(m=>strip(m[1]||""));
  for(const block of blocks){
    const parts=block.split(/(?<=[.؟!])\s+/);
    for(const line of [block,...parts]){
      const m=line.match(/^(.{2,40}?)\s*[=:：]\s*(.{2,60})$/);
      if(!m)continue;
      const row=pair(m[1],m[2],"dezfuli-biamoozim","دزفولی بیاموزیم","https://t.me/s/dezfuli_biamoozim");
      if(row)out.push(row);
    }
  }
  return out;
}

function parseChamadane(html:string,page:"lexicon"|"animals"){
  const text=strip(html);
  const out:IngestedDezfuli[]=[];
  const re=/([\u0600-\u06FF\u064B-\u0652\s]{2,32}?)\s*(?:\([^)]{0,24}\))?\s*=\s*([\u0600-\u06FF\u064B-\u0652،,\s]{2,60})/g;
  let m:RegExpExecArray|null;
  while((m=re.exec(text))){
    const row=pair(
      m[1],
      m[2],
      page==="animals"?"chamadane-abi-animals":"chamadane-abi-lexicon",
      "چمدان آبی",
      page==="animals"?"https://chamadaneabi.ir/heyvanat-dezfuli/":"https://chamadaneabi.ir/kalamat-dezfuli/"
    );
    if(row)out.push(row);
    if(out.length>=40)break;
  }
  return out;
}

async function ingestNow(){
  const [tg,lex,anim]=await Promise.all([
    timedText("https://t.me/s/dezfuli_biamoozim"),
    timedText("https://chamadaneabi.ir/kalamat-dezfuli/"),
    timedText("https://chamadaneabi.ir/heyvanat-dezfuli/")
  ]);
  const rows=[
    ...(tg?parseTelegram(tg):[]),
    ...(lex?parseChamadane(lex,"lexicon"):[]),
    ...(anim?parseChamadane(anim,"animals"):[])
  ];
  const seen=new Set<string>();
  const unique=rows.filter(x=>{
    if(seen.has(x.contentHash))return false;
    seen.add(x.contentHash);
    return true;
  });
  console.info("[content.source]",{kind:"dezfuli-word",source:"dezfuli-ingest",status:unique.length?"cached-remote":"empty_parse",count:unique.length});
  return unique;
}

export async function cachedDezfuliRemote(){
  if(cache&&Date.now()-cache.at<TTL)return cache.items;
  if(inflight)return inflight;
  inflight=ingestNow().then(items=>{
    cache={at:Date.now(),items};
    inflight=null;
    return items;
  }).catch(()=>{
    inflight=null;
    return cache?.items||[];
  });
  return inflight;
}

export function dezfuliIngestStatus(){
  return {
    cached:Boolean(cache&&Date.now()-cache.at<TTL),
    count:cache?.items.length||0,
    mode:cache&&cache.items.length?"cached-remote":"verified-import"
  };
}
