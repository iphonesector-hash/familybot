"use client";
import {useEffect,useMemo,useState} from "react";
import Link from "next/link";
import UserGreeting from "./UserGreeting";
import {Icon,IconName,IconOrb,Mascot} from "./ui";
import Avatar from "./ui/Avatar";
import {sessionGet} from "@/lib/safeSessionStorage";
import {stageFor} from "@/lib/sagoolCatalog";
import {houseSceneSrc} from "@/lib/houseProgression";
import {useBaleMiniApp} from "@/lib/useBaleMiniApp";
import {pickDisplayAvatar} from "@/lib/avatarResolve";
import {cacheDashboardShell,readUiSnapshot} from "@/lib/miniAppUiCache";

type Birthday={display_name?:string|null;first_name?:string|null;days:number};
type Profile={id?:string;display_name?:string|null;first_name?:string|null;avatar_url?:string|null;resolved_avatar_url?:string|null;level:number;xp:number;coins:number;streak:number;rank?:number|null;is_founder?:boolean;equipped_profile_item?:string|null}|null;
type Dashboard={family:{id?:string;name:string;level:number;xp:number;coins:number;houseLevel:number;membersCount:number;upcomingEventsCount:number;upcomingBirthdaysCount:number;memoriesCount:number;levelProgress:{current:number;target:number}};profile:Profile;birthdays:Birthday[];tasks:Array<{id:string;title:string;status:string;due_at?:string|null}>;permissions?:{canManage:boolean;isFounder?:boolean}};
type Tone="violet"|"blue"|"pink"|"gold"|"cyan";
type FeatureCard={icon:IconName;title:string;text:string;href:string;tone:Tone;asset?:string};
const fallback:Dashboard={family:{name:"خانواده ما",level:1,xp:0,coins:0,houseLevel:1,membersCount:0,upcomingEventsCount:0,upcomingBirthdaysCount:0,memoriesCount:0,levelProgress:{current:0,target:500}},profile:null,birthdays:[],tasks:[],permissions:{canManage:false}};
const fa=(v:number)=>new Intl.NumberFormat("fa-IR").format(v||0);
function birthdayText(i?:Birthday){if(!i)return"فعلاً تولدی ثبت نشده";const n=i.display_name||i.first_name||"عضو خانواده";return i.days===0?`${n} · امروز`:i.days===1?`${n} · فردا`:`${n} · ${fa(i.days)} روز دیگر`}
function cachedDashboard():Dashboard{const c=readUiSnapshot();if(!c)return fallback;return{...fallback,family:{...fallback.family,...(c.family||{})},profile:c.profile?{level:1,xp:0,coins:0,streak:0,...c.profile} as Profile:null}}

export default function HomeDashboard(){
  const {user}=useBaleMiniApp();
  const[d,setD]=useState<Dashboard>(cachedDashboard),[live,setLive]=useState(false),[sagool,setSagool]=useState<{level:number;hunger:number;thirst:number;happiness:number}|null>(null),[brokenAvatar,setBrokenAvatar]=useState(false);
  useEffect(()=>{const s=sessionGet("familybot.session");if(!s)return;const headers={authorization:`Bearer ${s}`};
    fetch("/api/family/profile/shell",{headers,cache:"no-store"}).then(r=>r.json()).then(x=>{if(x.ok){setD(v=>({...v,family:{...v.family,...x.family},profile:x.profile?{...(v.profile||{level:1,xp:0,coins:0,streak:0}),...x.profile}:v.profile}));cacheDashboardShell(x);setLive(true)}}).catch(()=>{});
    fetch("/api/family/dashboard",{headers,cache:"no-store"}).then(r=>r.json()).then(x=>{if(x.ok&&x.dashboard){setD(v=>({...x.dashboard,family:{...v.family,...x.dashboard.family},profile:x.dashboard.profile?{...(v.profile||{}),...x.dashboard.profile}:v.profile}));cacheDashboardShell(x.dashboard);setLive(true)}}).catch(()=>{});
    fetch("/api/family/sagool",{headers,cache:"no-store"}).then(r=>r.json()).then(p=>{if(p?.ok&&p.data?.state)setSagool(p.data.state)}).catch(()=>{});
  },[]);
  const founder=Boolean(d.profile?.is_founder||d.permissions?.isFounder);
  const sagoolAsset=stageFor(sagool?.level||1).asset;
  const avatar=(!brokenAvatar&&pickDisplayAvatar({stored:d.profile?.resolved_avatar_url||d.profile?.avatar_url,live:user?.photo_url}))||"";
  const cosmetic=d.profile?.equipped_profile_item||null;
  const cards=useMemo<FeatureCard[]>(()=>[
    {icon:"family",title:"خانواده و ابزارها",text:"اعضا، صندوق و کارهای مشترک",href:"/section/family",tone:"violet"},
    {icon:"tree",title:"شجره‌نامه",text:"درخت تصویری و روابط خانواده",href:"/section/tree",tone:"violet"},
    {icon:"wheel",title:"گردونه شانس",text:"هر ۲۴ ساعت یک جایزه",href:"/section/wheel",tone:"gold"},
    {icon:"store",title:"فروشگاه",text:"خانه، سگول و پروفایل",href:"/section/store",tone:"violet"},
    {icon:"wallet",title:"بانک و سکه",text:founder?"Founder · ∞":`${fa(d.profile?.coins||0)} سکه`,href:"/section/finance",tone:"gold"},
    {icon:"calendar",title:"برنامه‌ریز",text:`${fa(d.tasks.length)} کار باز`,href:"/section/planner",tone:"blue"},
    {icon:"family",title:"خانواده ما",text:"دانشنامه، گالری و میراث",href:"/section/legacy",tone:"gold"},
    {icon:"memories",title:"خاطرات",text:`${fa(d.family.memoriesCount)} خاطره`,href:"/section/memories",tone:"cyan"},
    {icon:"games",title:"بازی‌ها",text:"سریع، کوئیز و گروهی",href:"/section/games",tone:"violet"},
    {icon:"gift",title:"سرگرمی و فرهنگ",text:"فال، شعر و دزفولی",href:"/section/fun",tone:"pink"},
    {icon:"trophy",title:"۵ عضو برتر",text:d.profile?.rank?`رتبه من ${fa(d.profile.rank)}`:"مشاهده رتبه‌ها",href:"/section/leaderboard",tone:"gold"},
  ],[d,founder]);
  const progress=Math.max(0,Math.min(100,Math.round(d.family.levelProgress.current/Math.max(1,d.family.levelProgress.target)*100)));
  return <main className="appShell">
    <div className="ambient ambientA"/><div className="ambient ambientB"/><div className="starField"/>
    <header className="appHeader">
      <Link className="roundButton notification" href="/section/planner"><Icon name="reminder" size={21}/></Link>
      <div className="wordmark"><b>JAHANI</b><UserGreeting/></div>
      <Link className="profileAvatar" href="/section/leaderboard"><Avatar src={avatar} alt="" size={44} cosmetic={cosmetic} fallback="✦"/></Link>
    </header>
    <section className="homeHero premiumPanel">
      <div className="homeHeroCopy">
        <span className="eyebrow"><Icon name="spark" size={15}/> خانواده بزرگ جهانی {live?<small>• زنده</small>:null}</span>
        <h1>{d.family.name||"خانواده ما"}</h1>
        <p>{founder?"Founder Mode · همه قابلیت‌ها برای تست باز است":"همراه هم، هر روز بهتر"}</p>
        <div className="heroStats"><div><Icon name="family"/><b>{fa(d.family.membersCount)}</b><span>عضو</span></div><div><Icon name="coins"/><b>{founder?"∞":fa(d.profile?.coins||0)}</b><span>سکه</span></div><div><Icon name="trophy"/><b>{founder?"∞":fa(d.profile?.xp||0)}</b><span>XP</span></div></div>
      </div>
      {avatar?<div className="mascotVisual" aria-label="پروفایل شما"><div className="mascotHalo"/><Avatar src={avatar} alt={d.profile?.display_name||d.profile?.first_name||"عضو خانواده"} size={170} cosmetic={cosmetic} fallback="✦"/><span className="mascotShadow"/></div>:<Mascot mood={founder?"celebrate":"idle"}/>}
    </section>
    <div className="homeStack">
      <div className="homeFeatureGrid">
        <Link className="homeFeature premiumPanel" href="/section/sagool"><div className="homeFeatureCopy"><span className="eyebrow">همراه خانواده</span><h2>سگول</h2><p>{sagool?`Lv.${fa(sagool.level)} · شادی ${fa(sagool.happiness)}٪`:"منتظر مراقبت توست"}</p></div><div className="homeFeatureMedia"><img src={sagoolAsset} alt="سگول"/></div></Link>
        <Link className="homeFeature premiumPanel" href="/section/occasions"><div className="homeFeatureCopy"><span className="eyebrow">جشن و تاریخ</span><h2>مناسبت‌ها</h2><p>{birthdayText(d.birthdays[0])}</p></div><div className="homeFeatureMedia"><img src="/assets/ui/occasions.png" alt="مناسبت‌های خانواده" loading="lazy"/></div></Link>
      </div>
      <Link href="/section/house" className="housePreview premiumPanel"><div className="sectionHeading"><div><span className="eyebrow">خانه خانواده</span><h2>JAHANI House</h2></div><span className="levelPill">خانه LV. {fa(d.family.houseLevel)} / ۱۰</span></div><img src={houseSceneSrc(d.family.houseLevel)} alt={`خانه سطح ${d.family.houseLevel}`} loading="lazy" style={{width:"100%",height:148,objectFit:"cover",borderRadius:18,margin:"8px 0 10px"}}/><div className="houseProgress"><span>پیشرفت خانواده · <b>{fa(d.family.levelProgress.current)}</b> / {fa(d.family.levelProgress.target)} XP</span><i><em style={{width:`${progress}%`}}/></i></div></Link>
      <Link href="/ai" className="aiBanner premiumPanel"><div className="aiCopy"><span className="eyebrow"><Icon name="ai" size={15}/> سکتور AI</span><h2>گفتگو با سکتور</h2><p>چت، حافظه، جستجو و فرمان خانوادگی.</p><span className="primaryCta">شروع گفتگو ←</span></div><Mascot small mood="listening"/></Link>
      <Link href="/admin" className="adminPanel premiumPanel" style={{display:"block",width:"100%",textAlign:"right"}}><div className="sectionHeading"><div><span className="eyebrow"><Icon name="shield" size={15}/> مدیریت گروه</span><h2>مرکز مدیریت</h2><p>{d.permissions?.canManage||founder?"تنظیم خوش‌آمد، قوانین و اعضا":"فقط مدیران گروه اجازه ورود دارند"}</p></div><IconOrb name="shield" tone="violet"/></div></Link>
      <section className="dashboardGrid">{cards.map(c=><Link className="dashboardCard" href={c.href} key={c.title}><IconOrb name={c.icon} tone={c.tone}/><div><h2>{c.title}</h2><p>{c.text}</p></div><span className="cardArrow">←</span></Link>)}</section>
    </div>
  </main>;
}
