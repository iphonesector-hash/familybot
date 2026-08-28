"use client";

import { useEffect,useState } from "react";
import { useBaleMiniApp } from "@/lib/useBaleMiniApp";

type FamilyChoice={id:string;name:string;chatId:number};

export default function MiniAppBootstrap(){
  const {initData,inBale,webApp}=useBaleMiniApp();
  const [choices,setChoices]=useState<FamilyChoice[]>([]);const[error,setError]=useState("");
  async function bootstrap(familyId?:string){
    if(!initData)return;
    try{
      const r=await fetch("/api/bale/miniapp/session",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({initData,familyId})});
      const d=await r.json();
      if(!d.ok)throw new Error(d.error||"bootstrap_failed");
      if(d.status==="ready"&&d.session){sessionStorage.setItem("familybot.session",d.session);sessionStorage.setItem("familybot.canManage",d.canManage?"1":"0");window.location.reload();return}
      if(d.status==="choose_family"){setChoices(d.families||[]);return}
      if(d.status==="needs_family"){setError("برای استفاده از Family Bot اول ربات را به گروه خانواده اضافه کن و داخل همان گروه /start بزن.");return}
    }catch{setError("ورود امن Mini App انجام نشد. بله را به آخرین نسخه به‌روزرسانی کن و دوباره وارد شو.")}
  }
  useEffect(()=>{if(!inBale||!initData||sessionStorage.getItem("familybot.session"))return;void bootstrap()},[inBale,initData]);
  useEffect(()=>{if(!webApp)return;webApp.ready?.();webApp.expand?.()},[webApp]);
  if(!choices.length&&!error)return null;
  return <div className="miniappBootstrapOverlay" role="dialog" aria-modal="true"><div className="premiumPanel" style={{maxWidth:420,width:"calc(100% - 28px)",padding:18}}><h2 style={{marginTop:0}}>Family Bot</h2>{error?<p>{error}</p>:<><p>یکی از خانواده‌ها را انتخاب کن:</p><div style={{display:"grid",gap:8}}>{choices.map(f=><button className="adminSave" key={f.id} onClick={()=>void bootstrap(f.id)}>{f.name}</button>)}</div></>}<button className="ghostCta" style={{marginTop:12}} onClick={()=>webApp?.close?.()}>بستن</button></div></div>
}
