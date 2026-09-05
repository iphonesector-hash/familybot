import assert from 'node:assert/strict';
import fs from 'node:fs';
import {loader,probe} from './phase2-content-probe.mjs';
const load=loader(),{contentHash,normalizeFa,rememberHash}=load('lib/contentHash.ts');
const {validateContent,validateJoke,validateFact}=load('lib/contentValidation.ts');
const {parseGanjoor}=load('lib/contentGanjoor.ts');
const {CURATED_JOKES}=load('lib/curatedJokes.ts');
const dez=load('lib/dezfuliCulture.ts');
assert.equal(normalizeFa('كِتاب\u200f يک'),normalizeFa('کتاب یک'));
assert.equal(contentHash('x','می‌رود'),contentHash('x','میرود'));
let recent=[];for(let i=0;i<70;i++)recent=rememberHash(recent,String(i));assert.equal(recent.length,50);
assert.equal(new Set(recent).size,50);
for(const kind of ['poem','hafez']){
  assert.equal(validateContent(kind,{text:'شعر فارسی خیالی و بی‌منبع',source:'sector-ai'}).accepted,false);
  assert.equal(validateContent(kind,{text:'شعر فارسی خیالی و بی‌منبع',source:'curated-local'}).accepted,false);
}
assert.equal(parseGanjoor({id:1,plainText:'متن ساختگی',fullUrl:'/hafez/ghazal/sh1'},'hafez'),null);
assert.equal(parseGanjoor({id:1,fullUrl:'//evil.test'},'poem'),null);
const parsed=parseGanjoor({id:1,fullTitle:'حافظ',fullUrl:'/hafez/ghazal/sh1',verses:[{vOrder:2,text:'مصرع دوم فقط برای آزمون'},{vOrder:1,text:'مصرع اول فقط برای آزمون'}],poemSummary:'نباید نمایش داده شود'},'hafez');
assert.ok(parsed.text.indexOf('اول')<parsed.text.indexOf('دوم'));assert.ok(!parsed.text.includes('نباید'));
assert.equal(parsed.sourceLabel,'گنجور');assert.equal(parsed.sourceKey,'1');
assert.ok(CURATED_JOKES.length>=150);assert.equal(new Set(CURATED_JOKES.map(r=>contentHash('joke',r.text))).size,CURATED_JOKES.length);
for(const row of CURATED_JOKES)assert.equal(validateJoke(row).accepted,true,row.id);
for(const text of ['معلم به مدرسه رفت!','طنز نوعی ادبیات است و نویسنده گفت: باید تعریف طنز را دانست.','در این جوک، معلم گفت: بخندید و دانش‌آموز گفت: چرا؟','یک جوک کوتاه فارسی برای شما: معلم گفت: سلام. بچه گفت: سلام.','Hello گفت hello گفت hello!', 'معلم گفت: تو احمق هستی. بچه گفت: چرا؟'])assert.equal(validateJoke({text}).accepted,false,text);
assert.equal(validateFact({text:'زمین تنها یک ماه دارد.',source:'nasa',sourceMode:'live'}).accepted,false);
assert.equal(validateFact({text:'چکیده: یک مقاله با صد نویسنده.',source:'openalex',sourceMode:'live',sourceUrl:'https://openalex.org/W1',evidence:'A long source excerpt for testing.'}).accepted,false);

// Execute source adapters and the actual summarizer with explicit fixtures; not live-source evidence.
let responses=[],chatReplies=[];
const factLoad=loader({'@/lib/aiProvider':{completeChat:async()=>({ok:true,text:chatReplies.shift()||'INVALID'})}},{fetch:async()=>Response.json(responses.shift()),Response});
const {factEvidence,summarizeFact}=factLoad('lib/contentFacts.ts');
responses=[[{date:'2024-01-01',explanation:'The Moon has no global magnetic field. Its surface preserves impact craters. These craters record collisions with rocky objects.'}]];
const evidence=(await factEvidence('nasa'))[0];assert.match(evidence.url,/ap240101/);
chatReplies=[JSON.stringify({text:'سطح ماه دهانه‌های برخوردی را حفظ می‌کند.',evidence:'Its surface preserves impact craters.'}),'VALID'];assert.ok(await summarizeFact(evidence));
chatReplies=[JSON.stringify({text:'ماه از پنیر ساخته شده است.',evidence:'The Moon is made of cheese.'})];assert.equal(await summarizeFact(evidence),null);
chatReplies=[JSON.stringify({text:'ماه از پنیر ساخته شده است.',evidence:'Its surface preserves impact craters.'}),'INVALID'];assert.equal(await summarizeFact(evidence),null);
chatReplies=['INVALID'];assert.equal(await summarizeFact(evidence),null);
responses=[{results:[{id:'https://openalex.org/W1',abstract_inverted_index:{Moon:[0],surface:[1],preserves:[2],craters:[3]}}]}];assert.equal((await factEvidence('openalex')).length,0,'metadata/short abstract is not evidence');

// Persistent DB fixture: run the real quiz helpers, CAS, encrypted payload and reward route.
const records=new Map();let counter=0;
function database(){return {from(table){let filters=[],operation='select',payload;
 const query={insert(p){operation='insert';payload=p;return query},update(p){operation='update';payload=p;return query},select(){return query},eq(k,v){filters.push([k,v]);return query},async single(){return execute()},async maybeSingle(){return execute()}};
 function execute(){if(table==='members')return{data:{id:'member-1',is_founder:false},error:null};
 if(operation==='insert'){const data={...payload,id:`quiz-${++counter}`};records.set(data.id,data);return{data:{id:data.id},error:null};}
 const row=[...records.values()].find(r=>filters.every(([k,v])=>r[k]===v));if(!row)return{data:null,error:operation==='select'?Error('missing'):null};if(operation==='update')Object.assign(row,payload);return{data:{...row},error:null};}
 return query;}};}
const priorKey=process.env.SUPABASE_SERVICE_ROLE_KEY;process.env.SUPABASE_SERVICE_ROLE_KEY='test-only-quiz-encryption';
try{
 const {startDezfuliQuiz,answerDezfuliQuiz,quizOptions}=load('lib/dezfuliQuiz.ts');
 const s={familyId:'family-1',chatId:1,userId:1,exp:9999999999},db=database();
 for(const word of dez.DEZFULI_WORDS){for(let i=0;i<5;i++){const q=quizOptions(word.meaning,dez.DEZFULI_WORDS.map(w=>w.meaning));assert.equal(q.options.length,3);assert.equal(new Set(q.options.map(normalizeFa)).size,3);assert.equal(q.options.filter(x=>x===word.meaning).length,1);assert.equal(q.options[q.correctIndex],word.meaning);}}
 for(let i=0;i<100;i++)assert.ok(!quizOptions("آهسته راه رفتن",["قدم زدن آهسته","لباس","شب","عطسه"]).options.includes("قدم زدن آهسته"));
 const word=dez.DEZFULI_WORDS[0],item={id:word.id,text:word.word,extra:word.meaning,source:word.source,sourceLabel:'دزفولی بیاموزیم',sourceMode:'verified-import',contentHash:'hash'};
 const q=await startDezfuliQuiz(db,s,item),correct=q.options.indexOf(word.meaning),wrong=(correct+1)%3;
 assert.ok(!Object.hasOwn(q,'correctIndex'));assert.ok(!Object.hasOwn(q,'meaning'));assert.ok(!Object.hasOwn(q,'extra'));
 const stored=records.get(q.sessionId);assert.equal(stored.status,'closed');assert.equal(stored.reward_coins,0);assert.ok(!stored.prompt.includes(word.meaning));assert.equal(stored.options.length,0);
 await assert.rejects(answerDezfuliQuiz(db,{...s,userId:2},q.sessionId,correct));
 await assert.rejects(answerDezfuliQuiz(db,{...s,familyId:'other'},q.sessionId,correct));
 for(const option of [-1,3,1.5,'1',null])await assert.rejects(answerDezfuliQuiz(db,s,q.sessionId,option));
 assert.equal((await answerDezfuliQuiz(db,s,q.sessionId,wrong)).correct,false);
 await assert.rejects(answerDezfuliQuiz(db,s,q.sessionId,correct));
 const q2=await startDezfuliQuiz(db,s,item),a=q2.options.indexOf(word.meaning);
 const simultaneous=await Promise.allSettled([answerDezfuliQuiz(db,s,q2.sessionId,a),answerDezfuliQuiz(db,s,q2.sessionId,(a+1)%3)]);
 assert.equal(simultaneous.filter(x=>x.status==='fulfilled').length,1);
 assert.equal((await answerDezfuliQuiz(db,s,q2.sessionId,a)).correct,true);
 const q3=await startDezfuliQuiz(db,s,item);records.get(q3.sessionId).expires_at='2000-01-01';await assert.rejects(answerDezfuliQuiz(db,s,q3.sessionId,0));
 let claims=0;const paid=new Set();db.rpc=async(name,args)=>{assert.equal(name,'family_claim_dezfuli_quiz_atomic');assert.equal(args.p_word_id,word.id);const key=args.p_member_id+args.p_word_id;if(paid.has(key))return{data:{alreadyClaimed:true}};paid.add(key);claims++;return{data:{claimed:true}};};
 const route=loader({'@supabase/supabase-js':{createClient:()=>db},'@/lib/familySession':{verifyFamilySession:()=>s}})('app/api/family/culture/quiz/route.ts');
 const oldUrl=process.env.NEXT_PUBLIC_SUPABASE_URL;process.env.NEXT_PUBLIC_SUPABASE_URL='https://test.invalid';
 for(let i=0;i<2;i++){const r=await route.POST(new Request('https://test.invalid',{method:'POST',headers:{authorization:'Bearer test','content-type':'application/json'},body:JSON.stringify({sessionId:q2.sessionId,option:a})}));const body=await r.json();assert.equal(body.correct,true);assert.equal(body.claimed,i===0);}
 assert.equal(claims,1);if(oldUrl===undefined)delete process.env.NEXT_PUBLIC_SUPABASE_URL;else process.env.NEXT_PUBLIC_SUPABASE_URL=oldUrl;
}finally{if(priorKey===undefined)delete process.env.SUPABASE_SERVICE_ROLE_KEY;else process.env.SUPABASE_SERVICE_ROLE_KEY=priorKey;}
const sampled=await probe({offline:true});for(const kind of ['poem','proverb','joke']){assert.equal(sampled.kinds[kind].unique,30);assert.equal(sampled.kinds[kind].errors,0);}
assert.equal(sampled.kinds['dezfuli-proverb'].unique,15);assert.equal(sampled.kinds['dezfuli-poem'].unique,11);
for(const kind of ['dezfuli-proverb','dezfuli-poem']){const rows=sampled.kinds[kind].outputs;for(let i=1;i<rows.length;i++)assert.notEqual(rows[i].contentHash,rows[i-1].contentHash);}
const source=fs.readFileSync(new URL('../app/section/fun/page.tsx',import.meta.url),'utf8');assert.match(source,/sessionId:current.sessionId,option:v/);assert.match(source,/slice\(0,50\)/);assert.match(source,/کلمه بعدی/);
console.log('phase2-content: poetry provenance, pools, grounding, validators, dedupe, 3 choices, secrecy, expiry, ownership, concurrent answer and atomic reward retry passed (fixtures; not Bale QA)');
