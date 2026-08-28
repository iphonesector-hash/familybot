"use client";

import { useEffect } from "react";
import { useBaleMiniApp } from "../lib/useBaleMiniApp";

export default function BaleBridge(){
  const { webApp, user, inBale, theme } = useBaleMiniApp();

  useEffect(()=>{
    const root=document.documentElement;
    root.classList.toggle("inside-bale",inBale);
    root.classList.toggle("outside-bale",!inBale);
    if(user?.first_name) root.dataset.baleFirstName=user.first_name;
    else delete root.dataset.baleFirstName;

    const session=new URLSearchParams(window.location.search).get("session");
    if(session?.startsWith("m.")) sessionStorage.setItem("familybot.session",session);

    const vars:Record<string,string|undefined>={
      "--bale-bg":theme.bg_color,
      "--bale-text":theme.text_color,
      "--bale-hint":theme.hint_color,
      "--bale-link":theme.link_color,
      "--bale-button":theme.button_color,
      "--bale-button-text":theme.button_text_color,
      "--bale-secondary":theme.secondary_bg_color,
    };
    Object.entries(vars).forEach(([key,value])=>value?root.style.setProperty(key,value):root.style.removeProperty(key));

    const syncViewport=()=>{
      const height=webApp?.viewportStableHeight||webApp?.viewportHeight||window.visualViewport?.height||window.innerHeight;
      root.style.setProperty("--app-vh",`${Math.round(height)}px`);
    };
    syncViewport();
    const vv=window.visualViewport;
    vv?.addEventListener("resize",syncViewport);
    window.addEventListener("orientationchange",syncViewport);
    webApp?.onEvent?.("viewportChanged",syncViewport);
    return()=>{
      vv?.removeEventListener("resize",syncViewport);
      window.removeEventListener("orientationchange",syncViewport);
      webApp?.offEvent?.("viewportChanged",syncViewport);
    };
  },[inBale,theme,user?.first_name,webApp]);

  return null;
}
