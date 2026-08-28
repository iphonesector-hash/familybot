import { Icon, IconOrb, Mascot } from "../../ui";

const ranks=[
  {name:"سارا",score:"۲٬۴۵۰",rank:"۱",badge:"قهرمان خانواده"},
  {name:"پیمان",score:"۲٬۱۸۰",rank:"۲",badge:"همراه صمیمی"},
  {name:"نیما",score:"۱٬۹۶۰",rank:"۳",badge:"خاطره‌ساز"},
];

export default function LeaderboardPage(){
  return <main className="appShell">
    <div className="ambient ambientB"/><div className="starField"/>
    <header className="appHeader"><a className="roundButton" href="/">←</a><div className="wordmark"><b>پروفایل و رتبه‌بندی</b><span>پیشرفت اعضای خانواده</span></div><IconOrb name="trophy" tone="gold"/></header>
    <section className="premiumPanel" style={{padding:22,display:"grid",gridTemplateColumns:"1fr .8fr",alignItems:"center",minHeight:230}}><div><span className="eyebrow"><Icon name="spark" size={14}/> سطح ۱۲</span><h1 style={{fontSize:28,margin:"12px 0 6px"}}>پیمان 💜</h1><p style={{fontSize:12,lineHeight:1.9,color:"#b9b0cf"}}>۲٬۱۸۰ امتیاز · ۱۸ نشان · Streak هشت‌روزه</p><div className="houseProgress"><span><b>۸۴۰</b> / ۱۲۰۰ XP</span><i><em style={{width:"70%"}}/></i></div></div><Mascot small/></section>
    <div className="sectionHeading" style={{marginTop:22}}><div><span className="eyebrow">این ماه</span><h2>جدول خانواده</h2></div><span className="levelPill">۴۸ عضو</span></div>
    <section style={{display:"grid",gap:10,marginTop:10}}>{ranks.map((r,i)=><article className="dashboardCard" key={r.name} style={{minHeight:100,display:"grid",gridTemplateColumns:"52px 1fr auto",alignItems:"center",gap:12}}><IconOrb name="profile" tone={i===0?"gold":i===1?"violet":"pink"}/><div><h2 style={{margin:0}}>{r.name}</h2><p>{r.badge}</p></div><div style={{textAlign:"center"}}><b style={{fontSize:18}}>#{r.rank}</b><span style={{display:"block",fontSize:10,color:"#b3aac7"}}>{r.score} XP</span></div></article>)}</section>
    <section className="premiumPanel" style={{padding:18,marginTop:12}}><div className="sectionHeading"><div><span className="eyebrow"><Icon name="trophy" size={14}/> دستاوردها</span><h2>نشان‌های شما</h2></div><a className="levelPill" href="/section/achievements">مشاهده همه ←</a></div><div style={{display:"flex",gap:10,marginTop:14,overflowX:"auto"}}>{["خاطره‌ساز","خانواده شاد","هدفمند","یار مهربان"].map((x,i)=><div key={x} style={{minWidth:92,textAlign:"center"}}><IconOrb name={i%2?"spark":"trophy"} tone={i===0?"pink":i===1?"violet":i===2?"gold":"cyan"}/><p style={{fontSize:10,color:"#c8bfdc"}}>{x}</p></div>)}</div></section>
  </main>
}
