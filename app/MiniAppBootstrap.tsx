"use client";
import {useEffect,useRef,useState} from "react";
import {useBaleMiniApp} from "@/lib/useBaleMiniApp";
import {sessionGet,sessionRemove,sessionSet} from "@/lib/safeSessionStorage";

type FamilyChoice={id:string;name:string;chatId:number};
function callSafe(target:unknown,method:string,...args:unknown[]){try{const fn=target&&typeof target==="object"?(target as Record<string,unknown>)[method]:undefined;if(typeof fn==="function")return fn.apply(target,args)}catch{}}
const ready=()=>window.dispatchEvent(new Event("familybot:boot-ready"));

export default function MiniAppBootstrap(){
  const{initData,inBale,webApp,startParam,supported}=useBaleMiniApp();
  const[choices,setChoices]=useState<FamilyChoice[]>([]),[error,setError]=useState(""),[busy,setBusy]=useState(false);
  const running=useRef(false);
  async function bootstrap(familyId?:string){
    if(!initData||running.current)return;
    running.current=true;setBusy(true);setError("");
    window.dispatchEvent(new Event("familybot:boot-wait"));
    try{
      const r=await fetch("/api/bale/miniapp/session",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({initData,familyId}),cache:"no-store",signal:AbortSignal.timeout(30000)});
      const d=await r.json();
      if(!r.ok||!d.ok)throw new Error(d.error||"bootstrap_failed");
      if(d.status==="ready"&&d.session){
        if(!sessionSet("familybot.session",String(d.session)))throw new Error("session_storage_unavailable");
        sessionSet("familybot.canManage",d.canManage?"1":"0");
        if(d.family?.id)sessionSet("familybot.familyId",String(d.family.id));
        // Existing pages read their session on mount; reload only after creation succeeds.
        window.location.reload();return;
      }
      if(d.status==="choose_family"&&d.families?.length){setChoices(d.families);ready();return}
      if(d.status==="needs_family")throw new Error("needs_family");
      throw new Error("bootstrap_failed");
    }catch(e){
      const code=e instanceof Error?e.message:"";
      setError(code==="session_storage_unavailable"?"ذخیره‌سازی امن داخل WebView بله در دسترس نیست. بله را به‌روزرسانی و Mini App را دوباره باز کن.":code==="needs_family"?"هنوز خانواده‌ای برای این حساب ثبت نشده. بازو را به گروه خانواده اضافه کن و داخل همان گروه /start بزن؛ بعد دوباره Mini App را باز کن.":code==="invalid_init_data"?"هویت Mini App معتبر نیست یا منقضی شده. مینی‌اپ را ببند و از داخل بازوی بله دوباره باز کن.":"ایجاد نشست Mini App انجام نشد. دوباره تلاش کن یا مینی‌اپ را از داخل بله باز کن.");
      ready();
    }finally{running.current=false;setBusy(false)}
  }
  useEffect(()=>{
    if(!inBale){const timer=setTimeout(ready,3200);return()=>clearTimeout(timer)}
    let cancelled=false;
    const direct=startParam.startsWith("family_")?startParam.slice(7):"";
    void(async()=>{
      const token=sessionGet("familybot.session");
      if(token){
        try{
          const r=await fetch("/api/family/dashboard",{headers:{authorization:`Bearer ${token}`},cache:"no-store",signal:AbortSignal.timeout(12000)});
          if(cancelled)return;
          // Only a server auth rejection invalidates a session, never an ordinary network wait.
          if(r.status!==401){ready();return}
          sessionRemove("familybot.session");
        }catch{if(!cancelled)ready();return}
      }
      if(cancelled)return;
      if(!initData){setError(!supported?"این نسخه بله از Mini App پشتیبانی کامل نمی‌کند. بله را به‌روزرسانی کن.":"اطلاعات ورود بله دریافت نشد. مینی‌اپ را از داخل بازو دوباره باز کن.");ready();return}
      await bootstrap(direct||sessionGet("familybot.familyId")||undefined);
    })();
    return()=>{cancelled=true};
  },[inBale,initData,startParam,supported]);
  useEffect(()=>{if(webApp){callSafe(webApp,"ready");callSafe(webApp,"expand")}},[webApp]);
  // Waiting, avatar resolution and successful refresh must never render an auth dialog.
  if(!error&&!choices.length)return null;
  const botUsername=process.env.NEXT_PUBLIC_BALE_BOT_USERNAME||"My_familybot";
  return <div className="miniappBootstrapOverlay" role="dialog" aria-modal="true" aria-label={error?"خطای ورود":"انتخاب خانواده"} style={{position:"fixed",inset:0,zIndex:9999,display:"grid",placeItems:"center",background:"rgba(5,3,22,.97)",padding:18}}><div className="premiumPanel" style={{maxWidth:420,width:"100%",padding:18,textAlign:"center"}}>
    <h2>{error?"ورود به خانواده":"انتخاب خانواده"}</h2>
    {error?<><p>{error}</p>{initData&&<button className="adminSave" disabled={busy} onClick={()=>void bootstrap(sessionGet("familybot.familyId")||undefined)}>تلاش دوباره</button>}<button className="ghostCta" onClick={()=>callSafe(webApp,"openLink",`https://ble.ir/${botUsername}`,{try_instant_view:true})}>رفتن به بازو در بله</button></>:<div style={{display:"grid",gap:8}}>{choices.map(f=><button className="adminSave" disabled={busy} key={f.id} onClick={()=>void bootstrap(f.id)}>{f.name}</button>)}</div>}
    <button className="ghostCta" style={{marginTop:12}} onClick={()=>callSafe(webApp,"close")}>بستن</button>
  </div></div>;
}
