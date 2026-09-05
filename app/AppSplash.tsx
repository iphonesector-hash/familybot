"use client";
import {useEffect,useState} from "react";

const SPLASH_DONE="familybot.splashDone";

export default function AppSplash(){
  const[show,setShow]=useState(true);
  useEffect(()=>{
    try{if(sessionStorage.getItem(SPLASH_DONE)==="1"){setShow(false);return}}catch{}
    const started=performance.now();
    let exitTimer:ReturnType<typeof setTimeout>|null=null;
    const hide=()=>{
      if(exitTimer)clearTimeout(exitTimer);
      const wait=Math.max(0,420-(performance.now()-started));
      exitTimer=setTimeout(()=>{
        setShow(false);
        try{sessionStorage.setItem(SPLASH_DONE,"1")}catch{}
      },wait);
    };
    const wait=()=>{if(exitTimer)clearTimeout(exitTimer);setShow(true)};
    window.addEventListener("familybot:boot-ready",hide);
    window.addEventListener("familybot:boot-wait",wait);
    return()=>{
      window.removeEventListener("familybot:boot-ready",hide);
      window.removeEventListener("familybot:boot-wait",wait);
      if(exitTimer)clearTimeout(exitTimer);
    };
  },[]);
  if(!show)return null;
  return <div className="loadingJahani" role="status" aria-label="در حال آماده‌سازی خانواده بزرگ جهانی">
    <img src="/assets/brand/jahani-splash.png" alt="" className="loadingBackdrop" fetchPriority="high" decoding="async"/>
    <div className="loadingVignette" aria-hidden="true"/>
    <div className="loadingGlass">
      <div className="loadingBrandRow">
        <div className="loadingMonogram" aria-hidden="true">J</div>
        <div className="loadingBrandCopy"><b>JAHANI</b><small>خانواده بزرگ جهانی</small></div>
      </div>
      <div className="loadingBar" aria-hidden="true"><i/></div>
      <span>در حال آماده‌سازی فضای خانواده…</span>
    </div>
    <style>{`
      .loadingJahani{position:fixed!important;z-index:10000!important;top:0!important;left:0!important;right:0!important;bottom:auto!important;width:100%!important;height:var(--app-vh,100dvh)!important;min-height:0!important;box-sizing:border-box!important;display:flex!important;align-items:flex-end!important;justify-content:center!important;padding:max(18px,calc(var(--safe-top) + 8px)) 16px max(20px,calc(var(--safe-bottom) + 14px))!important;overflow:hidden!important;isolation:isolate!important;background:#020817!important}
      .loadingBackdrop{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;object-fit:cover!important;object-position:center top!important;z-index:-3!important;transform:none!important}
      .loadingVignette{position:absolute;inset:0;z-index:-2;pointer-events:none;background:linear-gradient(180deg,rgba(2,8,23,.03) 0%,rgba(2,8,23,.08) 52%,rgba(2,8,23,.72) 82%,rgba(2,8,23,.92) 100%)}
      .loadingGlass{width:min(350px,90vw)!important;box-sizing:border-box!important;display:grid!important;place-items:center!important;gap:11px!important;padding:15px 16px 14px!important;border-radius:24px!important;background:rgba(8,14,40,.86)!important;border:1px solid rgba(208,196,255,.2)!important;box-shadow:0 18px 52px rgba(0,0,0,.42),inset 0 1px 0 rgba(255,255,255,.08)!important}
      .loadingBrandRow{width:100%;display:flex;align-items:center;justify-content:center;gap:11px}.loadingMonogram{width:50px!important;height:50px!important;flex:0 0 50px;border-radius:16px!important;display:grid!important;place-items:center!important;font:900 28px/1 Georgia,serif!important;color:#ffe08a!important;background:radial-gradient(circle at 32% 26%,rgba(255,237,172,.22),rgba(126,78,255,.22) 48%,rgba(9,14,44,.74) 100%)!important;border:1px solid rgba(255,215,120,.54)!important;box-shadow:0 0 0 3px rgba(126,91,255,.08),0 10px 28px rgba(73,45,190,.3)!important}.loadingBrandCopy{min-width:0;display:grid;gap:3px;text-align:right;direction:rtl}.loadingBrandCopy b{direction:ltr;text-align:left;font:900 21px/1.05 Arial,sans-serif;letter-spacing:2px;color:#fff}.loadingBrandCopy small{font-size:10px;color:#cfc9e4;white-space:nowrap}.loadingBar{position:relative!important;width:100%!important;height:5px!important;overflow:hidden!important;border-radius:999px!important;background:rgba(255,255,255,.1)!important}.loadingBar i{position:absolute!important;inset-block:0!important;left:0!important;width:38%!important;border-radius:inherit!important;background:linear-gradient(90deg,#43e6ff 0%,#8068ff 58%,#ffd46a 100%)!important;animation:jahaniLoadingSweep 1s cubic-bezier(.45,0,.55,1) infinite!important}.loadingGlass>span{font-size:10.5px!important;line-height:1.65!important;color:#ded9eb!important;text-align:center!important}@keyframes jahaniLoadingSweep{0%{transform:translateX(-125%)}100%{transform:translateX(365%)}}@media(orientation:landscape) and (max-height:500px){.loadingJahani{align-items:center!important;padding:max(8px,var(--safe-top)) 14px max(8px,var(--safe-bottom))!important}.loadingGlass{width:min(370px,76vw)!important;padding:10px 14px!important;gap:8px!important}.loadingMonogram{width:42px!important;height:42px!important;flex-basis:42px;font-size:23px!important}}@media(prefers-reduced-motion:reduce){.loadingBar i{left:18%!important;width:64%!important;animation:none!important;transform:none!important}}
    `}</style>
  </div>;
}
