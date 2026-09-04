"use client";
import {useEffect,useState} from "react";
import {Icon,IconOrb} from "../../ui";
import Avatar from "../../ui/Avatar";
import {useBaleMiniApp} from "@/lib/useBaleMiniApp";
type Row={id:string;display_name?:string|null;first_name?:string|null;avatar_url?:string|null;xp:number;coins:number;level:number;is_founder?:boolean};
type Dashboard={leaderboard:Row[];profile?:Row&{rank?:number|null}|null};
const fa=(n:number)=>new Intl.NumberFormat("fa-IR").format(n||0);
export default function LeaderboardPage(){
  const {user}=useBaleMiniApp();
  const[d,setD]=useState<Dashboard>({leaderboard:[]});
  useEffect(()=>{const s=sessionStorage.getItem("familybot.session");if(!s)return;fetch("/api/family/dashboard",{headers:{authorization:`Bearer ${s}`},cache:"no-store"}).then(r=>r.json()).then(x=>{if(x.ok&&x.dashboard)setD(x.dashboard)}).catch(()=>{})},[]);
  const top=d.leaderboard.slice(0,5);
  const mine=d.profile?.avatar_url||user?.photo_url||"";
  return <main className="appShell"><div className="ambient ambientA"/><div className="starField"/><header className="appHeader"><a href="/" className="roundButton">←</a><div className="wordmark"><b>پروفایل و رتبه</b><span>۵ نفر اول خانواده</span></div><IconOrb name="trophy" tone="gold"/></header>
  <section className="premiumPanel" style={{padding:18,display:"grid",gridTemplateColumns:"auto 1fr",gap:14,alignItems:"center"}}>
    <Avatar src={mine} alt={d.profile?.display_name||""} size={74} fallback="★"/>
    <div><span className="eyebrow">رتبه من</span><h1 style={{fontSize:28,margin:"6px 0"}}>{d.profile?.is_founder?"FOUNDER · ∞":d.profile?.rank?`#${fa(Number(d.profile.rank))}`:"—"}</h1><p style={{fontSize:12,color:"#aaa0c7",margin:0}}>{d.profile?.display_name||d.profile?.first_name||"عضو خانواده"}</p></div>
  </section>
  <section style={{display:"grid",gap:10,margin:"14px 0 95px"}}>{top.map((r,i)=><article className="premiumPanel" key={r.id} style={{padding:12,display:"grid",gridTemplateColumns:"52px 1fr auto",alignItems:"center",gap:12}}><Avatar src={r.avatar_url} alt={r.display_name||""} size={50}/><div><h2 style={{fontSize:15,margin:0}}>{r.display_name||r.first_name||"عضو خانواده"}</h2><p style={{fontSize:11,color:"#aaa0c7",margin:"4px 0"}}>Lv.{fa(r.level)} · {r.is_founder?"∞ XP":`${fa(r.xp)} XP`}</p></div><b style={{fontSize:22,color:i===0?"#ffc247":"#8f85aa"}}>{i+1}</b></article>)}{!top.length&&<div className="adminNotice">هنوز امتیازی ثبت نشده.</div>}</section></main>;
}
