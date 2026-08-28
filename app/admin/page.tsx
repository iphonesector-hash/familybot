"use client";

import { useEffect, useMemo, useState } from "react";
import { Icon, Mascot } from "../ui";

type Settings={anti_flood:boolean;anti_link:boolean;flood_limit:number;flood_window_seconds:number;flood_mute_minutes:number;warn_limit:number;welcome_enabled:boolean};
const fallback:Settings={anti_flood:true,anti_link:false,flood_limit:5,flood_window_seconds:5,flood_mute_minutes:10,warn_limit:3,welcome_enabled:true};

export default function AdminPage(){
  const [settings,setSettings]=useState<Settings>(fallback);const [loading,setLoading]=useState(true);const [saving,setSaving]=useState(false);const [message,setMessage]=useState("");
  const session=useMemo(()=>typeof window!=="undefined"?new URLSearchParams(window.location.search).get("session")||"":"",[]);
  useEffect(()=>{if(!session){setLoading(false);return}fetch(`/api/admin/settings?session=${encodeURIComponent(session)}`).then(r=>r.json()).then(d=>{if(d.ok)setSettings(d.settings);else setMessage("جلسه مدیریت معتبر نیست یا منقضی شده.")}).catch(()=>setMessage("دریافت تنظیمات ممکن نشد.")).finally(()=>setLoading(false))},[session]);
  function patch<K extends keyof Settings>(key:K,value:Settings[K]){setSettings(s=>({...s,[key]:value}))}
  async function save(){if(!session){setMessage("این صفحه باید از منوی مدیریت ربات باز شود.");return}setSaving(true);setMessage("");try{const r=await fetch("/api/admin/settings",{method:"PUT",headers:{"content-type":"application/json",authorization:`Bearer ${session}`},body:JSON.stringify(settings)});const d=await r.json();if(!d.ok)throw new Error();setSettings(d.settings);setMessage("تنظیمات با موفقیت ذخیره شد ✨")}catch{setMessage("ذخیره تنظیمات انجام نشد.")}finally{setSaving(false)}}
  const toggles:[keyof Settings,string,string,string][]=[
    ["anti_flood","ضد اسپم هوشمند","ارسال سریع و پشت‌سرهم را شناسایی و محدود می‌کند","shield"],
    ["anti_link","قفل لینک","لینک‌های بیرونی اعضای عادی حذف و اخطار ثبت می‌شود","reminder"],
    ["welcome_enabled","خوش‌آمدگویی","برای اعضای تازه‌وارد پیام خوش‌آمد اختصاصی می‌فرستد","family"],
  ];
  return <main className="appShell adminScreen"><div className="ambient ambientA"/><div className="ambient ambientB"/><div className="starField"/>
    <header className="appHeader"><a className="roundButton" href="/" aria-label="بازگشت">←</a><div className="wordmark"><b style={{fontSize:22}}>مرکز مدیریت</b><span>Family Bot Control Center</span></div><span className="profileAvatar"><Icon name="shield"/></span></header>
    <section className="adminHero premiumPanel"><div><span className="eyebrow"><Icon name="shield" size={15}/> مدیریت امن خانواده</span><h1>کنترل گروه</h1><p>امنیت، رفتار ربات و محدودیت‌ها رو از همین‌جا تنظیم کن.</p></div><Mascot small mood="thinking"/></section>
    {!session&&<div className="adminNotice">🔐 برای تغییر تنظیمات، این صفحه را از دستور مدیریت داخل خود گروه باز کن.</div>}
    {message&&<div className="adminNotice">{message}</div>}
    <section className="adminGrid">
      {toggles.map(([key,title,text,icon])=><article className="adminCard" key={String(key)}><div className="adminCardHead"><span className="iconOrb violet"><Icon name={icon as any}/></span><button className={`switch${settings[key]?" on":""}`} onClick={()=>patch(key,!settings[key] as any)} aria-label={title}><i/></button></div><h2>{title}</h2><p>{text}</p></article>)}
    </section>
    <section className="adminPanel premiumPanel"><h2>قوانین خودکار</h2>
      <label>سقف اخطار <b>{settings.warn_limit}</b><input type="range" min="1" max="10" value={settings.warn_limit} onChange={e=>patch("warn_limit",Number(e.target.value))}/></label>
      <label>حد پیام در بازه <b>{settings.flood_limit}</b><input type="range" min="3" max="20" value={settings.flood_limit} onChange={e=>patch("flood_limit",Number(e.target.value))}/></label>
      <label>بازه تشخیص Flood <b>{settings.flood_window_seconds} ثانیه</b><input type="range" min="2" max="30" value={settings.flood_window_seconds} onChange={e=>patch("flood_window_seconds",Number(e.target.value))}/></label>
      <label>مدت Mute خودکار <b>{settings.flood_mute_minutes} دقیقه</b><input type="range" min="1" max="60" value={settings.flood_mute_minutes} onChange={e=>patch("flood_mute_minutes",Number(e.target.value))}/></label>
    </section>
    <button className="adminSave" disabled={saving||loading} onClick={save}>{loading?"در حال دریافت...":saving?"در حال ذخیره...":"ذخیره تنظیمات"}</button>
  </main>
}
