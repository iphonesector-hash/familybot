import {createCipheriv,createDecipheriv,createHash,randomBytes,randomInt} from "node:crypto";
import type {SupabaseClient} from "@supabase/supabase-js";
import type {FamilySessionPayload} from "@/lib/familySession";
import type {SourcedItem} from "@/lib/contentRemote";
import {DEZFULI_WORDS} from "@/lib/dezfuliCulture";
import {normalizeFa} from "@/lib/contentHash";
function sameMeaningFamily(a:string,b:string){
  const x=normalizeFa(a),y=normalizeFa(b);
  if(x.includes(y)||y.includes(x))return true;
  return [/آهسته|آرام/,/عجله|سریع|تند|بیقرار|بی تاب/,/آرایش/,/پاره|شکسته|خورد کردن/,/شل|سست|تنبل|بیحال/].some(re=>re.test(x)&&re.test(y));
}
export function quizOptions(meaning:string,meanings:readonly string[]){
  const unique=[...new Map(meanings.map(m=>[normalizeFa(m),m])).values()].filter(m=>!sameMeaningFamily(m,meaning));
  if(!meaning||unique.length<2)throw Error("quiz_options_unavailable");
  const options=[meaning];
  while(options.length<3)options.push(unique.splice(randomInt(unique.length),1)[0]);
  for(let i=options.length-1;i>0;i--){const j=randomInt(i+1);[options[i],options[j]]=[options[j],options[i]];}
  return {options,correctIndex:options.indexOf(meaning)};
}
type PrivateQuiz={userId:number;wordId:string;word:string;meaning:string;options:string[];correctIndex:number;source:string;sourceLabel:string;sourceUrl?:string;sourceMode:string;contentHash:string};
function key(){const secret=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!secret)throw Error("db_not_configured");return createHash("sha256").update(`content-dezfuli-v1:${secret}`).digest();}
function seal(q:PrivateQuiz){const iv=randomBytes(12),c=createCipheriv("aes-256-gcm",key(),iv);const body=Buffer.concat([c.update(JSON.stringify(q),"utf8"),c.final()]);return Buffer.concat([iv,c.getAuthTag(),body]).toString("base64url");}
function open(text:string):PrivateQuiz{const b=Buffer.from(text,"base64url"),d=createDecipheriv("aes-256-gcm",key(),b.subarray(0,12));d.setAuthTag(b.subarray(12,28));return JSON.parse(Buffer.concat([d.update(b.subarray(28)),d.final()]).toString("utf8"));}
export async function startDezfuliQuiz(db:SupabaseClient<any,"public","familybot">,s:FamilySessionPayload,item:SourcedItem){
  const word=DEZFULI_WORDS.find(w=>w.id===item.id&&w.meaning===item.extra);
  if(!word)throw Error("unverified_quiz_word");
  const q:PrivateQuiz={userId:s.userId,wordId:word.id,word:word.word,meaning:word.meaning,...quizOptions(word.meaning,DEZFULI_WORDS.map(w=>w.meaning)),source:item.source,sourceLabel:item.sourceLabel,sourceUrl:item.sourceUrl,sourceMode:item.sourceMode,contentHash:item.contentHash};
  // Closed records cannot enter existing bot/game reward paths. No game rule or schema changes.
  // Encrypt source payload too: public table readers must not recover the answer.
  const ins=await db.from("game_sessions").insert({family_id:s.familyId,chat_id:s.chatId,game_type:"content-dezfuli-word",status:"closed",prompt:seal(q),answer:"pending",options:[],reward_coins:0,expires_at:new Date(Date.now()+600000).toISOString()}).select("id").single();
  if(ins.error)throw ins.error;
  return {type:"dezfuli-word",id:item.id,sessionId:ins.data.id,text:`«${word.word}»\nاین کلمه دزفولی یعنی چی؟`,options:q.options,source:q.source,sourceLabel:q.sourceLabel,sourceMode:q.sourceMode,contentHash:q.contentHash};
}
export async function answerDezfuliQuiz(db:SupabaseClient<any,"public","familybot">,s:FamilySessionPayload,sessionId:unknown,option:unknown){
  if(typeof sessionId!=="string"||!Number.isInteger(option)||Number(option)<0||Number(option)>2)throw Error("invalid_quiz_answer");
  const r=await db.from("game_sessions").select("id,prompt,answer,expires_at").eq("id",sessionId).eq("family_id",s.familyId).eq("game_type","content-dezfuli-word").eq("status","closed").single();
  if(r.error||!r.data)throw Error("quiz_not_found");
  const q=open(r.data.prompt);
  if(q.userId!==s.userId)throw Error("quiz_not_found");
  if(!r.data.expires_at||Date.parse(r.data.expires_at)<Date.now())throw Error("quiz_expired");
  let selected=r.data.answer;
  if(selected==="pending"){
    const won=await db.from("game_sessions").update({answer:String(option)}).eq("id",sessionId).eq("answer","pending").select("id").maybeSingle();
    if(won.error)throw won.error;
    if(!won.data)throw Error("quiz_answer_in_progress");
    selected=String(option);
  }
  if(selected!==String(option))throw Error("quiz_already_answered");
  // Same-answer retries can call the existing atomic reward RPC after a transient failure.
  return {...q,correct:Number(selected)===q.correctIndex};
}
