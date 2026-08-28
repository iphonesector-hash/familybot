"use client";

import { useEffect,useState } from "react";
import { useBaleMiniApp } from "@/lib/useBaleMiniApp";

type FamilyChoice={id:string;name:string;chatId:number};

export default function MiniAppBootstrap(){
  const {initData,inBale,webApp,startParam,supported}=useBaleMiniApp();
  const [choices,setChoices]=useState<FamilyChoice[]>([]);const[error,setError]=useState("");const[busy,setBusy]=useState(false);const[booting,setBooting]=useState(false);

  async function bootstrap(familyId?:string){
    if(!initData||busy)return;
    setBusy(true);setBooting(true);setError("");
    try{
      const r=await fetch("/api/bale/miniapp/session",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({initData,familyId}),cache:"no-store"});
      const d=await r.json();
      if(!d.ok)throw new Error(d.error||"bootstrap_failed");
      if(d.status==="ready"&&d.session){
        sessionStorage.setItem("familybot.session",d.session);
        sessionStorage.setItem("familybot.canManage",d.canManage?"1":"0");
        if(d.family?.id)sessionStorage.setItem("familybot.familyId",String(d.family.id));
        window.location.reload();return;
      }
      if(d.status==="choose_family"){setChoices(d.families||[]);return}
      if(d.status==="needs_family"){setError("هنوز خانواده‌ای برای این حساب ثبت نشده. بازو را به گروه خانواده اضافه کن و داخل همان گروه /start بزن؛ بعد دوباره Mini App را باز کن.");return}
    }catch{setError("ورود امن Mini App انجام نشد. بله را به آخرین نسخه به‌روزرسانی کن و دوباره وارد شو.")}
    finally{setBusy(false);setBooting(false)}
  }

  useEffect(()=>{
    if(!inBale||!initData||sessionStorage.getItem("familybot.session"))return;
    setBooting(true);
    if(!supported){setError("این نسخه بله از Mini App پشتیبانی کامل نمی‌کند. بله را به آخرین نسخه به‌روزرسانی کن.");setBooting(false);return}
    const direct=startParam.startsWith("family_")?startParam.slice(7):"";
    const remembered=sessionStorage.getItem("familybot.familyId")||"";
    void bootstrap(direct||remembered||undefined);
  },[inBale,initData,startParam,supported]);

  useEffect(()=>{if(!webApp)return;webApp.ready?.();webApp.expand?.()},[webApp]);
  if(!choices.length&&!error&&!booting&&!busy)return null;
  const botUsername=process.env.NEXT_PUBLIC_BALE_BOT_USERNAME||"My_familybot";
  return <div className="miniappBootstrapOverlay" role="dialog" aria-modal="true" style={{position:"fixed",inset:0,zIndex:9999,display:"grid",placeItems:"center",background:"radial-gradient(circle at 50% 20%,rgba(104,63,190,.32),rgba(5,3,22,.97) 55%)",padding:"max(18px, env(safe-area-inset-top)) 14px max(18px, env(safe-area-inset-bottom))",backdropFilter:"blur(18px)"}}><div className="premiumPanel" style={{maxWidth:420,width:"calc(100% - 28px)",padding:18,textAlign:"center"}}><h2 style={{marginTop:0}}>Family Bot</h2>{error?<><p>{error}</p><button className="adminSave" onClick={()=>webApp?.openLink?.(`https://ble.ir/${botUsername}`,{try_instant_view:true})}>رفتن به بازو در بله</button></>:choices.length?<><p>یکی از خانواده‌ها را انتخاب کن:</p><div style={{display:"grid",gap:8}}>{choices.map(f=><button className="adminSave" disabled={busy} key={f.id} onClick={()=>void bootstrap(f.id)}>{f.name}</button>)}</div></>:<><div style={{fontSize:34,marginBottom:8}}>✦</div><h3 style={{margin:"0 0 8px"}}>در حال ورود امن...</h3><p style={{opacity:.72}}>هویت Mini App از خود بله تأیید می‌شود.</p></>}<button className="ghostCta" style={{marginTop:12}} onClick={()=>webApp?.close?.()}>بستن</button></div></div>
}
