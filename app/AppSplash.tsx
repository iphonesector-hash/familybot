"use client";

import {useEffect,useState} from "react";
import {sessionGet} from "@/lib/safeSessionStorage";

type BaleContextEvent=CustomEvent<{inBale?:boolean}>;

export default function AppSplash(){
  const[visible,setVisible]=useState(true);
  const[leaving,setLeaving]=useState(false);
  const[minDone,setMinDone]=useState(false);
  const[ready,setReady]=useState(false);
  useEffect(()=>{
    const minimum=window.setTimeout(()=>setMinDone(true),650);
    const failSafe=window.setTimeout(()=>setReady(true),7000);
    if(sessionGet("familybot.session"))setReady(true);
    const onReady=()=>setReady(true);
    const onBale=(event:Event)=>{const detail=(event as BaleContextEvent).detail;if(detail?.inBale===false)setReady(true);if(detail?.inBale&&sessionGet("familybot.session"))setReady(true)};
    window.addEventListener("familybot:boot-ready",onReady);window.addEventListener("familybot:bootstrap-visible",onReady);window.addEventListener("familybot:bale-context",onBale);
    return()=>{clearTimeout(minimum);clearTimeout(failSafe);window.removeEventListener("familybot:boot-ready",onReady);window.removeEventListener("familybot:bootstrap-visible",onReady);window.removeEventListener("familybot:bale-context",onBale)};
  },[]);
  useEffect(()=>{if(!ready||!minDone||!visible)return;setLeaving(true);const t=window.setTimeout(()=>setVisible(false),340);return()=>clearTimeout(t)},[ready,minDone,visible]);
  return visible?<div className={`loadingJahani${leaving?" isLeaving":""}`} role="status" aria-live="polite" aria-label="در حال آماده‌سازی خانواده بزرگ جهانی"/>:null;
}
