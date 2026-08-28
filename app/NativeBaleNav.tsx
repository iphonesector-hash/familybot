"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useBaleMiniApp } from "@/lib/useBaleMiniApp";

function callSafe(target:unknown,method:string,...args:unknown[]){
  try{
    const fn=target&&typeof target==="object"?(target as Record<string,unknown>)[method]:undefined;
    if(typeof fn==="function")return fn.apply(target,args);
  }catch{}
}

export default function NativeBaleNav(){
  const pathname=usePathname();
  const {webApp,inBale,supported,isIframe}=useBaleMiniApp();

  useEffect(()=>{
    if(!webApp||!inBale)return;
    let cancelled=false;
    const back=webApp.BackButton;
    const settings=webApp.SettingsButton;
    const onBack=()=>{
      if(pathname==="/"){callSafe(webApp,"close");return}
      if(window.history.length>1)window.history.back();
      else window.location.assign("/");
    };
    const onSettings=async()=>{
      const session=sessionStorage.getItem("familybot.session");
      if(!session)return;
      try{
        const r=await fetch("/api/family/admin-link",{method:"POST",headers:{authorization:`Bearer ${session}`},cache:"no-store"});
        const d=await r.json();
        if(r.ok&&d.ok&&d.token){
          sessionStorage.setItem("familybot.adminSession",String(d.token));
          window.location.assign("/admin");
        }
      }catch{}
    };

    if(isIframe||pathname==="/")callSafe(back,"hide");else{callSafe(back,"show");callSafe(back,"onClick",onBack)}
    callSafe(settings,"hide");
    const session=sessionStorage.getItem("familybot.session");
    if(session){
      fetch("/api/family/dashboard",{headers:{authorization:`Bearer ${session}`},cache:"no-store"})
        .then(r=>r.json())
        .then(d=>{
          if(cancelled)return;
          const canManage=Boolean(d?.ok&&d?.dashboard?.permissions?.canManage);
          sessionStorage.setItem("familybot.canManage",canManage?"1":"0");
          if(canManage){callSafe(settings,"show");callSafe(settings,"onClick",onSettings)}else callSafe(settings,"hide");
        })
        .catch(()=>callSafe(settings,"hide"));
    }
    callSafe(webApp,"setHeaderColor","#09051f");

    return()=>{
      cancelled=true;
      callSafe(back,"offClick",onBack);
      callSafe(settings,"offClick",onSettings);
    };
  },[webApp,inBale,isIframe,pathname]);

  if(inBale&&!supported)return <div className="miniappCompatibilityNotice">نسخه بله شما قدیمی است؛ برای استفاده کامل از Family Bot بله را به آخرین نسخه به‌روزرسانی کنید.</div>;
  return null;
}