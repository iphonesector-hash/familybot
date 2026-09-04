"use client";
import {FormEvent,useEffect,useRef,useState} from "react";
import {Icon,Mascot,type MascotMood} from "../ui";

type Msg={role:"user"|"assistant";content:string};
const INTRO="درود بر شما، من هوش مصنوعی سکتور هستم؛ چطور می‌تونم کمکتون کنم؟";
const quick=[["calendar","ثبت برنامه","دورهمی جمعه ساعت ۲۰ ثبت کن"],["birthday","تولدهای نزدیک","تولدهای نزدیک رو بهم بگو"],["poll","نظرسنجی","نظرسنجی شام کجا باشه گزینه‌ها: خونه، رستوران بساز"],["spark","جستجوی اینترنت","در اینترنت آخرین خبر مهم فناوری امروز رو جستجو کن"]] as const;

export default function AiPage(){
  const[msgs,setMsgs]=useState<Msg[]>([{role:"assistant",content:INTRO}]);
  const[input,setInput]=useState("");
  const[busy,setBusy]=useState(false);
  const[listening,setListening]=useState(false);
  const[speaking,setSpeaking]=useState(false);
  const[toast,setToast]=useState("");
  const[ready,setReady]=useState(false);
  const recorder=useRef<MediaRecorder|null>(null),chunks=useRef<Blob[]>([]),audio=useRef<HTMLAudioElement|null>(null),chatEnd=useRef<HTMLDivElement|null>(null);
  function token(){return sessionStorage.getItem("familybot.session")||""}
  function notify(t:string){setToast(t);setTimeout(()=>setToast(""),2300)}
  async function speak(text:string){const s=token();if(!s)return;audio.current?.pause();try{const r=await fetch("/api/voice/tts",{method:"POST",headers:{"content-type":"application/json",authorization:`Bearer ${s}`},body:JSON.stringify({text})});if(!r.ok)throw 0;const u=URL.createObjectURL(await r.blob()),a=new Audio(u);audio.current=a;a.onplay=()=>setSpeaking(true);a.onended=()=>{setSpeaking(false);URL.revokeObjectURL(u)};await a.play()}catch{if("speechSynthesis" in window){const u=new SpeechSynthesisUtterance(text);u.lang="fa-IR";u.onstart=()=>setSpeaking(true);u.onend=()=>setSpeaking(false);window.speechSynthesis.cancel();window.speechSynthesis.speak(u)}}}
  async function send(e?:FormEvent,valueOverride?:string){
    e?.preventDefault();
    const value=(valueOverride??input).trim(),s=token();
    if(!value||busy)return;
    if(!s)return notify("برای استفاده از سکتور AI، مینی‌اپ را از داخل بله باز کنید.");
    const history=msgs.slice(-10);
    setMsgs(v=>[...v,{role:"user",content:value}]);
    setInput("");
    setBusy(true);
    try{
      const r=await fetch("/api/ai/chat",{method:"POST",headers:{"content-type":"application/json",authorization:`Bearer ${s}`},body:JSON.stringify({message:value,history})});
      const x=await r.json().catch(()=>({}));
      const reply=r.status===401?"نشست بله منقضی شده؛ مینی‌اپ را ببند و دوباره از داخل بله باز کن.":String(x.reply||x.error||`خطای ${r.status}`);
      setMsgs(v=>[...v,{role:"assistant",content:reply}]);
      if(r.ok&&x.reply)void speak(reply);
      else notify(reply);
    }catch(err){
      const msg=err instanceof Error?err.message:"ارتباط با سکتور AI برقرار نشد";
      setMsgs(v=>[...v,{role:"assistant",content:msg}]);
      notify(msg);
    }finally{setBusy(false)}
  }
  async function transcribe(blob:Blob){const s=token();if(!s)return;setBusy(true);try{const f=new FormData();const ext=blob.type.includes("mp4")?"m4a":"webm";f.set("audio",new File([blob],`voice.${ext}`,{type:blob.type||"audio/webm"}));const r=await fetch("/api/voice/stt",{method:"POST",headers:{authorization:`Bearer ${s}`},body:f}),x=await r.json();if(!r.ok||!x.text)throw 0;const text=String(x.text).trim();setInput(text);setBusy(false);setTimeout(()=>void send(undefined,text),0)}catch{setBusy(false);notify("صدات واضح دریافت نشد")}}
  async function toggle(){if(listening){recorder.current?.stop();setListening(false);return}if(!navigator.mediaDevices?.getUserMedia||typeof MediaRecorder==="undefined")return notify("ضبط صدا روی این نسخه آماده نیست");try{const stream=await navigator.mediaDevices.getUserMedia({audio:true});const preferred=["audio/mp4","audio/webm;codecs=opus","audio/webm"].find(t=>MediaRecorder.isTypeSupported(t));const r=new MediaRecorder(stream,preferred?{mimeType:preferred}:undefined);chunks.current=[];r.ondataavailable=e=>{if(e.data.size)chunks.current.push(e.data)};r.onstop=()=>{stream.getTracks().forEach(t=>t.stop());void transcribe(new Blob(chunks.current,{type:r.mimeType||preferred||"audio/webm"}))};recorder.current=r;r.start();setListening(true)}catch{notify("اجازه میکروفون صادر نشد")}}
  useEffect(()=>{const s=token();setReady(Boolean(s));if(!s)return;fetch("/api/ai/history",{headers:{authorization:`Bearer ${s}`},cache:"no-store"}).then(r=>r.json()).then(x=>{if(x.ok&&Array.isArray(x.messages)&&x.messages.length){const history=x.messages.filter((m:Msg)=>m?.role==="user"||m?.role==="assistant").slice(-20).map((m:Msg)=>({role:m.role,content:String(m.content||"")}));setMsgs([{role:"assistant",content:INTRO},...history])}}).catch(()=>undefined)},[]);
  useEffect(()=>{chatEnd.current?.scrollIntoView({behavior:"smooth",block:"end"})},[msgs,busy]);
  useEffect(()=>{document.documentElement.classList.add("aiRoute");return()=>document.documentElement.classList.remove("aiRoute")},[]);
  const mood:MascotMood=listening?"listening":busy?"thinking":speaking?"speaking":"idle";
  return (
    <main className="appShell aiScreen">
      <div className="ambient ambientA"/>
      <div className="starField"/>
      <div className={`motionToast${toast?" show":""}`}>{toast}</div>
      <header className="aiTop">
        <a className="roundButton" href="/">←</a>
        <div className="aiTitle"><h1>سکتور AI</h1><p>حافظه · اینترنت · صدای فارسی</p></div>
        <span className="profileAvatar"><Icon name="ai"/></span>
      </header>
      <div className="aiScroll">
        {!ready&&<div className="adminNotice aiSessionNotice">برای استفاده از سکتور AI، مینی‌اپ را از داخل بله باز کنید.</div>}
        <section className={`aiStage premiumPanel${listening?" isListening":""}`}>
          <Mascot mood={mood}/>
          <h2>{INTRO}</h2>
          <p>چت، حافظه خانوادگی و جستجوی اینترنت.</p>
          <div className={`voiceWave ${listening?"active":busy?"thinking":speaking?"speaking":""}`}><i/><i/><i/><i/><i/><i/></div>
          <button className={`voiceCircle${listening?" listening":""}`} onClick={()=>void toggle()} disabled={!ready||busy} style={{minWidth:56,minHeight:56}}><Icon name="ai" size={28}/></button>
        </section>
        <section className="chatList" aria-live="polite">
          {msgs.slice(-24).map((m,i)=>(
            <div className={`chatBubble ${m.role}`} key={`${m.role}-${i}`}>
              <span>{m.content}</span>
              {m.role==="assistant"&&<button onClick={()=>void speak(m.content)} aria-label="خواندن پاسخ">◖))</button>}
            </div>
          ))}
          {busy&&<div className="chatBubble assistant"><span>سکتور در حال فکر کردن…</span></div>}
          <div ref={chatEnd}/>
        </section>
        <div className="quickTitle"><h3>فرمان‌های سریع</h3></div>
        <div className="quickGrid">
          {quick.map(([icon,label,prompt])=>(
            <button className="quickCard" key={label} disabled={busy||!ready} onClick={()=>void send(undefined,prompt)}>
              <span><Icon name={icon}/></span><b>{label}</b>
            </button>
          ))}
        </div>
      </div>
      {ready?(
        <form className="composer" onSubmit={e=>void send(e)}>
          <textarea
            rows={2}
            value={input}
            onChange={e=>setInput(e.target.value)}
            placeholder="پیامت رو برای سکتور بنویس..."
            enterKeyHint="send"
            autoComplete="off"
            autoCorrect="on"
          />
          <button className="sendBtn" type="submit" disabled={busy||!input.trim()} aria-label="ارسال">←</button>
        </form>
      ):(
        <div className="aiLockedBar" role="status">برای استفاده از سکتور AI، مینی‌اپ را از داخل بله باز کنید.</div>
      )}
    </main>
  );
}
