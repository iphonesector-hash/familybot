"use client";
import {useEffect,useState} from "react";

const SPLASH_DONE="familybot.splashDone";

export default function AppSplash(){
  const[show,setShow]=useState(true);
  useEffect(()=>{
    try{
      if(sessionStorage.getItem(SPLASH_DONE)==="1"){
        setShow(false);
      }
    }catch{}
    const started=performance.now();
    let exitTimer:ReturnType<typeof setTimeout>|null=null;
    const hide=()=>{
      if(exitTimer)clearTimeout(exitTimer);
      const wait=Math.max(0,850-(performance.now()-started));
      exitTimer=setTimeout(()=>{
        setShow(false);
        try{sessionStorage.setItem(SPLASH_DONE,"1")}catch{}
      },wait);
    };
    window.addEventListener("familybot:boot-ready",hide);
    const wait=()=>{if(exitTimer)clearTimeout(exitTimer);setShow(true)};
    window.addEventListener("familybot:boot-wait",wait);
    return()=>{
      window.removeEventListener("familybot:boot-ready",hide);
      window.removeEventListener("familybot:boot-wait",wait);
      if(exitTimer)clearTimeout(exitTimer);
    };
  },[]);
  if(!show)return null;
  return (
    <div className="loadingJahani" role="status" aria-label="در حال آماده‌سازی خانواده بزرگ جهانی">
      <img src="/assets/brand/jahani-splash-clean.png" alt="" className="loadingBackdrop"/>
      <div className="loadingGlass">
        <div className="loadingMonogram" aria-hidden="true">J</div>
        <div className="loadingBar"><i/></div>
        <span>در حال آماده‌سازی خانواده شما در جهانی بی‌کران…</span>
      </div>
    </div>
  );
}
