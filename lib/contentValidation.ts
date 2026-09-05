import {isFamilySafe} from "@/lib/contentSafety";
type Candidate={text?:string;extra?:string;options?:string[];source?:string;sourceMode?:string;sourceUrl?:string;evidence?:string};
export type Validation={accepted:boolean;reason?:"article_not_joke"|"too_long"|"unsafe"|"duplicate"|"invalid_persian"|"missing_punchline"|"invalid_answer"|"unsupported_source"|"empty"};
const Persian=/[\u0600-\u06ff]/;
export function validateJoke(row:Candidate):Validation{
  const text=String(row.text||"").trim();
  if(!text)return{accepted:false,reason:"empty"};
  if(text.length>420)return{accepted:false,reason:"too_long"};
  const letters=text.match(/\p{L}/gu)||[],persian=text.match(/[آ-ی]/g)||[];
  if(persian.length<20||persian.length/Math.max(letters.length,1)<.8)return{accepted:false,reason:"invalid_persian"};
  if(!isFamilySafe(text)||/احمق|کودن|نفهم|نژاد|قومیت|ترکها|لرها|رشتی|افغانی|عربها|مذهب|سیاست|تنبان|شاش|کسکش|جنده/.test(text.replace(/\u200c/g,"")))return{accepted:false,reason:"unsafe"};
  if(/https?:\/\/|www\.|تعریف طنز|در این جوک|این (?:لطیفه|جوک|شوخی)|تحلیل|منبع:|ویکی|دانشنامه|عبارت است از|گونه‌ای از|در ادامه|امیدوارم|پایان خنده|جوک کوتاه|طنز (?:به|نوعی)|ساختار شوخی/i.test(text))return{accepted:false,reason:"article_not_joke"};
  // Punctuation or a job title alone is not a setup and punchline.
  const turns=text.match(/گفت(?:م|ند)?|پرسید(?:م)?|جواب داد|میگه|پرسیدند/g)||[];
  const end=text.split(/[.!؟?]/).filter(x=>x.trim()).at(-1)||"";
  return turns.length>=2&&end.trim().length>=12?{accepted:true}:{accepted:false,reason:"missing_punchline"};
}
export function validateRiddle(row:Candidate):Validation{const q=String(row.text||"").trim(),answer=String(row.extra||"").split("/")[0].trim(),options=(row.options||[]).map(x=>String(x).trim()).filter(Boolean);if(!q||!answer)return{accepted:false,reason:"empty"};if(!Persian.test(q)||q.length<8||q.length>240)return{accepted:false,reason:"invalid_persian"};if(!isFamilySafe(`${q} ${answer}`))return{accepted:false,reason:"unsafe"};if(options.length!==4||new Set(options).size!==4||!options.includes(answer))return{accepted:false,reason:"invalid_answer"};return{accepted:true}}
export function validateFact(row:Candidate):Validation{
  const text=String(row.text||"").trim();
  if(!text||text.includes("INVALID"))return{accepted:false,reason:"empty"};
  if(!["nasa","smithsonian","openalex","wikipedia-fa"].includes(String(row.source))||!row.sourceUrl?.startsWith("https://")||!row.evidence||row.evidence.length<25||!["live","cached-remote","verified-import"].includes(String(row.sourceMode)))return{accepted:false,reason:"unsupported_source"};
  if(text.length>350||text.split(/[.!؟]/).filter(s=>s.trim()).length>2)return{accepted:false,reason:"too_long"};
  if(!Persian.test(text))return{accepted:false,reason:"invalid_persian"};
  if(/doi:|ISSN|چکیده|نویسندگان:|کلیدواژه|abstract|metadata|\{\s*"/i.test(text))return{accepted:false,reason:"unsupported_source"};
  return isFamilySafe(text)?{accepted:true}:{accepted:false,reason:"unsafe"};
}
export function validateDezfuli(row:Candidate):Validation{const text=String(row.text||"").trim();if(!text)return{accepted:false,reason:"empty"};if(!["cached-remote","verified-import","curated-local"].includes(String(row.sourceMode||"")))return{accepted:false,reason:"unsupported_source"};return isFamilySafe(text)?{accepted:true}:{accepted:false,reason:"unsafe"}}
export function validateContent(kind:string,row:Candidate):Validation{if(kind==="joke")return validateJoke(row);if(kind==="riddle")return validateRiddle(row);if(kind==="fact")return validateFact(row);if(kind.startsWith("dezfuli"))return validateDezfuli(row);if((kind==="hafez"||kind==="poem")&&(row.source!=="ganjoor"||!row.sourceUrl?.startsWith("https://ganjoor.net/")))return{accepted:false,reason:"unsupported_source"};const text=String(row.text||"").trim();return text&&isFamilySafe(text)?{accepted:true}:{accepted:false,reason:text?"unsafe":"empty"}}
