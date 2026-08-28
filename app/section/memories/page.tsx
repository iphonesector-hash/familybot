import { Icon, IconOrb, Mascot } from "../../ui";

const memories = [
  {title:"سفر شمال",date:"تابستان ۱۴۰۵",note:"۲۴ عکس · ۳ ویدیو",tone:"cyan" as const},
  {title:"یلدای خانوادگی",date:"۳۰ آذر ۱۴۰۴",note:"۱۸ عکس · ۱۲ یادداشت",tone:"pink" as const},
  {title:"تولد مامان",date:"اردیبهشت ۱۴۰۵",note:"۳۱ عکس · ۵ پیام صوتی",tone:"gold" as const},
];

export default function MemoriesPage(){
  return <main className="appShell">
    <div className="ambient ambientB"/><div className="starField"/>
    <header className="appHeader"><a className="roundButton" href="/">←</a><div className="wordmark"><b>خاطرات</b><span>آلبوم خصوصی خانواده</span></div><IconOrb name="memories" tone="cyan"/></header>
    <section className="premiumPanel" style={{padding:20,minHeight:225,display:"grid",gridTemplateColumns:"1.15fr .85fr",alignItems:"center"}}><div><span className="eyebrow"><Icon name="memories" size={14}/> Memory Timeline</span><h1 style={{fontSize:27,margin:"12px 0 6px"}}>لحظه‌ها رو نگه داریم ✨</h1><p style={{fontSize:12,lineHeight:1.9,color:"#b9b0cf"}}>عکس‌ها، ویدیوها و یادداشت‌های خانوادگی را بر اساس سفر، مناسبت و اعضا مرتب و مرور کن.</p></div><Mascot small/></section>
    <div className="sectionHeading" style={{marginTop:22}}><div><span className="eyebrow">آلبوم‌ها</span><h2>خاطرات محبوب</h2></div><span className="levelPill">۱۲ خاطره</span></div>
    <section className="dashboardGrid">{memories.map((m,i)=><article className="dashboardCard" key={m.title} style={{minHeight:170}}><IconOrb name="memories" tone={m.tone}/><div style={{marginTop:12}}><h2>{m.title}</h2><p>{m.date}</p><b style={{fontSize:10,color:"#8fe8ef"}}>{m.note}</b></div><span style={{position:"absolute",left:14,bottom:12,fontSize:36,opacity:.16}}>{i===0?"🏞️":i===1?"✨":"🎂"}</span></article>)}</section>
    <section className="aiBanner premiumPanel" style={{minHeight:150}}><div className="aiCopy"><span className="eyebrow"><Icon name="spark" size={14}/> خاطره امروز</span><h2>یک سال پیش همین امروز</h2><p>Family Bot می‌تواند خاطرات قدیمی را در روزهای مشابه دوباره به خانواده نشان دهد.</p><span className="primaryCta">مرور خاطره ←</span></div><IconOrb name="memories" tone="pink"/></section>
  </main>
}
