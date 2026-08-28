"use client";

import { useEffect } from "react";

export default function SessionBridge(){
  useEffect(()=>{
    const url=new URL(window.location.href);
    const token=url.searchParams.get("session");
    if(token?.startsWith("m.")){
      sessionStorage.setItem("familybot.session",token);
      url.searchParams.delete("session");
      window.history.replaceState(null,"",url.pathname+url.search+url.hash);
    }
  },[]);
  return null;
}
