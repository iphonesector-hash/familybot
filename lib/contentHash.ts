import {createHash} from "node:crypto";

export function normalizeFa(text:string){
  return String(text||"")
    .replace(/[يى]/g,"ی")
    .replace(/ك/g,"ک")
    .replace(/[ًٌٍَُِّْـ]/g,"")
    .replace(/[^\p{L}\p{N}\s]/gu," ")
    .replace(/\s+/g," ")
    .trim();
}

export function contentHash(kind:string,text:string){
  const body=`${kind}:${normalizeFa(text)}`;
  return createHash("sha1").update(body).digest("hex").slice(0,16);
}

export function isDuplicate(hash:string,recent:string[]){
  return recent.includes(hash);
}

export function rememberHash(recent:string[],hash:string,limit=50){
  return [hash,...recent.filter(x=>x!==hash)].slice(0,limit);
}
