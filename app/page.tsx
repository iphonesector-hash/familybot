import { Icon, IconName, IconOrb, Mascot } from "./ui";

const featureCards: Array<{icon:IconName; title:string; text:string; href:string; tone:"violet"|"blue"|"pink"|"gold"|"cyan"}> = [
  {icon:"birthday",title:"تولد بعدی",text:"نیما جان · ۳ روز دیگر",href:"/section/occasions",tone:"pink"},
  {icon:"trophy",title:"رتبه‌بندی",text:"رتبه ۲ این ماه",href:"/section/leaderboard",tone:"gold"},
  {icon:"reminder",title:"یادآورها",text:"۳ یادآور برای امروز",href:"/section/tasks",tone:"blue"},
  {icon:"memories",title:"خاطرات",text:"۱۲ خاطره ثبت‌شده",href:"/section/memories",tone:"cyan"},
  {icon:"games",title:"بازی‌ها",text:"چالش خانوادگی جدید",href:"/section/games",tone:"violet"},
  {icon:"gift",title:"جوایز روزانه",text:"جایزه امروز آماده است",href:"/section/leaderboard",tone:"pink"},
];

export default function HomePage(){
  return <main className="appShell">
    <div className="ambient ambientA"/><div className="ambient ambientB"/><div className="starField"/>
    <header className="appHeader">
      <button className="roundButton notification" aria-label="اعلان‌ها"><Icon name="reminder" size={21}/><i/></button>
      <div className="wordmark"><b>Family Bot</b><span>سلام، خوش برگشتی <em>💜</em></span></div>
      <a className="profileAvatar" href="/section/leaderboard" aria-label="پروفایل"><Icon name="profile" size={23}/></a>
    </header>

    <section className="homeHero premiumPanel">
      <div className="homeHeroCopy">
        <span className="eyebrow"><Icon name="spark" size={15}/> دستیار هوشمند خانواده</span>
        <h1>خانواده ما</h1><p>همراه هم، هر روز بهتر</p>
        <div className="heroStats">
          <div><Icon name="family"/><b>۴۸</b><span>عضو</span></div>
          <div><Icon name="birthday"/><b>۲</b><span>تولد پیش‌رو</span></div>
          <div><Icon name="calendar"/><b>۵</b><span>برنامه</span></div>
        </div>
        <a href="/section/family" className="ghostCta">مشاهده جزئیات خانواده <span>←</span></a>
      </div>
      <Mascot/>
      <div className="heroDots"><i/><i/><i/></div>
    </section>

    <section className="dashboardGrid">
      {featureCards.map(card=><a className="dashboardCard" href={card.href} key={card.title}>
        <IconOrb name={card.icon} tone={card.tone}/>
        <div><h2>{card.title}</h2><p>{card.text}</p></div><span className="cardArrow">←</span>
      </a>)}
    </section>

    <a href="/ai" className="aiBanner premiumPanel">
      <div className="aiCopy"><span className="eyebrow"><Icon name="ai" size={15}/> Family AI</span><h2>پرسش از هوش مصنوعی</h2><p>تایپ کن یا با صدات حرف بزن؛ برای برنامه‌ریزی، یادآوری و سرگرمی کنارت هستم.</p><span className="primaryCta">شروع گفتگو <b>←</b></span></div>
      <Mascot small/>
      <span className="floatQuestion q1">?</span><span className="floatQuestion q2">?</span>
    </a>

    <a href="/section/house" className="housePreview premiumPanel">
      <div className="sectionHeading"><div><span className="eyebrow"><Icon name="home" size={15}/> Family House</span><h2>خانه خانواده</h2></div><span className="levelPill">LV. 7</span></div>
      <div className="houseStage">
        <div className="moonGlow"/><div className="treeBlob left"/><div className="treeBlob right"/>
        <div className="houseArt"><span className="roofArt"/><span className="chimney"/><span className="bodyArt"><i className="window w1"/><i className="window w2"/><i className="door"/></span></div>
        <Mascot small/>
      </div>
      <div className="houseProgress"><span><b>720</b> / 1200 XP</span><i><em/></i></div>
    </a>

    <nav className="bottomNav"><a className="active" href="/"><Icon name="home"/><span>خانه</span></a><a href="/section/family"><Icon name="family"/><span>خانواده</span></a><a href="/section/games"><Icon name="games"/><span>بازی‌ها</span></a><a href="/ai"><Icon name="ai"/><span>AI</span></a><a href="/section/leaderboard"><Icon name="profile"/><span>پروفایل</span></a></nav>
  </main>
}
