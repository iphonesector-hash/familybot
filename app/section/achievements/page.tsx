import { Icon, IconOrb } from "../../ui";

const badges=[
  {name:"خاطره‌ساز",desc:"۱۰ خاطره ثبت کن",tone:"pink" as const,progress:"10/10",icon:"memories" as const},
  {name:"خانواده شاد",desc:"۷ روز پیاپی مشارکت",tone:"violet" as const,progress:"7/7",icon:"family" as const},
  {name:"هدفمند",desc:"۲۰ مأموریت کامل کن",tone:"gold" as const,progress:"16/20",icon:"trophy" as const},
  {name:"یار مهربان",desc:"۵ هدیه برای اعضا بفرست",tone:"cyan" as const,progress:"3/5",icon:"gift" as const},
  {name:"قهرمان بازی",desc:"۱۰ برد در Game Center",tone:"gold" as const,progress:"8/10",icon:"games" as const},
  {name:"منظم",desc:"۱۰ کار را سر وقت انجام بده",tone:"blue" as const,progress:"9/10",icon:"tasks" as const},
];

export default function AchievementsPage(){
  return <main className="appShell"><div className="ambient ambientA"/><div className="starField"/>
    <header className="appHeader"><a className="roundButton" href="/section/leaderboard">←</a><div className="wordmark"><b>دستاوردها</b><span>نشان‌های Family Bot</span></div><IconOrb name="trophy" tone="gold"/></header>
    <section className="premiumPanel" style={{padding:22}}><span className="eyebrow"><Icon name="spark" size={14}/> ۱۸ نشان دریافت‌شده</span><h1 style={{fontSize:27,margin:"12px 0 6px"}}>کلکسیون افتخارات ✨</h1><p style={{fontSize:12,color:"#b7aecb",lineHeight:1.9}}>با بازی، کمک به خانواده، ثبت خاطره و انجام مأموریت‌ها نشان‌های تازه آزاد می‌شوند.</p></section>
    <section className="dashboardGrid" style={{marginTop:14}}>{badges.map(b=><article className="dashboardCard" key={b.name} style={{minHeight:175}}><IconOrb name={b.icon} tone={b.tone}/><div><h2>{b.name}</h2><p>{b.desc}</p><div className="houseProgress" style={{marginTop:10}}><span>{b.progress}</span><i><em style={{width:b.progress.includes("10/10")||b.progress.includes("7/7")?"100%":b.progress.includes("16/20")?"80%":b.progress.includes("9/10")?"90%":"65%"}}/></i></div></div></article>)}</section>
  </main>
}
