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
    <>
      <div className="loadingJahani" role="status" aria-label="در حال آماده‌سازی خانواده بزرگ جهانی">
        <img src="/assets/brand/jahani-splash-clean.png" alt="" className="loadingBackdrop"/>
        <div className="loadingVignette" aria-hidden="true"/>
        <div className="loadingGlass">
          <div className="loadingBrandRow">
            <div className="loadingMonogram" aria-hidden="true">J</div>
            <div className="loadingBrandCopy">
              <b>JAHANI</b>
              <small>خانواده بزرگ جهانی</small>
            </div>
          </div>
          <div className="loadingBar" aria-hidden="true"><i/></div>
          <span>در حال آماده‌سازی فضای خانواده…</span>
        </div>
      </div>
      <style>{`
        .loadingJahani{
          position:fixed!important;
          inset:0!important;
          z-index:10000!important;
          min-height:100dvh!important;
          display:flex!important;
          align-items:flex-end!important;
          justify-content:center!important;
          padding:max(22px,calc(var(--safe-top) + 12px)) 18px max(34px,calc(var(--safe-bottom) + 24px))!important;
          overflow:hidden!important;
          isolation:isolate!important;
          background:#020817!important;
        }
        .loadingBackdrop{
          position:absolute!important;
          inset:0!important;
          width:100%!important;
          height:100%!important;
          object-fit:cover!important;
          object-position:center center!important;
          z-index:-3!important;
          transform:scale(1.01);
        }
        .loadingVignette{
          position:absolute;
          inset:0;
          z-index:-2;
          pointer-events:none;
          background:
            linear-gradient(180deg,rgba(2,8,23,.08) 0%,rgba(2,8,23,.03) 42%,rgba(2,8,23,.58) 76%,rgba(2,8,23,.88) 100%),
            radial-gradient(circle at 50% 72%,rgba(118,82,255,.16),transparent 36%);
        }
        .loadingGlass{
          width:min(360px,88vw)!important;
          display:grid!important;
          place-items:center!important;
          gap:13px!important;
          padding:18px 18px 16px!important;
          border-radius:26px!important;
          background:linear-gradient(160deg,rgba(17,24,58,.78),rgba(6,12,36,.82))!important;
          border:1px solid rgba(208,196,255,.2)!important;
          box-shadow:0 22px 70px rgba(0,0,0,.46),inset 0 1px 0 rgba(255,255,255,.09)!important;
          backdrop-filter:blur(20px)!important;
          -webkit-backdrop-filter:blur(20px)!important;
        }
        .loadingBrandRow{
          width:100%;
          display:flex;
          align-items:center;
          justify-content:center;
          gap:12px;
        }
        .loadingMonogram{
          width:56px!important;
          height:56px!important;
          flex:0 0 56px;
          border-radius:18px!important;
          display:grid!important;
          place-items:center!important;
          font:900 30px/1 Georgia,serif!important;
          color:#ffe08a!important;
          background:radial-gradient(circle at 32% 26%,rgba(255,237,172,.22),rgba(126,78,255,.22) 48%,rgba(9,14,44,.74) 100%)!important;
          border:1px solid rgba(255,215,120,.54)!important;
          box-shadow:0 0 0 4px rgba(126,91,255,.08),0 12px 32px rgba(73,45,190,.34),inset 0 1px 0 rgba(255,255,255,.18)!important;
        }
        .loadingBrandCopy{
          min-width:0;
          display:grid;
          gap:3px;
          text-align:right;
          direction:rtl;
        }
        .loadingBrandCopy b{
          direction:ltr;
          text-align:left;
          font:900 23px/1.05 Arial,sans-serif;
          letter-spacing:2.2px;
          color:#fff;
          text-shadow:0 0 18px rgba(138,110,255,.28);
        }
        .loadingBrandCopy small{
          font-size:10.5px;
          color:#cfc9e4;
          white-space:nowrap;
        }
        .loadingBar{
          position:relative!important;
          width:100%!important;
          height:5px!important;
          overflow:hidden!important;
          border-radius:999px!important;
          background:rgba(255,255,255,.1)!important;
          box-shadow:inset 0 1px 2px rgba(0,0,0,.3)!important;
        }
        .loadingBar i{
          position:absolute!important;
          top:0!important;
          bottom:0!important;
          left:0!important;
          width:38%!important;
          height:100%!important;
          border-radius:inherit!important;
          background:linear-gradient(90deg,#43e6ff 0%,#8068ff 58%,#ffd46a 100%)!important;
          box-shadow:0 0 16px rgba(70,220,255,.7)!important;
          animation:jahaniLoadingSweep 1.15s cubic-bezier(.45,0,.55,1) infinite!important;
          will-change:transform;
        }
        .loadingGlass>span{
          font-size:11px!important;
          line-height:1.7!important;
          color:#ded9eb!important;
          text-align:center!important;
        }
        @keyframes jahaniLoadingSweep{
          0%{transform:translateX(-125%)}
          100%{transform:translateX(365%)}
        }
        @media(max-width:390px){
          .loadingJahani{padding-inline:14px!important}
          .loadingGlass{width:min(340px,92vw)!important;padding:16px 16px 14px!important;border-radius:24px!important}
          .loadingMonogram{width:52px!important;height:52px!important;flex-basis:52px;font-size:28px!important}
          .loadingBrandCopy b{font-size:21px}
        }
        @media(orientation:landscape) and (max-height:500px){
          .loadingJahani{align-items:center!important;padding:max(10px,var(--safe-top)) 18px max(10px,var(--safe-bottom))!important}
          .loadingGlass{width:min(390px,72vw)!important;padding:12px 16px!important;gap:9px!important}
          .loadingMonogram{width:44px!important;height:44px!important;flex-basis:44px;font-size:24px!important}
        }
        @media(prefers-reduced-motion:reduce){
          .loadingBar i{
            left:18%!important;
            width:64%!important;
            animation:none!important;
            transform:none!important;
          }
        }
      `}</style>
    </>
  );
}
