"use client";
import {useEffect} from "react";
import {captureAdminSession,storeAdminSession} from "./adminClientSession";

export default function AdminSessionBootstrap(){
  useEffect(()=>{
    if(captureAdminSession())return;
    let tries=0,cancelled=false;
    const run=async()=>{
      if(cancelled)return;
      const member=sessionStorage.getItem("familybot.session")||"";
      if(!member){if(++tries<15)setTimeout(()=>void run(),300);return}
      try{
        const r=await fetch("/api/family/admin-link",{method:"POST",headers:{authorization:`Bearer ${member}`},cache:"no-store"});
        const d=await r.json();
        if(r.ok&&d.ok&&d.token){storeAdminSession(String(d.token));window.location.reload()}
      }catch{}
    };
    void run();
    return()=>{cancelled=true};
  },[]);
  return null;
}
