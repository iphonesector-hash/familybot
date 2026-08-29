"use client";
import {useEffect} from "react";
import {usePathname} from "next/navigation";
import {Icon} from "./ui";
const ITEMS=[
 {label:"خانه",href:"/",icon:"home" as const,active:(p:string)=>p==="/"},
 {label:"سگول",href:"/section/sagool",icon:"family" as const,active:(p:string)=>p.startsWith("/section/sagool")},
 {label:"بازی‌ها",href:"/section/games",icon:"games" as const,active:(p:string)=>p.startsWith("/section/games")||p.startsWith("/section/multiplayer")||p.startsWith("/section/mafia")},
 {label:"AI",href:"/ai",icon:"ai" as const,active:(p:string)=>p.startsWith("/ai")},
 {label:"پروفایل",href:"/section/leaderboard",icon:"profile" as const,active:(p:string)=>p.startsWith("/section/leaderboard")||p.startsWith("/section/achievements")}
];
export default function BottomNav(){const pathname=usePathname()||"/";const hidden=pathname.startsWith("/admin")||pathname.startsWith("/onboarding");useEffect(()=>{document.documentElement.classList.toggle("jahaniHasBottomNav",!hidden);return()=>document.documentElement.classList.remove("jahaniHasBottomNav")},[hidden]);if(hidden)return null;return <nav className="jahaniBottomNav" aria-label="ناوبری اصلی">{ITEMS.map(i=>{const active=i.active(pathname);return <a key={i.href} href={i.href} className={active?"active":""} aria-current={active?"page":undefined}><span className="jahaniNavIcon"><Icon name={i.icon} size={23}/></span><small>{i.label}</small></a>})}</nav>}
