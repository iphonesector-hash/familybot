"use client";

import { useCallback, useEffect, useState } from "react";
import FamilyActions from "../../FamilyActions";
import { Icon, IconOrb, Mascot } from "../../ui";

type Memory={id:string;title?:string|null;caption?:string|null;media_url?:string|null;memory_date?:string|null;tags?:string[];visibility?:"family"|"private";created_at:string};
export default function MemoriesPage(){const [memories,setMemories]=useState<Memory[]>([]),[count,setCount]=useState(0),[live,setLive]=useState(false);
  const load=useCallback(()=>{const session=sessionStorage.getItem("familybot.session");if(!session)return;fetch("/api/family/dashboard",{headers:{authorization:`Bearer ${session}`},cache:"no-store"}).then(r=>r.json()).then(x=>{if(x.ok&&x.dashboard){setMemories(x.dashboard.memories||[]);setCount(x.dashboard.family?.memoriesCount||0);setLive(true)}}).catch(()=>undefined)},[]);useEffect(()=>load(),[load]);
  return <main className="appShell"><div className="ambient ambientB"/><div className="starField"/><header className="appHeader"><a className="roundButton" href="/">←</a><div className="wordmark"><b>خاطرات</b><span>{live?"آلبوم زنده خانواده":"آلبوم خصوصی خانواده"}</span></div><IconOrb name="memories" tone="cyan"/></header>
    <section className="premiumPanel" style={{padding:20,minHeight:225,display:"grid",gridTemplateColumns:"1.15fr .85fr",alignItems:"center"}}><div><span className="eyebrow"><Icon name="memories" size={14}/> Memory Timeline</span><h1 style={{fontSize:27,margin:"12px 0 6px"}}>لحظه‌ها رو نگه داریم ✨</h1><p style={{fontSize:12,lineHeight:1.9,color:"#b9b0cf"}}>خاطره خانوادگی برای اعضا دیده می‌شه؛ خاطره خصوصی فقط برای خود سازنده برمی‌گرده.</p></div><Mascot small/></section>
    <div className="sectionHeading" style={{marginTop:22}}><div><span className="eyebrow">آلبوم‌ها</span><h2>خاطرات خانواده</h2></div><span className="levelPill">{new Intl.NumberFormat("fa-IR").format(count)} خاطره</span></div>
    <section className="dashboardGrid">{memories.length?memories.map((m,i)=><article className="dashboardCard" key={m.id} style={{minHeight:170}}><IconOrb name="memories" tone={i%3===0?"cyan":i%3===1?"pink":"gold"}/><div style={{marginTop:12}}><div style={{display:"flex",gap:7,alignItems:"center",flexWrap:"wrap"}}><h2 style={{margin:0}}>{m.title||"خاطره بدون عنوان"}</h2><span className="levelPill">{m.visibility==="private"?"🔒 خصوصی":"👨‍👩‍👧‍👦 خانواده"}</span></div><p>{m.memory_date?new Date(m.memory_date).toLocaleDateString("fa-IR"):new Date(m.created_at).toLocaleDateString("fa-IR")}</p><b style={{fontSize:10,color:"#8fe8ef"}}>{m.tags?.join(" · ")||m.caption||"خاطره خانوادگی"}</b></div>{m.media_url?<a href={m.media_url} target="_blank" rel="noreferrer" className="cardArrow">↗</a>:null}</article>):<div className="adminNotice">هنوز خاطره‌ای ثبت نشده.</div>}</section>
    <FamilyActions mode="memory" onChanged={load}/>
  </main>}
