"use client";

import { useEffect, useMemo, useState } from "react";
import UserGreeting from "./UserGreeting";
import { Icon, IconName, IconOrb, Mascot } from "./ui";

type Birthday = { display_name?: string | null; first_name?: string | null; days: number };
type Profile = { display_name?: string | null; first_name?: string | null; level: number; xp: number; coins: number; streak: number; rank?: number | null } | null;
type Dashboard = {
  family: {
    name: string;
    level: number;
    xp: number;
    coins: number;
    houseLevel: number;
    membersCount: number;
    upcomingEventsCount: number;
    upcomingBirthdaysCount: number;
    memoriesCount: number;
    levelProgress: { current: number; target: number };
  };
  profile: Profile;
  birthdays: Birthday[];
  tasks: Array<{ id: string; title: string; status: string; due_at?: string | null }>;
};

type Tone = "violet"|"blue"|"pink"|"gold"|"cyan";
type FeatureCard = { icon: IconName; title: string; text: string; href: string; tone: Tone };

const fallback: Dashboard = {
  family: { name: "خانواده ما", level: 7, xp: 720, coins: 0, houseLevel: 7, membersCount: 48, upcomingEventsCount: 5, upcomingBirthdaysCount: 2, memoriesCount: 12, levelProgress: { current: 720, target: 1200 } },
  profile: { level: 1, xp: 0, coins: 0, streak: 0, rank: 2 },
  birthdays: [{ display_name: "نیما جان", days: 3 }],
  tasks: [{ id: "demo", title: "یادآور امروز", status: "open" }, { id: "demo2", title: "کار خانوادگی", status: "doing" }, { id: "demo3", title: "خرید", status: "open" }],
};

function fa(value: number) { return new Intl.NumberFormat("fa-IR").format(value); }
function birthdayText(item?: Birthday) {
  if (!item) return "فعلاً تولدی ثبت نشده";
  const name = item.display_name || item.first_name || "عضو خانواده";
  if (item.days === 0) return `${name} · امروز 🎉`;
  if (item.days === 1) return `${name} · فردا`;
  return `${name} · ${fa(item.days)} روز دیگر`;
}

export default function HomeDashboard(){
  const [dashboard,setDashboard]=useState<Dashboard>(fallback);
  const [live,setLive]=useState(false);

  useEffect(()=>{
    const session=sessionStorage.getItem("familybot.session");
    if(!session)return;
    fetch("/api/family/dashboard",{headers:{authorization:`Bearer ${session}`},cache:"no-store"})
      .then(r=>r.json())
      .then(data=>{if(data.ok&&data.dashboard){setDashboard(data.dashboard);setLive(true)}})
      .catch(()=>undefined);
  },[]);

  const cards=useMemo<FeatureCard[]>(()=>[
    {icon:"birthday",title:"تولد بعدی",text:birthdayText(dashboard.birthdays[0]),href:"/section/occasions",tone:"pink"},
    {icon:"trophy",title:"رتبه‌بندی",text:dashboard.profile?.rank?`رتبه ${fa(dashboard.profile.rank)} خانواده`:"هنوز رتبه‌ای ثبت نشده",href:"/section/leaderboard",tone:"gold"},
    {icon:"reminder",title:"یادآورها",text:`${fa(dashboard.tasks.length)} کار و یادآور باز`,href:"/section/tasks",tone:"blue"},
    {icon:"memories",title:"خاطرات",text:`${fa(dashboard.family.memoriesCount)} خاطره ثبت‌شده`,href:"/section/memories",tone:"cyan"},
    {icon:"games",title:"بازی‌ها",text:"چالش خانوادگی جدید",href:"/section/games",tone:"violet"},
    {icon:"gift",title:"Family Coin",text:`${fa(dashboard.profile?.coins||0)} سکه در کیف پول`,href:"/section/leaderboard",tone:"pink"},
  ],[dashboard]);

  const progress=Math.max(0,Math.min(100,Math.round((dashboard.family.levelProgress.current/Math.max(1,dashboard.family.levelProgress.target))*100)));

  return <main className="appShell">
    <div className="ambient ambientA"/><div className="ambient ambientB"/><div className="starField"/>
    <header className="appHeader">
      <button className="roundButton notification" aria-label="اعلان‌ها"><Icon name="reminder" size={21}/><i/></button>
      <div className="wordmark"><b>Family Bot</b><UserGreeting/></div>
      <a className="profileAvatar" href="/section/leaderboard" aria-label="پروفایل"><Icon name="profile" size={23}/></a>
    </header>

    <section className="homeHero premiumPanel">
      <div className="homeHeroCopy">
        <span className="eyebrow"><Icon name="spark" size={15}/> دستیار هوشمند خانواده {live?<small style={{opacity:.65}}>• زنده</small>:null}</span>
        <h1>{dashboard.family.name || "خانواده ما"}</h1><p>همراه هم، هر روز بهتر</p>
        <div className="heroStats">
          <div><Icon name="family"/><b>{fa(dashboard.family.membersCount)}</b><span>عضو</span></div>
          <div><Icon name="birthday"/><b>{fa(dashboard.family.upcomingBirthdaysCount)}</b><span>تولد پیش‌رو</span></div>
          <div><Icon name="calendar"/><b>{fa(dashboard.family.upcomingEventsCount)}</b><span>برنامه</span></div>
        </div>
        <a href="/section/family" className="ghostCta">مشاهده جزئیات خانواده <span>←</span></a>
      </div>
      <Mascot/>
      <div className="heroDots"><i/><i/><i/></div>
    </section>

    <section className="dashboardGrid">
      {cards.map(card=><a className="dashboardCard" href={card.href} key={card.title}>
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
      <div className="sectionHeading"><div><span className="eyebrow"><Icon name="home" size={15}/> Family House</span><h2>خانه خانواده</h2></div><span className="levelPill">LV. {fa(dashboard.family.houseLevel||dashboard.family.level)}</span></div>
      <div className="houseStage">
        <div className="moonGlow"/><div className="treeBlob left"/><div className="treeBlob right"/>
        <div className="houseArt"><span className="roofArt"/><span className="chimney"/><span className="bodyArt"><i className="window w1"/><i className="window w2"/><i className="door"/></span></div>
        <Mascot small/>
      </div>
      <div className="houseProgress"><span><b>{fa(dashboard.family.levelProgress.current)}</b> / {fa(dashboard.family.levelProgress.target)} XP</span><i><em style={{width:`${progress}%`}}/></i></div>
    </a>

    <nav className="bottomNav"><a className="active" href="/"><Icon name="home"/><span>خانه</span></a><a href="/section/family"><Icon name="family"/><span>خانواده</span></a><a href="/section/games"><Icon name="games"/><span>بازی‌ها</span></a><a href="/ai"><Icon name="ai"/><span>AI</span></a><a href="/section/leaderboard"><Icon name="profile"/><span>پروفایل</span></a></nav>
  </main>;
}
