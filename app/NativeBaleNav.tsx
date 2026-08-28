"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useBaleMiniApp } from "@/lib/useBaleMiniApp";

export default function NativeBaleNav(){
  const pathname=usePathname();
  const {webApp,inBale,supported,isIframe}=useBaleMiniApp();

  useEffect(()=>{
    if(!webApp||!inBale)return;
    let cancelled=false;
    const back=webApp.BackButton;
    const settings=webApp.SettingsButton;
    const onBack=()=>{
      if(pathname==="/")webApp.close?.();
      else window.location.assign("/");
    };
    const onSettings=async()=>{
      const session=sessionStorage.getItem("familybot.session");
      if(!session)return;
      try{
        const r=await fetch("/api/family/admin-link",{method:"POST",headers:{authorization:`Bearer ${session}`}});
        const d=await r.json();
        if(d.ok&&d.url)window.location.assign(d.url);
      }catch{}
    };

    if(isIframe||pathname==="/")back?.hide?.();else{back?.show?.();back?.onClick?.(onBack)}
    settings?.hide?.();
    const session=sessionStorage.getItem("familybot.session");
    if(session){
      fetch("/api/family/dashboard",{headers:{authorization:`Bearer ${session}`},cache:"no-store"})
        .then(r=>r.json())
        .then(d=>{
          if(cancelled)return;
          const canManage=Boolean(d?.ok&&d?.dashboard?.permissions?.canManage);
          sessionStorage.setItem("familybot.canManage",canManage?"1":"0");
          if(canManage){settings?.show?.();settings?.onClick?.(onSettings)}else settings?.hide?.();
        })
        .catch(()=>settings?.hide?.());
    }
    try{webApp.setHeaderColor?.("#09051f")}catch{}

    return()=>{
      cancelled=true;
      back?.offClick?.(onBack);
      settings?.offClick?.(onSettings);
    };
  },[webApp,inBale,isIframe,pathname]);

  if(inBale&&!supported)return <div className="miniappCompatibilityNotice">نسخه بله شما قدیمی است؛ برای استفاده کامل از Family Bot بله را به آخرین نسخه به‌روزرسانی کنید.</div>;
  return null;
}
