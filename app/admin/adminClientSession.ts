"use client";

const KEY="familybot.adminSession";

export function captureAdminSession(){
  if(typeof window==="undefined")return "";
  const params=new URLSearchParams(window.location.search);
  const incoming=params.get("session")||"";
  if(incoming){
    sessionStorage.setItem(KEY,incoming);
    params.delete("session");
    const query=params.toString();
    const clean=`${window.location.pathname}${query?`?${query}`:""}${window.location.hash||""}`;
    window.history.replaceState({},"",clean);
    return incoming;
  }
  return sessionStorage.getItem(KEY)||"";
}

export function clearAdminSession(){if(typeof window!=="undefined")sessionStorage.removeItem(KEY)}
export function adminHeaders(session:string){return {authorization:`Bearer ${session}`}}
