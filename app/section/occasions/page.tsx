"use client";
import {useEffect,useState} from "react";
import {Icon,IconOrb} from "../../ui";

export default function OccasionsPage(){
  const[brief,setBrief]=useState("در حال دریافت تقویم امروز...");
  useEffect(()=>{fetch("/api/briefing/today",{cache:"no-store"}).then(r=>r.json()).then(x=>{if(x.ok)setBrief(x.text)}).catch(()=>setBrief("تقویم امروز فعلاً در دسترس نیست."))},[]);
  return <main className="appShell">
    <div className="ambient ambientA"/><div className="starField"/>
    <header className="appHeader"><a href="/" className="roundButton">←</a><div className="wordmark"><b>مناسبت‌ها</b><span>تقویم، تولد و جشن خانواده</span></div><IconOrb name="calendar" tone="gold"/></header>
    <section className="premiumPanel homeFeature" style={{minHeight:168}}>
      <span className="eyebrow"><Icon name="calendar" size={14}/> جشن خانواده</span>
      <h1 style={{margin:"8px 0 0",fontSize:24}}>تقویم JAHANI</h1>
      <img className="cardArt" src="/assets/ui/occasions.png" alt="مناسبت‌های خانواده"/>
    </section>
    <section className="premiumPanel" style={{padding:20}}>
      <span className="eyebrow">گزارش روز</span>
      <p style={{whiteSpace:"pre-line",lineHeight:2.2,fontSize:14}}>{brief}</p>
    </section>
    <section className="premiumPanel" style={{padding:16,marginTop:14}}>
      <h2>یادآوری‌های خانواده</h2>
      <p style={{fontSize:12,color:"#aaa0c7"}}>تولدها و رویدادهای Family Core در خانه و برنامه‌ریز دیده می‌شوند.</p>
      <a className="primaryCta" href="/section/planner">باز کردن برنامه‌ریز ←</a>
    </section>
  </main>;
}
