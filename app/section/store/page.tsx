import { Icon, IconOrb, Mascot } from "../../ui";

const items = [
  {name:"درخت بنفش",price:"۵۰۰",tone:"violet" as const,icon:"tree" as const},
  {name:"فواره نور",price:"۸۰۰",tone:"cyan" as const,icon:"spark" as const},
  {name:"نیمکت قلبی",price:"۶۰۰",tone:"pink" as const,icon:"gift" as const},
  {name:"فریم قهرمان",price:"۹۵۰",tone:"gold" as const,icon:"trophy" as const},
];

export default function StorePage(){
  return <main className="appShell">
    <div className="ambient ambientA"/><div className="starField"/>
    <header className="appHeader"><a className="roundButton" href="/section/house">←</a><div className="wordmark"><b>فروشگاه</b><span>آیتم‌های Family House</span></div><IconOrb name="store" tone="violet"/></header>
    <section className="premiumPanel" style={{padding:20,minHeight:205,display:"grid",gridTemplateColumns:"1.15fr .85fr",alignItems:"center"}}><div><span className="eyebrow"><Icon name="coins" size={14}/> موجودی ۲٬۴۵۰</span><h1 style={{fontSize:27,margin:"12px 0 6px"}}>خونه‌تون رو خاص‌تر کنید</h1><p style={{fontSize:12,lineHeight:1.9,color:"#b9b0cf"}}>دکور، نشان، فریم و آیتم‌های کلکسیونی با Family Coin تهیه می‌شوند.</p></div><Mascot small/></section>
    <div className="sectionHeading" style={{marginTop:22}}><div><span className="eyebrow">پیشنهادها</span><h2>محبوب‌ترین آیتم‌ها</h2></div><span className="levelPill">امروز</span></div>
    <section className="dashboardGrid">{items.map(item=><article className="dashboardCard" key={item.name} style={{minHeight:166}}><IconOrb name={item.icon} tone={item.tone}/><div><h2>{item.name}</h2><p>آیتم دائمی برای خانه خانواده</p><span className="primaryCta" style={{marginTop:10}}><Icon name="coins" size={14}/>{item.price}</span></div></article>)}</section>
    <section className="premiumPanel" style={{padding:18,marginTop:12}}><div className="sectionHeading"><div><span className="eyebrow"><Icon name="gift" size={14}/> هدیه دادن</span><h2>برای یک عضو هدیه بفرست</h2></div><IconOrb name="gift" tone="pink"/></div><p style={{fontSize:12,color:"#aaa1c2",lineHeight:1.9}}>آیتم‌ها و نشان‌های ویژه را می‌توان مستقیم به اعضای خانواده هدیه داد.</p></section>
  </main>
}
