"use client";

import { useEffect } from "react";
import { useBaleMiniApp } from "../lib/useBaleMiniApp";
import { visualCssVars } from "@/lib/visualViewport";

function callSafe(target:unknown,method:string,...args:unknown[]){
  try{
    const fn=target&&typeof target==="object"?(target as Record<string,unknown>)[method]:undefined;
    if(typeof fn==="function")return fn.apply(target,args);
  }catch{}
}

export default function BaleBridge(){
  const { webApp, user, inBale, supported, theme } = useBaleMiniApp();

  useEffect(()=>{
    const root=document.documentElement;
    root.classList.toggle("inside-bale",inBale);
    root.classList.toggle("outside-bale",!inBale);
    const blocked=inBale&&!supported&&!webApp?.initData&&!sessionStorage.getItem("familybot.session");
    root.classList.toggle("bale-miniapp-unsupported",blocked);
    root.classList.toggle("bale-miniapp-blocked",blocked);
    if(user?.first_name) root.dataset.baleFirstName=user.first_name; else delete root.dataset.baleFirstName;

    const vars:Record<string,string|undefined>={
      "--bale-bg":theme.bg_color,"--bale-text":theme.text_color,"--bale-hint":theme.hint_color,
      "--bale-link":theme.link_color,"--bale-button":theme.button_color,"--bale-button-text":theme.button_text_color,
      "--bale-secondary":theme.secondary_bg_color,"--bale-header":theme.header_bg_color,"--bale-bottom":theme.bottom_bar_bg_color,
    };
    Object.entries(vars).forEach(([key,value])=>value?root.style.setProperty(key,value):root.style.removeProperty(key));

    callSafe(webApp,"ready");
    callSafe(webApp,"expand");
    if(theme.header_bg_color)callSafe(webApp,"setHeaderColor",theme.header_bg_color);

    const syncViewport=()=>{
      const vv=window.visualViewport;
      const visualHeight=vv?.height||window.innerHeight;
      const offsetTop=vv?.offsetTop||0;
      const next=visualCssVars({innerHeight:window.innerHeight,visualHeight,offsetTop});
      root.style.setProperty("--visual-vh",next["--visual-vh"]);
      root.style.setProperty("--keyboard-inset",next["--keyboard-inset"]);
      root.style.setProperty("--vv-offset-top",next["--vv-offset-top"]);
      root.style.setProperty("--app-vh",next.open?next["--visual-vh"]:`${Math.round(window.innerHeight)}px`);
      root.classList.toggle("keyboardOpen",next.open);
    };
    syncViewport();
    const vv=window.visualViewport;
    vv?.addEventListener("resize",syncViewport);
    vv?.addEventListener("scroll",syncViewport);
    window.addEventListener("orientationchange",syncViewport);
    return()=>{
      vv?.removeEventListener("resize",syncViewport);
      vv?.removeEventListener("scroll",syncViewport);
      window.removeEventListener("orientationchange",syncViewport);
    };
  },[inBale,supported,theme,user?.first_name,webApp]);

  return null;
}
