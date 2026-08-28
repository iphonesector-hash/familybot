"use client";

import { useEffect, useMemo, useState } from "react";
import { Icon, Mascot } from "../ui";

type Settings={
  anti_flood:boolean;anti_link:boolean;lock_photo:boolean;lock_video:boolean;lock_document:boolean;lock_forward:boolean;
  lock_sticker:boolean;lock_gif:boolean;lock_voice:boolean;lock_audio:boolean;lock_text:boolean;
  flood_limit:number;flood_window_seconds:number;flood_mute_minutes:number;warn_limit:number;welcome_enabled:boolean;welcome_message:string;
};
type LogRow={id:string;actor_bale_user_id:number|null;target_bale_user_id:number|null;action:string;reason:string|null;created_at:string};
type Stats={members:number;activeWarnings:number;moderation24h:number;activity24h:number;deleted24h:number};
type WhiteRow={bale_user_id:number;label:string|null};
const fallback:Settings={anti_flood:true,anti_link:false,lock_photo:false,lock_video:false,lock_document:false,lock_forward:false,lock_sticker:false,lock_gif:false,lock_voice:false,lock_audio:false,lock_text:false,flood_limit:5,flood_window_seconds:5,flood_mute_minutes:10,warn_limit:3,welcome_enabled:true,welcome_message:"💜 {name} خوش اومدی!\nاینجا خونه دیجیتال خانواده‌ست؛ بازی، خاطره، برنامه و Family AI همه کنار هم هستن."};
const emptyStats:Stats={members:0,activeWarnings:0,moderation24h:0,activity24h:0,deleted24h:0};
const labels:Record<string,string>={warn:"اخطار",auto_mute:"سکوت خودکار",anti_flood_mute:"ضداسپم",ban:"مسدود",unban:"رفع مسدودی",mute:"سکوت",pin:"پین",content_lock:"قفل محتوا",unwarn:"پاک‌کردن اخطار",anti_link_delete:"حذف لینک"};

export default function AdminPage(){
  const [settings,setSettings]=useState<Settings>(fallback);const [logs,setLogs]=useState<LogRow[]>([]);const [stats,setStats]=useState<Stats>(emptyStats);const [whitelist,setWhitelist]=useState<WhiteRow[]>([]);
  const [newUserId,setNewUserId]=useState("");const [newLabel,setNewLabel]=useState("");const [loading,setLoading]=useState(true);const [saving,setSaving]=useState(false);const [message,setMessage]=useState("");
  const session=useMemo(()=>typeof window!=="undefined"?new URLSearchParams(window.location.search).get("session")||"":"",[]);

  useEffect(()=>{if(!session){setLoading(false);return}Promise.all([
    fetch(`/api/admin/settings?session=${encodeURIComponent(session)}`).then(r=>r.json()),
    fetch(`/api/admin/logs?session=${encodeURIComponent(session)}&limit=20`).then(r=>r.json()),
    fetch(`/api/admin/stats?session=${encodeURIComponent(session)}`).then(r=>r.json()),
    fetch(`/api/admin/whitelist?session=${encodeURIComponent(session)}`).then(r=>r.json())
  ]).then(([s,l,st,w])=>{if(s.ok)setSettings(s.settings);else setMessage("جلسه مدیریت معتبر نیست یا منقضی شده.");if(l.ok)setLogs(l.rows||[]);if(st.ok)setStats(st.stats||emptyStats);if(w.ok)setWhitelist(w.rows||[])}).catch(()=>setMessage("دریافت اطلاعات مدیریت ممکن نشد.")).finally(()=>setLoading(false))},[session]);

  function patch<K extends keyof Settings>(key:K,value:Settings[K]){setSettings(s=>({...s,[key]:value}))}
  async function save(){if(!session){setMessage("این صفحه باید از منوی مدیریت ربات باز شود.");return}setSaving(true);setMessage("");try{const r=await fetch("/api/admin/settings",{method:"PUT",headers:{"content-type":"application/json",authorization:`Bearer ${session}`},body:JSON.stringify(settings)});const d=await r.json();if(!d.ok)throw new Error();setSettings(d.settings);setMessage("تنظیمات با موفقیت ذخیره شد ✨")}catch{setMessage("ذخیره تنظیمات انجام نشد.")}finally{setSaving(false)}}
  async function saveWhitelist(rows:WhiteRow[]){if(!session)return;const r=await fetch("/api/admin/whitelist",{method:"PUT",headers:{"content-type":"application/json",authorization:`Bearer ${session}`},body:JSON.stringify({rows})});const d=await r.json();if(d.ok)setWhitelist(d.rows||rows);else setMessage("ذخیره لیست سفید انجام نشد.")}
  function addWhitelist(){const id=Number(newUserId);if(!Number.isFinite(id)||id<=0){setMessage("شناسه عددی کاربر بله را وارد کن.");return}const rows=[...whitelist.filter(x=>x.bale_user_id!==id),{bale_user_id:id,label:newLabel.trim()||null}];setNewUserId("");setNewLabel("");void saveWhitelist(rows)}
  function removeWhitelist(id:number){void saveWhitelist(whitelist.filter(x=>x.bale_user_id!==id))}

  const toggles:[keyof Settings,string,string,string][]=[
    ["anti_flood","ضد اسپم هوشمند","ارسال سریع و پشت‌سرهم را شناسایی و محدود می‌کند","shield"],
    ["anti_link","قفل لینک","لینک‌های بیرونی اعضای عادی حذف و اخطار ثبت می‌شود","reminder"],
    ["lock_photo","قفل عکس","ارسال تصویر برای اعضای عادی محدود می‌شود","memories"],
    ["lock_video","قفل ویدیو","ویدیوهای ارسالی اعضای عادی حذف می‌شوند","games"],
    ["lock_document","قفل فایل","ارسال فایل و سند محدود می‌شود","tasks"],
    ["lock_forward","قفل فوروارد","پیام‌های فورواردشده حذف می‌شوند","shield"],
    ["lock_sticker","قفل استیکر","ارسال استیکر برای اعضای عادی محدود می‌شود","spark"],
    ["lock_gif","قفل GIF","تصاویر متحرک و انیمیشن محدود می‌شوند","games"],
    ["lock_voice","قفل ویس","پیام صوتی اعضای عادی حذف می‌شود","ai"],
    ["lock_audio","قفل موزیک","ارسال فایل صوتی و آهنگ محدود می‌شود","gift"],
    ["lock_text","قفل متن","فقط مدیرها و لیست سفید می‌توانند متن بفرستند","tasks"],
    ["welcome_enabled","خوش‌آمدگویی","برای اعضای تازه‌وارد پیام خوش‌آمد اختصاصی می‌فرستد","family"],
  ];
  const statCards=[
    ["family","اعضا",stats.members],["reminder","اخطار فعال",stats.activeWarnings],["shield","عملیات ۲۴ساعت",stats.moderation24h],["spark","فعالیت ۲۴ساعت",stats.activity24h],["tasks","حذف‌شده",stats.deleted24h]
  ] as const;

  return <main className="appShell adminScreen"><div className="ambient ambientA"/><div className="ambient ambientB"/><div className="starField"/>
    <header className="appHeader"><a className="roundButton" href="/" aria-label="بازگشت">←</a><div className="wordmark"><b style={{fontSize:22}}>مرکز مدیریت</b><span>Family Bot Control Center</span></div><span className="profileAvatar"><Icon name="shield"/></span></header>
    <section className="adminHero premiumPanel"><div><span className="eyebrow"><Icon name="shield" size={15}/> مدیریت امن خانواده</span><h1>کنترل گروه</h1><p>امنیت، قفل‌ها، خوش‌آمدگویی و رفتار ربات رو از همین‌جا تنظیم کن.</p></div><Mascot small mood="thinking"/></section>
    {!session&&<div className="adminNotice">🔐 برای تغییر تنظیمات، این صفحه را از دستور /admin داخل خود گروه باز کن.</div>}
    {message&&<div className="adminNotice">{message}</div>}

    <section className="dashboardGrid" style={{marginBottom:16}}>{statCards.map(([icon,title,value])=><article className="dashboardCard" key={title}><span className="iconOrb violet"><Icon name={icon}/></span><div><h2>{title}</h2><p style={{fontSize:18,color:"#fff",fontWeight:800}}>{Number(value).toLocaleString("fa-IR")}</p></div></article>)}</section>

    <section className="adminGrid">{toggles.map(([key,title,text,icon])=><article className="adminCard" key={String(key)}><div className="adminCardHead"><span className="iconOrb violet"><Icon name={icon as any}/></span><button className={`switch${settings[key]?" on":""}`} onClick={()=>patch(key,!settings[key] as any)} aria-label={title}><i/></button></div><h2>{title}</h2><p>{text}</p></article>)}</section>

    <section className="adminPanel premiumPanel"><h2>قوانین خودکار</h2>
      <label>سقف اخطار <b>{settings.warn_limit}</b><input type="range" min="1" max="10" value={settings.warn_limit} onChange={e=>patch("warn_limit",Number(e.target.value))}/></label>
      <label>حد پیام در بازه <b>{settings.flood_limit}</b><input type="range" min="3" max="20" value={settings.flood_limit} onChange={e=>patch("flood_limit",Number(e.target.value))}/></label>
      <label>بازه تشخیص Flood <b>{settings.flood_window_seconds} ثانیه</b><input type="range" min="2" max="30" value={settings.flood_window_seconds} onChange={e=>patch("flood_window_seconds",Number(e.target.value))}/></label>
      <label>مدت Mute خودکار <b>{settings.flood_mute_minutes} دقیقه</b><input type="range" min="1" max="60" value={settings.flood_mute_minutes} onChange={e=>patch("flood_mute_minutes",Number(e.target.value))}/></label>
    </section>

    <section className="adminPanel premiumPanel" style={{marginTop:14}}><h2>پیام خوش‌آمد</h2><p style={{color:"#9e95b9",fontSize:11}}>از <b>{"{name}"}</b> برای نام عضو جدید استفاده کن.</p><textarea value={settings.welcome_message} onChange={e=>patch("welcome_message",e.target.value)} maxLength={1500} style={{width:"100%",minHeight:110,borderRadius:16,padding:14,background:"rgba(255,255,255,.05)",color:"white",border:"1px solid rgba(255,255,255,.08)",resize:"vertical"}}/></section>

    <section className="adminPanel premiumPanel" style={{marginTop:14}}><div className="quickTitle"><h3>لیست سفید</h3><span>{whitelist.length} عضو</span></div><p style={{color:"#9e95b9",fontSize:11}}>اعضای این لیست از قفل‌های محتوا و Anti-Flood مستثنا هستند.</p><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}><input value={newUserId} onChange={e=>setNewUserId(e.target.value)} inputMode="numeric" placeholder="شناسه کاربر بله"/><input value={newLabel} onChange={e=>setNewLabel(e.target.value)} placeholder="نام یا برچسب"/></div><button className="adminSave" style={{marginTop:10}} onClick={addWhitelist}>افزودن به لیست سفید</button><div style={{display:"grid",gap:8,marginTop:10}}>{whitelist.map(row=><div key={row.bale_user_id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 12px",borderRadius:14,background:"rgba(255,255,255,.045)"}}><div><b>{row.label||"عضو مجاز"}</b><small style={{display:"block",color:"#7f769b"}}>{row.bale_user_id}</small></div><button className="roundButton" onClick={()=>removeWhitelist(row.bale_user_id)} aria-label="حذف">×</button></div>)}</div></section>

    <button className="adminSave" disabled={saving||loading} onClick={save}>{loading?"در حال دریافت...":saving?"در حال ذخیره...":"ذخیره تنظیمات"}</button>

    <section className="adminPanel premiumPanel" style={{marginTop:14}}><div className="quickTitle"><h3>آخرین رویدادهای مدیریتی</h3><span>{logs.length} مورد</span></div>{logs.length?<div style={{display:"grid",gap:8}}>{logs.map(row=><div key={row.id} style={{padding:"12px 14px",borderRadius:16,background:"rgba(255,255,255,.045)",border:"1px solid rgba(255,255,255,.06)"}}><b>{labels[row.action]||row.action}</b><p style={{margin:"5px 0",fontSize:11,color:"#b9afcf"}}>{row.reason||"بدون توضیح"}</p><small style={{color:"#786f95"}}>{new Date(row.created_at).toLocaleString("fa-IR")}</small></div>)}</div>:<p style={{color:"#9e95b9"}}>هنوز رویداد مدیریتی ثبت نشده.</p>}</section>
  </main>
}
