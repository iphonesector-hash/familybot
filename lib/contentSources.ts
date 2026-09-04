import {CULTURE_EXTRA,FUN_BANK,pickFresh,type FunKind} from "@/lib/funBank";
import {DEZFULI_POEMS,DEZFULI_PROVERBS,DEZFULI_WORDS} from "@/lib/dezfuliCulture";

export type ContentKind=FunKind|"proverb"|"poem"|"dezfuli-proverb"|"dezfuli-poem"|"dezfuli-word";
export type SourcedItem={id:string;text:string;extra?:string;source:string;kind:ContentKind};

export type ContentAdapter={
  id:string;
  kinds:ContentKind[];
  resolve:(kind:ContentKind, recent:string[])=>SourcedItem|null;
};

const LOCAL="curated-local";

const localAdapter:ContentAdapter={
  id:LOCAL,
  kinds:["joke","fact","riddle","motivation","hafez","proverb","poem"],
  resolve(kind,recent){
    if(kind==="joke"||kind==="fact"||kind==="riddle"||kind==="motivation"||kind==="hafez"){
      const item=pickFresh(FUN_BANK[kind],recent);
      return {id:item.id,text:item.text,extra:item.extra,source:LOCAL,kind};
    }
    if(kind==="proverb"){
      const item=pickFresh(CULTURE_EXTRA.proverbs,recent);
      return {id:item.id,text:item.text,extra:item.meaning,source:LOCAL,kind};
    }
    if(kind==="poem"){
      const item=pickFresh(CULTURE_EXTRA.poems,recent);
      return {id:item.id,text:item.text,extra:item.meaning,source:LOCAL,kind};
    }
    return null;
  }
};

/** Dezfuli stays curated-only. Do not invent vocabulary. */
const dezfuliAdapter:ContentAdapter={
  id:"dezfuli-curated",
  kinds:["dezfuli-proverb","dezfuli-poem","dezfuli-word"],
  resolve(kind,recent){
    if(kind==="dezfuli-proverb"){
      const item=pickFresh(DEZFULI_PROVERBS,recent);
      return {id:item.id,text:item.text,extra:item.meaning,source:item.source||"dezfuli-curated",kind};
    }
    if(kind==="dezfuli-poem"){
      const item=pickFresh(DEZFULI_POEMS,recent);
      return {id:item.id,text:item.text,extra:item.meaning,source:item.source||"dezfuli-curated",kind};
    }
    if(kind==="dezfuli-word"){
      const item=pickFresh(DEZFULI_WORDS,recent);
      return {id:item.id,text:`معنی «${item.word}» چیه؟`,extra:item.meaning,source:item.source||"dezfuli-curated",kind};
    }
    return null;
  }
};

/**
 * Remote/AI adapters can be registered later. They must return null on failure
 * so the curated adapters remain the graceful fallback.
 */
const remoteAdapters:ContentAdapter[]=[];

export const CONTENT_ADAPTERS:ContentAdapter[]=[...remoteAdapters,localAdapter,dezfuliAdapter];

export function resolveContent(kind:ContentKind, recent:string[]):SourcedItem{
  for(const adapter of CONTENT_ADAPTERS){
    if(!adapter.kinds.includes(kind)) continue;
    const item=adapter.resolve(kind,recent);
    if(item) return item;
  }
  return {id:"fallback",text:"محتوا فعلاً در دسترس نیست.",source:"fallback",kind};
}

export function poolSize(kind:ContentKind){
  if(kind==="joke"||kind==="fact"||kind==="riddle"||kind==="motivation"||kind==="hafez") return FUN_BANK[kind].length;
  if(kind==="proverb") return CULTURE_EXTRA.proverbs.length;
  if(kind==="poem") return CULTURE_EXTRA.poems.length;
  if(kind==="dezfuli-proverb") return DEZFULI_PROVERBS.length;
  if(kind==="dezfuli-poem") return DEZFULI_POEMS.length;
  return DEZFULI_WORDS.length;
}
