"use client";
import {useState} from "react";
import {Icon,IconOrb} from "../../ui";
import Accordion from "../../ui/Accordion";
import {DEZFULI_WORDS} from "@/lib/dezfuliCulture";

type Kind="joke"|"fact"|"riddle"|"motivation"|"hafez"|"proverb"|"poem"|"dezfuli-word"|"dezfuli-proverb"|"dezfuli-poem";
type Riddle={sessionId:string;text:string;options:string[]};
const KEY="familybot.funRecent";
function readRecent(){try{return JSON.parse(sessionStorage.getItem(KEY)||"[]") as string[]}catch{return []}}
function writeRecent(id:string){const next=[id,...readRecent().filter(x=>x!==id)].slice(0,28);try{sessionStorage.setItem(KEY,JSON.stringify(next))}catch{}}
const fa=(n:number)=>new Intl.NumberFormat("fa-IR").format(n||0);

export default function FunPage(){
  const[text,setText]=useState("یکی از بخش‌ها را انتخاب کن");
  const[answer,setAnswer]=useState("");
  const[source,setSource]=useState("");
  const[quiz,setQuiz]=useState<typeof DEZFULI_WORDS[number]|null>(null);
  const[riddle,setRiddle]=useState<Riddle|null>(null);
  const[score,setScore]=useState(0);
  const[busy,setBusy]=useState(false);

  async function get(k:Kind){
    setAnswer("");setQuiz(null);setRiddle(null);setSource("");
    if(k==="dezfuli-word"){
      const recent=readRecent();
      const pool=DEZFULI_WORDS.filter(x=>!recent.includes(x.id));
      const q=(pool.length?pool:DEZFULI_WORDS)[Math.floor(Math.random()*(pool.length||DEZFULI_WORDS.length))];
      writeRecent(q.id);setQuiz(q);setText(`معنی «${q.word}» چیه؟`);setSource(q.source||"dezfuli-curated");return;
    }
    const s=sessionStorage.getItem("familybot.session");
    if(!s)return setText("Mini App را از داخل بله باز کن.");
    const r=await fetch("/api/family/fun",{method:"POST",headers:{"content-type":"application/json",authorization:`Bearer ${s}`},body:JSON.stringify({type:k,recent:readRecent()})});
    const x=await r.json();
    if(!x.ok){setText("محتوا فعلاً در دسترس نیست.");return}
    if(x.data.id)writeRecent(String(x.data.id));
    setText(x.data.text);
    setSource(String(x.data.source||"curated-local"));
    if(k==="riddle"&&Array.isArray(x.data.options)&&x.data.sessionId){
      setRiddle({sessionId:String(x.data.sessionId),text:String(x.data.text),options:x.data.options.map(String)});
      setAnswer("");
      return;
    }
    setAnswer(x.data.interpretation||"");
  }

  async function choose(v:string){
    if(!quiz||busy)return;const current=quiz;setBusy(true);
    try{
      const s=sessionStorage.getItem("familybot.session");if(!s){setAnswer("Mini App را از داخل بله باز کن.");return}
      const r=await fetch("/api/family/culture/quiz",{method:"POST",headers:{"content-type":"application/json",authorization:`Bearer ${s}`},body:JSON.stringify({wordId:current.id,answer:v})});
      const x=await r.json();if(!r.ok||!x.ok)throw new Error();
      if(x.correct){
        const coins=Number(x.reward?.coins||0),cp=Number(x.reward?.cp||0);
        if(!x.alreadyClaimed&&(coins||cp))setScore(n=>n+coins+cp);
        setAnswer(x.alreadyClaimed?`قبلاً جایزه این واژه را گرفته‌ای. معنی درست «${x.meaning}» است.`:`آفرین! +${fa(coins)} سکه · +${fa(cp)} CP\nمعنی درست «${x.meaning}» است.`);
      }else setAnswer(`جواب درست: ${x.meaning}`);
      setQuiz(null);
    }catch{setAnswer("ثبت پاسخ انجام نشد.")}finally{setBusy(false)}
  }

  async function chooseRiddle(index:number){
    if(!riddle||busy)return;
    setBusy(true);
    try{
      const s=sessionStorage.getItem("familybot.session");if(!s){setAnswer("Mini App را از داخل بله باز کن.");return}
      const r=await fetch("/api/family/fun",{method:"POST",headers:{"content-type":"application/json",authorization:`Bearer ${s}`},body:JSON.stringify({action:"riddle.answer",sessionId:riddle.sessionId,option:index})});
      const x=await r.json();if(!r.ok||!x.ok)throw new Error(x.error||"riddle_failed");
      if(x.correct){
        const coins=Number(x.reward?.coins||0),cp=Number(x.reward?.cp||0);
        if(!x.alreadyClaimed&&(coins||cp))setScore(n=>n+coins+cp);
        setAnswer(x.alreadyClaimed?`این چیستان قبلاً جایزه گرفته. جواب: ${x.answer}`:`آفرین! +${fa(coins)} سکه · +${fa(cp)} CP\nجواب: ${x.answer}`);
      }else setAnswer(`اشتباه بود. جواب درست: ${x.answer||x.meaning}`);
      setRiddle(null);
    }catch{setAnswer("ثبت پاسخ انجام نشد.")}finally{setBusy(false)}
  }

  return <main className="appShell">
    <div className="ambient ambientA"/><header className="appHeader"><a href="/" className="roundButton">←</a><div className="wordmark"><b>سرگرمی و فرهنگ</b><span>محتوای گسترده بدون تکرار فوری</span></div><IconOrb name="gift" tone="pink"/></header>
    <section className="premiumPanel" style={{padding:18,textAlign:"center"}}>
      <span className="eyebrow">امتیاز این نشست · {score}</span>
      {source?<small className="sourceTag">منبع: {source}</small>:null}
      <p style={{fontSize:18,lineHeight:2,whiteSpace:"pre-line"}}>{text}</p>
      {quiz&&<div style={{display:"grid",gap:8}}>{quiz.options.map(o=><button disabled={busy} className="primaryCta" key={o} onClick={()=>void choose(o)}>{o}</button>)}</div>}
      {riddle&&<div style={{display:"grid",gap:8}}>{riddle.options.map((o,i)=><button disabled={busy} className="primaryCta" key={`${o}-${i}`} onClick={()=>void chooseRiddle(i)}>{o}</button>)}</div>}
      {answer&&<div className="adminNotice" style={{marginTop:10,lineHeight:2,whiteSpace:"pre-line"}}>{answer}</div>}
    </section>
    <Accordion title="سرگرمی" summary="جوک، دانستنی، چیستان، فال" defaultOpen>
      <div className="actionGrid">
        {([["joke","جوک"],["fact","دانستنی"],["riddle","چیستان"],["motivation","انگیزه"],["hafez","فال حافظ"]] as const).map(([k,t])=><button className="coolBtn" key={k} onClick={()=>void get(k)}><b>{t}</b></button>)}
      </div>
    </Accordion>
    <Accordion title="ادبیات فارسی" summary="ضرب‌المثل و شعر کلاسیک">
      <div className="actionGrid">
        <button className="coolBtn" onClick={()=>void get("proverb")}><b>ضرب‌المثل</b></button>
        <button className="coolBtn" onClick={()=>void get("poem")}><b>شعر</b></button>
      </div>
    </Accordion>
    <Accordion title="فرهنگ دزفولی" summary="واژه، ضرب‌المثل و لالایی مستند">
      <div className="actionGrid">
        <button className="coolBtn" onClick={()=>void get("dezfuli-word")}><b>کلمه دزفولی</b></button>
        <button className="coolBtn" onClick={()=>void get("dezfuli-proverb")}><b>ضرب‌المثل</b></button>
        <button className="coolBtn" onClick={()=>void get("dezfuli-poem")}><b>شعر محلی</b></button>
      </div>
    </Accordion>
  </main>;
}
