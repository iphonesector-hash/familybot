"use client";
import {FormEvent,useCallback,useEffect,useState} from "react";
import {Icon,IconOrb} from "../../ui";
import {legacyGet} from "./legacyClient";
import {Empty} from "./LegacyChrome";
import "./legacy.css";

type Home={
  me?:{isAdmin:boolean};
  today:Array<{kind:string;title:string;text:string;href:string}>;
  latestJournal:Array<{id:string;title:string;body:string;kind:string}>;
  latestArticles:Array<{id:string;title:string;category:string}>;
  oldPhotos:Array<{id:string;media_url?:string|null;title?:string|null}>;
  legends:Array<{id:string;full_name:string;why_important?:string|null}>;
  memorials:Array<{id:string;name:string}>;
  people:Array<{id:string;first_name?:string|null;last_name?:string|null;relationship_label?:string|null}>;
  albums:Array<{id:string;title:string}>;
  counts:Record<string,number>;
};
const empty:Home={today:[],latestJournal:[],latestArticles:[],oldPhotos:[],legends:[],memorials:[],people:[],albums:[],counts:{}};
const modules=[
  {href:"/section/legacy/encyclopedia",title:"دانشنامه خانواده",text:"تاریخ، ریشه و داستان‌ها",icon:"memories" as const,tone:"gold" as const},
  {href:"/section/legacy/legends",title:"چهره‌های ماندگار",text:"افراد تأثیرگذار خانواده",icon:"trophy" as const,tone:"violet" as const},
  {href:"/section/legacy/memorials",title:"آسمانی‌ها",text:"یادبود محترمانه",icon:"family" as const,tone:"cyan" as const},
  {href:"/section/legacy/people",title:"معرفی اعضا",text:"آشنایی با نسل‌ها",icon:"profile" as const,tone:"pink" as const},
  {href:"/section/legacy/gallery",title:"گالری خانواده",text:"آلبوم عکس و فیلم",icon:"memories" as const,tone:"blue" as const},
  {href:"/section/legacy/journal",title:"خاطرات و دلنوشته‌ها",text:"روایت و شعر خانواده",icon:"gift" as const,tone:"gold" as const},
];

export default function LegacyHome(){
  const[d,setD]=useState<Home>(empty),[q,setQ]=useState(""),[hits,setHits]=useState<Array<{type:string;id:string;title:string;href:string}>>([]),[live,setLive]=useState(false),[err,setErr]=useState(""),[loading,setLoading]=useState(true);
  const load=useCallback(()=>{const s=sessionStorage.getItem("familybot.session");if(!s){setLoading(false);setErr("برای دیدن آرشیو زنده، Mini App را از بله باز کن.");return}legacyGet("home").then(x=>{setD(x);setLive(true);setErr("")}).catch(e=>setErr(e instanceof Error?e.message:"بارگذاری انجام نشد.")).finally(()=>setLoading(false))},[]);
  useEffect(()=>load(),[load]);
  async function search(e:FormEvent){e.preventDefault();if(!q.trim())return setHits([]);try{const r=await legacyGet("search",{q});setHits(r.results||[])}catch{setHits([])}}
  return <main className="appShell">
    <div className="ambient ambientA"/><div className="starField"/>
    <header className="appHeader"><a className="roundButton" href="/">←</a><div className="wordmark"><b>خانواده ما</b><span>{live?"آرشیو زنده خانواده":"دانشنامه و میراث خانواده"}</span></div><IconOrb name="family" tone="gold"/></header>
    <section className="premiumPanel legacyHero">
      <span className="eyebrow"><Icon name="spark" size={14}/> داستان خانواده ما</span>
      <h1>میراث، خاطره و نام‌ها در یک خانه</h1>
      <p>این بخش خصوصی خانواده است؛ برای ثبت تاریخ، چهره‌ها، آسمانی‌ها و آلبوم نسل‌ها. نه ویکی عمومی، نه بازی.</p>
    </section>
    <form className="legacySearch" onSubmit={search}>
      <input value={q} onChange={e=>setQ(e.target.value)} placeholder="جستجو در افراد، دانشنامه، خاطرات و آلبوم‌ها"/>
      <button className="primaryCta" style={{minWidth:88}}>جستجو</button>
    </form>
    {loading?<div className="legacyEmpty">در حال بارگذاری...</div>:null}
    {err?<div className="adminNotice">{err}</div>:null}
    {hits.length?<section className="premiumPanel" style={{padding:14,marginTop:12}}>{hits.map(h=><a key={h.type+h.id} href={h.href} className="dashboardCard" style={{display:"block",marginBottom:8}}><b>{h.title}</b><p>{h.type}</p></a>)}</section>:null}
    <section className="premiumPanel" style={{padding:16,marginTop:16}}>
      <div className="legacyHead"><div><span className="eyebrow">امروز در تاریخ خانواده</span><h2>چنین روزی</h2></div></div>
      {d.today.length?d.today.map(c=><a key={c.title+c.href} href={c.href} className="dashboardCard" style={{display:"block",marginTop:10}}><h2>{c.title}</h2><p>{c.text}</p></a>):<Empty text="برای امروز رویداد دقیقی با روز و ماه مشخص ثبت نشده."/>}
    </section>
    <nav className="legacyModules">
      {modules.map(m=><a key={m.href} className="premiumPanel legacyModule" href={m.href}><IconOrb name={m.icon} tone={m.tone}/><div><b>{m.title}</b><small>{m.text}</small></div></a>)}
    </nav>
    <div className="legacyHead"><div><span className="eyebrow">تازه‌های دانشنامه</span><h2>آخرین نوشته‌ها</h2></div><a href="/section/legacy/encyclopedia">همه</a></div>
    <div className="legacyRail">{d.latestArticles.length?d.latestArticles.map(a=><a key={a.id} className="premiumPanel" href={`/section/legacy/encyclopedia/${a.id}`} style={{padding:14}}><small>{a.category}</small><h3 style={{margin:"8px 0 0"}}>{a.title}</h3></a>):<Empty text="هنوز مطلبی در دانشنامه خانواده وجود ندارد" cta="اولین مقاله" href="/section/legacy/encyclopedia"/>}</div>
    <div className="legacyHead"><div><span className="eyebrow">آخرین خاطرات</span><h2>دلنوشته‌ها</h2></div><a href="/section/legacy/journal">همه</a></div>
    <div className="legacyRail">{d.latestJournal.length?d.latestJournal.map(j=><a key={j.id} className="premiumPanel" href={`/section/legacy/journal/${j.id}`} style={{padding:14}}><small>{j.kind}</small><h3>{j.title}</h3><p>{j.body}</p></a>):<Empty text="هنوز خاطره‌ای ثبت نشده" cta="نوشتن" href="/section/legacy/journal"/>}</div>
    <div className="legacyHead"><div><span className="eyebrow">تصاویر قدیمی</span><h2>آلبوم‌های اخیر</h2></div><a href="/section/legacy/gallery">گالری</a></div>
    <div className="legacyRail">{d.oldPhotos.length?d.oldPhotos.map(p=><a key={p.id} href={`/section/legacy/gallery/${p.id}`} className="premiumPanel" style={{padding:0,overflow:"hidden"}}>{p.media_url?<img src={p.media_url} alt="" style={{width:"100%",height:140,objectFit:"cover"}}/>:<div style={{padding:16}}>{p.title||"تصویر"}</div>}</a>):<Empty text="اولین عکس خانوادگی را اضافه کنید" href="/section/legacy/gallery" cta="افزودن عکس"/>}</div>
  </main>;
}
