"use client";

import { useEffect } from "react";
import { useBaleMiniApp } from "../lib/useBaleMiniApp";

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
    root.classList.toggle("bale-miniapp-unsupported",inBale&&!supported);
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

    const syncViewport=()=>{const height=window.visualViewport?.height||window.innerHeight;root.style.setProperty("--app-vh",`${Math.round(height)}px`)};
    syncViewport();
    const vv=window.visualViewport;
    vv?.addEventListener("resize",syncViewport);
    window.addEventListener("orientationchange",syncViewport);
    return()=>{vv?.removeEventListener("resize",syncViewport);window.removeEventListener("orientationchange",syncViewport)};
  },[inBale,supported,theme,user?.first_name,webApp]);

  return null;
}
