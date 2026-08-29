"use client";
import {useEffect,useState} from "react";
import HexImage from "./HexImage";
export default function AppSplash(){
 const[show,setShow]=useState(true);
 useEffect(()=>{const started=performance.now();let exitTimer:ReturnType<typeof setTimeout>|null=null;const hide=()=>{const wait=Math.max(0,850-(performance.now()-started));exitTimer=setTimeout(()=>setShow(false),wait)};window.addEventListener("familybot:boot-ready",hide,{once:true});const fallback=setTimeout(hide,4600);return()=>{window.removeEventListener("familybot:boot-ready",hide);clearTimeout(fallback);if(exitTimer)clearTimeout(exitTimer)}},[]);
 return show?<div className="loadingJahani" role="status" aria-label="در حال آماده‌سازی خانواده بزرگ جهانی"><HexImage src="/assets-hex/jahani-loading.hex" alt="JAHANI Family Bot" className="loadingBackdrop"/><div className="loadingShade"/><div className="loadingGlass"><div className="loadingMonogram">J</div><div className="loadingBar"><i/></div><span>در حال آماده‌سازی خانواده شما در جهانی بی‌کران…</span></div></div>:null;
}
