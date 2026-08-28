"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Icon, Mascot, MascotMood } from "../ui";

type ChatMessage={role:"user"|"assistant";content:string};
type SpeechRecognitionLike={lang:string;interimResults:boolean;continuous:boolean;start:()=>void;stop:()=>void;onresult:((event:any)=>void)|null;onend:(()=>void)|null;onerror:(()=>void)|null};

const quick=[
  ["calendar","برنامه‌ریزی یک جمع خانوادگی","برای آخر هفته یک دورهمی پیشنهاد بده"],
  ["birthday","یادآوری تولد اعضای خانواده","تولدهای نزدیک رو بهم بگو"],
  ["tasks","ساخت یک کوئیز خانوادگی","یه کوئیز خانوادگی ۵ سوالی بساز"],
  ["family","خلاصه‌سازی گروه خانواده","اتفاقات امروز خانواده رو خلاصه کن"],
] as const;

export default function AiPage(){
  const [messages,setMessages]=useState<ChatMessage[]>([{role:"assistant",content:"سلام! من Family AI هستم. هر چیزی برای خانواده لازم داری، تایپ کن یا با صدات بگو 💜"}]);
  const [input,setInput]=useState("");
  const [listening,setListening]=useState(false);
  const [busy,setBusy]=useState(false);
  const [speaking,setSpeaking]=useState(false);
  const [toast,setToast]=useState("");
  const recognitionRef=useRef<SpeechRecognitionLike|null>(null);
  const toastTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const speechSupported=useMemo(()=>typeof window!=="undefined"&&Boolean((window as any).SpeechRecognition||(window as any).webkitSpeechRecognition),[]);

  useEffect(()=>{if(!speechSupported)return;const SpeechRecognition=(window as any).SpeechRecognition||(window as any).webkitSpeechRecognition;const r:SpeechRecognitionLike=new SpeechRecognition();r.lang="fa-IR";r.interimResults=false;r.continuous=false;r.onresult=(e:any)=>{const text=e.results?.[0]?.[0]?.transcript??"";setInput(text);showToast("صدات رو گرفتم ✨")};r.onend=()=>setListening(false);r.onerror=()=>{setListening(false);showToast("دوباره امتحان کن؛ صدات کامل دریافت نشد")};recognitionRef.current=r;return()=>r.stop()},[speechSupported]);

  function showToast(text:string){setToast(text);if(toastTimer.current)clearTimeout(toastTimer.current);toastTimer.current=setTimeout(()=>setToast(""),2200)}
  function speak(text:string){if(typeof window==="undefined"||!("speechSynthesis" in window))return;window.speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang="fa-IR";u.rate=.98;u.pitch=1;u.onstart=()=>setSpeaking(true);u.onend=()=>setSpeaking(false);u.onerror=()=>setSpeaking(false);window.speechSynthesis.speak(u)}
  async function submit(e?:FormEvent,forced?:string){e?.preventDefault();const value=(forced??input).trim();if(!value||busy)return;setMessages(c=>[...c,{role:"user",content:value}]);setInput("");setBusy(true);try{const response=await fetch("/api/ai/chat",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({message:value,history:messages.slice(-12)})});const data=await response.json();const reply=data.reply||"فعلاً نتونستم پاسخ بدم؛ دوباره امتحان کن 💜";setMessages(c=>[...c,{role:"assistant",content:reply}]);speak(reply)}catch{showToast("ارتباط با Family AI برقرار نشد")}finally{setBusy(false)}}
  function toggleListening(){const r=recognitionRef.current;if(!r){showToast("تشخیص گفتار روی این مرورگر آماده نیست");return}if(listening){r.stop();setListening(false)}else{window.speechSynthesis?.cancel();setSpeaking(false);setListening(true);r.start()}}

  const mood:MascotMood=listening?"listening":busy?"thinking":speaking?"speaking":"idle";
  const status=listening?"در حال گوش دادن":busy?"در حال فکر کردن":speaking?"در حال پاسخ دادن":"آماده گفتگو";
  const waveClass=listening?"active":busy?"thinking":speaking?"speaking":"";

  return <main className="appShell aiScreen"><div className="ambient ambientA"/><div className="ambient ambientB"/><div className="starField"/>
    <div className={`motionToast${toast?" show":""}`}>{toast}</div>
    <header className="aiTop"><a className="roundButton" href="/" aria-label="بازگشت">←</a><div className="aiTitle"><h1>هوش مصنوعی خانواده <span style={{color:"#ff6fae"}}>♥</span></h1><p>دستیار هوشمند شما برای خانواده</p></div><span className="profileAvatar"><Icon name="ai"/></span></header>
    <section className={`aiStage premiumPanel${listening?" isListening":busy?" isThinking":speaking?" isSpeaking":""}`}>
      <div className="listeningBubble"><b>{status}</b>{listening?"صحبت کن":busy?"چند لحظه صبر کن":speaking?"پاسخ رو می‌خونم":"لمس کن و حرف بزن"}</div>
      <Mascot mood={mood}/>
      <span className={`voiceStatus ${mood}`}><i/>{status}</span>
      <h2>{listening?"گوش می‌دم...":busy?"دارم فکر می‌کنم...":speaking?"اینم پاسخ من":"با من حرف بزن"}</h2><p>من اینجام تا کمکت کنم 💜</p>
      <div className={`voiceWave ${waveClass}`}><i/><i/><i/><i/><i/><i/></div>
      <div className="voiceActions"><button className="speakerCircle" onClick={()=>messages.filter(m=>m.role==="assistant").slice(-1).forEach(m=>speak(m.content))} aria-label="پخش پاسخ"><span aria-hidden="true">◖))</span></button><button className={`voiceCircle${listening?" listening":""}`} onClick={toggleListening} aria-label="میکروفون"><span style={{color:"#5b2cf6",fontSize:28}} aria-hidden="true">⌁</span></button></div>
      {!speechSupported&&<p style={{marginTop:12,color:"#ff9dbf"}}>مرورگر فعلی STT داخلی ندارد؛ در نسخه سروری Voice Provider جایگزین می‌شود.</p>}
    </section>
    <section className="chatList">{messages.slice(-5).map((m,i)=><div className={`chatBubble ${m.role}`} key={i}>{m.content}{m.role==="assistant"&&<button onClick={()=>speak(m.content)} aria-label="خواندن پاسخ">◖))</button>}</div>)}</section>
    <div className="quickTitle"><h3>پیشنهادهای سریع ✨</h3><span style={{fontSize:11,color:"#8f85a9"}}>{busy?"در حال فکر...":"آنلاین"}</span></div>
    <div className="quickGrid">{quick.map(([icon,label,prompt])=><button className="quickCard" key={label} onClick={()=>submit(undefined,prompt)}><span><Icon name={icon}/></span><b>{label}</b></button>)}</div>
    <form className="composer" onSubmit={e=>submit(e)}><input value={input} onChange={e=>setInput(e.target.value)} placeholder="یا تایپ کن..."/><button className="sendBtn" disabled={busy} aria-label="ارسال">←</button></form>
  </main>
}
