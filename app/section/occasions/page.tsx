import { Icon, IconOrb, Mascot } from "../../ui";

const events = [
  {day:"۳",month:"روز",title:"تولد نیما جان",meta:"۲۱ اردیبهشت · یادآوری برای همه",tone:"pink" as const,icon:"birthday" as const},
  {day:"جمعه",month:"۲۰:۳۰",title:"دورهمی خانوادگی",meta:"خانه مامان‌بزرگ · ۱۲ نفر",tone:"violet" as const,icon:"calendar" as const},
  {day:"۱۲",month:"روز",title:"سالگرد ازدواج",meta:"کارت تبریک و هدیه گروهی",tone:"gold" as const,icon:"gift" as const},
];

export default function OccasionsPage(){
  return <main className="appShell">
    <div className="ambient ambientA"/><div className="starField"/>
    <header className="appHeader"><a className="roundButton" href="/">←</a><div className="wordmark"><b>مناسبت‌ها</b><span>لحظه‌های مهم خانواده</span></div><IconOrb name="birthday" tone="pink"/></header>
    <section className="premiumPanel" style={{padding:22,display:"grid",gridTemplateColumns:"1fr .72fr",alignItems:"center",minHeight:205}}>
      <div><span className="eyebrow"><Icon name="spark" size={14}/> تقویم هوشمند</span><h1 style={{fontSize:27,margin:"12px 0 6px"}}>هیچ مناسبتی فراموش نمی‌شه 💜</h1><p style={{fontSize:12,lineHeight:1.9,color:"#bcb3d2",margin:0}}>تولدها، سالگردها و دورهمی‌ها با یادآوری خودکار، کارت تبریک و رویدادهای ویژه.</p></div><Mascot small/>
    </section>
    <div className="sectionHeading" style={{marginTop:22}}><div><span className="eyebrow">پیش رو</span><h2>رویدادهای نزدیک</h2></div><span className="levelPill">۳ رویداد</span></div>
    <section style={{display:"grid",gap:10,marginTop:10}}>{events.map(e=><article className="dashboardCard" key={e.title} style={{minHeight:112,display:"grid",gridTemplateColumns:"58px 1fr",alignItems:"center",gap:12}}><IconOrb name={e.icon} tone={e.tone}/><div><h2 style={{margin:0}}>{e.title}</h2><p>{e.meta}</p><b style={{fontSize:11,color:"#f6b7d0"}}>{e.day} · {e.month}</b></div></article>)}</section>
    <section className="premiumPanel" style={{padding:18,marginTop:12}}><div className="sectionHeading"><div><span className="eyebrow"><Icon name="gift" size={14}/> Birthday Mode</span><h2>جشن خودکار</h2></div><span className="levelPill">فعال</span></div><p style={{color:"#afa6c5",fontSize:12,lineHeight:1.9}}>روز تولد، تم Mini App تغییر می‌کند، Family Bot تبریک می‌گوید و اعضا می‌توانند هدیه و Family Coin بفرستند.</p></section>
  </main>
}
