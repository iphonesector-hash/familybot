import { Icon, IconOrb } from "../../ui";

const tasks=[
  {title:"خرید کیک تولد نیما",owner:"سارا",time:"امروز · ۱۸:۰۰",done:false,reward:"+۳۰"},
  {title:"رزرو رستوران جمعه",owner:"پیمان",time:"فردا · ۱۲:۰۰",done:false,reward:"+۴۰"},
  {title:"آپلود عکس‌های سفر",owner:"نیما",time:"انجام شد",done:true,reward:"+۲۰"},
];

export default function TasksPage(){
  return <main className="appShell"><div className="ambient ambientB"/><div className="starField"/>
    <header className="appHeader"><a className="roundButton" href="/">←</a><div className="wordmark"><b>کارهای خانواده</b><span>برنامه و یادآوری مشترک</span></div><IconOrb name="tasks" tone="blue"/></header>
    <section className="premiumPanel" style={{padding:22}}><span className="eyebrow"><Icon name="reminder" size={14}/> امروز ۳ یادآور</span><h1 style={{fontSize:27,margin:"12px 0 6px"}}>کارها دست‌جمعی آسون‌ترن 💜</h1><p style={{fontSize:12,color:"#b8afcc",lineHeight:1.9}}>مسئول هر کار، مهلت انجام، یادآوری و پاداش Family Coin را یکجا ببین.</p></section>
    <div className="sectionHeading" style={{marginTop:22}}><div><span className="eyebrow">امروز</span><h2>فهرست کارها</h2></div><span className="levelPill">۲ باقی‌مانده</span></div>
    <section style={{display:"grid",gap:10,marginTop:10}}>{tasks.map((t,i)=><article className="dashboardCard" key={t.title} style={{minHeight:112,display:"grid",gridTemplateColumns:"52px 1fr auto",alignItems:"center",gap:12,opacity:t.done?.72:1}}><IconOrb name={t.done?"spark":"tasks"} tone={t.done?"cyan":i===0?"pink":"blue"}/><div><h2 style={{margin:0}}>{t.title}</h2><p>{t.owner} · {t.time}</p></div><b style={{fontSize:11,color:t.done?"#75e8d8":"#ffca74"}}>{t.reward} 🪙</b></article>)}</section>
    <section className="premiumPanel" style={{padding:18,marginTop:12}}><div className="sectionHeading"><div><span className="eyebrow"><Icon name="calendar" size={14}/> برنامه مشترک</span><h2>دورهمی جمعه</h2></div><span className="levelPill">۵ کار</span></div><div className="houseProgress"><span>۳ از ۵ انجام شده</span><i><em style={{width:"60%"}}/></i></div></section>
  </main>
}
