"use client";
import {useState} from "react";
import {Icon,IconOrb} from "../../ui";
import Accordion from "../../ui/Accordion";
import {DEZFULI_WORDS} from "@/lib/dezfuliCulture";

type Kind="joke"|"fact"|"riddle"|"motivation"|"hafez"|"proverb"|"poem"|"dezfuli-word"|"dezfuli-proverb"|"dezfuli-poem";
const KEY="familybot.funRecent";
function readRecent(){try{return JSON.parse(sessionStorage.getItem(KEY)||"[]") as string[]}catch{return []}}
function writeRecent(id:string){const next=[id,...readRecent().filter(x=>x!==id)].slice(0,28);try{sessionStorage.setItem(KEY,JSON.stringify(next))}catch{}}

export default function FunPage(){
  const[text,setText]=useState("یکی از بخش‌ها را انتخاب کن");
  const[answer,setAnswer]=useState("");
  const[quiz,setQuiz]=useState<typeof DEZFULI_WORDS[number]|null>(null);
  const[score,setScore]=useState(0);
  const[busy,setBusy]=useState(false);

  async function get(k:Kind){
    setAnswer("");setQuiz(null);
    if(k==="dezfuli-word"){
      const recent=readRecent();
      const pool=DEZFULI_WORDS.filter(x=>!recent.includes(x.id));
      const q=(pool.length?pool:DEZFULI_WORDS)[Math.floor(Math.random()*(pool.length||DEZFULI_WORDS.length))];
      writeRecent(q.id);setQuiz(q);setText(`معنی «${q.word}» چیه؟`);return;
    }
    const s=sessionStorage.getItem("familybot.session");
    if(!s)return setText("Mini App را از داخل بله باز کن.");
    const r=await fetch("/api/family/fun",{method:"POST",headers:{"content-type":"application/json",authorization:`Bearer ${s}`},body:JSON.stringify({type:k,recent:readRecent()})});
    const x=await r.json();
    if(x.ok){if(x.data.id)writeRecent(String(x.data.id));setText(x.data.text);setAnswer(x.data.interpretation||x.data.answer||"")}
    else setText("محتوا فعلاً در دسترس نیست.");
  }

  async function choose(v:string){
    if(!quiz||busy)return;const current=quiz;setBusy(true);
    try{
      const s=sessionStorage.getItem("familybot.session");if(!s){setAnswer("Mini App را از داخل بله باز کن.");return}
      const r=await fetch("/api/family/culture/quiz",{method:"POST",headers:{"content-type":"application/json",authorization:`Bearer ${s}`},body:JSON.stringify({wordId:current.id,answer:v})});
      const x=await r.json();if(!r.ok||!x.ok)throw new Error();
      if(x.correct){if(x.claimed)setScore(n=>n+10);setAnswer(`آفرین! معنی درست «${x.meaning}» است.`)}else setAnswer(`جواب درست: ${x.meaning}`);
      setQuiz(null);
    }catch{setAnswer("ثبت پاسخ انجام نشد.")}finally{setBusy(false)}
  }

  return <main className="appShell">
    <div className="ambient ambientA"/><header className="appHeader"><a href="/" className="roundButton">←</a><div className="wordmark"><b>سرگرمی و فرهنگ</b><span>محتوای گسترده بدون تکرار فوری</span></div><IconOrb name="gift" tone="pink"/></header>
    <section className="premiumPanel" style={{padding:18,textAlign:"center"}}>
      <span className="eyebrow">امتیاز این نشست · {score}</span>
      <p style={{fontSize:18,lineHeight:2,whiteSpace:"pre-line"}}>{text}</p>
      {quiz&&<div style={{display:"grid",gap:8}}>{quiz.options.map(o=><button disabled={busy} className="primaryCta" key={o} onClick={()=>void choose(o)}>{o}</button>)}</div>}
      {answer&&<div className="adminNotice" style={{marginTop:10,lineHeight:2}}>{answer}</div>}
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
