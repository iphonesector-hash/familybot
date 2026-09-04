import {CULTURE_EXTRA,FUN_BANK,pickFresh,type FunKind} from "@/lib/funBank";
import {DEZFULI_POEMS,DEZFULI_PROVERBS,DEZFULI_WORDS} from "@/lib/dezfuliCulture";

export type ContentKind=FunKind|"proverb"|"poem"|"dezfuli-proverb"|"dezfuli-poem"|"dezfuli-word";
export type SourcedItem={id:string;text:string;extra?:string;source:string;kind:ContentKind};

const LOCAL="curated-local";

export function resolveContent(kind:ContentKind, recent:string[]):SourcedItem{
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
  if(kind==="dezfuli-proverb"){
    const item=pickFresh(DEZFULI_PROVERBS,recent);
    return {id:item.id,text:item.text,extra:item.meaning,source:item.source||"dezfuli-curated",kind};
  }
  if(kind==="dezfuli-poem"){
    const item=pickFresh(DEZFULI_POEMS,recent);
    return {id:item.id,text:item.text,extra:item.meaning,source:item.source||"dezfuli-curated",kind};
  }
  const item=pickFresh(DEZFULI_WORDS,recent);
  return {id:item.id,text:`معنی «${item.word}» چیه؟`,extra:item.meaning,source:item.source||"dezfuli-curated",kind};
}

export function poolSize(kind:ContentKind){
  if(kind==="joke"||kind==="fact"||kind==="riddle"||kind==="motivation"||kind==="hafez") return FUN_BANK[kind].length;
  if(kind==="proverb") return CULTURE_EXTRA.proverbs.length;
  if(kind==="poem") return CULTURE_EXTRA.poems.length;
  if(kind==="dezfuli-proverb") return DEZFULI_PROVERBS.length;
  if(kind==="dezfuli-poem") return DEZFULI_POEMS.length;
  return DEZFULI_WORDS.length;
}
