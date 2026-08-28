"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Icon, Mascot } from "../../ui";
import styles from "./house.module.css";

type HouseData={family:{name:string;xp:number;houseLevel:number;levelProgress:{current:number;target:number}};profile?:{coins?:number|null}|null;ownedItems?:Array<{item_id:string}>};
type Decor={icon:string;name:string;level:string;price:number;itemId:string};
const decor:Decor[]=[
  {icon:"🌳",name:"درخت بنفش",level:"LV.3",price:500,itemId:"purple_tree"},
  {icon:"⛲",name:"فواره نور",level:"LV.2",price:800,itemId:"light_fountain"},
  {icon:"🛋️",name:"نیمکت قلبی",level:"LV.1",price:600,itemId:"heart_bench"},
];
const fallback:HouseData={family:{name:"خانواده ما",xp:0,houseLevel:1,levelProgress:{current:0,target:500}},profile:{coins:0},ownedItems:[]};
const fa=(n:number)=>new Intl.NumberFormat("fa-IR").format(n||0);

async function familyAction(action:string,payload:Record<string,unknown>={}){const session=sessionStorage.getItem("familybot.session");if(!session)throw new Error("Mini App رو از داخل ربات باز کن.");const r=await fetch("/api/family/action",{method:"POST",headers:{"content-type":"application/json",authorization:`Bearer ${session}`},body:JSON.stringify({action,payload})});const d=await r.json();if(!d.ok)throw new Error(d.error||"action_failed");return d.data}

export default function HousePage(){
  const [selected,setSelected]=useState<Decor>(decor[0]),[toast,setToast]=useState(""),[levelBurst,setLevelBurst]=useState(false),[data,setData]=useState<HouseData>(fallback);const timer=useRef<ReturnType<typeof setTimeout>|null>(null);
  function notify(text:string){setToast(text);if(timer.current)clearTimeout(timer.current);timer.current=setTimeout(()=>setToast(""),2200)}
  async function refresh(){const session=sessionStorage.getItem("familybot.session");if(!session)return;try{const r=await fetch("/api/family/dashboard",{headers:{authorization:`Bearer ${session}`},cache:"no-store"});const d=await r.json();if(d.ok&&d.dashboard)setData(d.dashboard)}catch{notify("دریافت اطلاعات خانه ممکن نشد")}}
  useEffect(()=>{refresh()},[]);
  async function buy(){try{const result=await familyAction("store.purchase",{itemId:selected.itemId});notify(result.alreadyOwned?"این آیتم رو قبلاً داری 💜":`${selected.name} خریداری شد ✨`);setLevelBurst(!result.alreadyOwned);setTimeout(()=>setLevelBurst(false),1400);refresh()}catch(e){const m=e instanceof Error?e.message:"خرید انجام نشد";notify(m==="insufficient_coins"?"سکه کافی نداری 🪙":m)}}
  async function claimReward(){try{const result=await familyAction("mission.claim",{missionId:"daily_task"});notify(result.alreadyClaimed?"پاداش امروز قبلاً دریافت شده.":`+${result.reward} سکه دریافت شد ✨`);setLevelBurst(!result.alreadyClaimed);setTimeout(()=>setLevelBurst(false),1500);refresh()}catch(e){const m=e instanceof Error?e.message:"پاداش آماده نیست";notify(m==="mission_not_complete"?"اول مأموریت امروز رو کامل کن 💜":m)}}
  const owned=new Set((data.ownedItems||[]).map(x=>x.item_id)),progress=Math.max(0,Math.min(100,Math.round(data.family.levelProgress.current/Math.max(1,data.family.levelProgress.target)*100)));
  return <main className={styles.page}>
    <div className={`motionToast${toast?" show":""}`}>{toast}</div><div className={`levelBurst${levelBurst?" show":""}`}><div className="levelBurstCore"><div><b>✨</b><span>Family House به‌روز شد</span></div></div></div>
    <header className={styles.header}><Link href="/" className={styles.back}>←</Link><div><b>Family Bot</b><span>{data.family.name}</span></div><span className={styles.bot}><Mascot small mood={levelBurst?"celebrate":"love"}/></span></header>
    <section className={styles.stats}><div><span className={styles.statIcon}><Icon name="spark"/></span><p>سطح خانه</p><b>Lv. {fa(data.family.houseLevel)}</b><i><em style={{width:`${progress}%`}}/></i></div><div><span className={styles.coin}>●</span><p>سکه‌های من</p><b>{fa(Number(data.profile?.coins||0))}</b></div><div><span className={styles.statIcon}><Icon name="trophy"/></span><p>XP خانواده</p><b>{fa(data.family.xp)}</b></div></section>
    <section className={styles.sceneCard}><div className={styles.sceneTitle}><div><p>خانه خانواده</p><span>سطح {fa(data.family.houseLevel)} · {fa(owned.size)} آیتم واقعی</span></div><span className={styles.score}>{fa(data.family.xp)}<br/><small>مجموع XP</small></span></div><div className={styles.sky}><i className={styles.starA}/><i className={styles.starB}/><i className={styles.starC}/></div><div className={styles.land}><span className={styles.tree}/><span className={styles.bushA}/><span className={styles.bushB}/><span className={styles.fence}/><div className={styles.house}><span className={styles.chimney}/><span className={styles.roof}/><span className={styles.wall}><i/><i/><b>♥</b></span></div><div className={styles.pet}><Mascot small mood="love"/></div><button onClick={()=>notify(`${selected.name} برای چیدمان انتخاب شد`)} aria-label={`قرار دادن ${selected.name}`} style={{position:"absolute",left:"18%",bottom:"14%",zIndex:8,width:58,height:58,borderRadius:20,border:"1px solid rgba(255,255,255,.18)",background:"linear-gradient(145deg,rgba(86,55,170,.94),rgba(30,19,75,.94))",boxShadow:"0 14px 35px rgba(0,0,0,.28)",fontSize:28,cursor:"pointer"}}>{selected.icon}</button></div>
      <div className={styles.decorRail}>{decor.map(item=><button key={item.itemId} onClick={()=>{setSelected(item);notify(`${item.name} انتخاب شد`)}} aria-pressed={selected.itemId===item.itemId} style={selected.itemId===item.itemId?{outline:"2px solid rgba(172,132,255,.8)",transform:"translateY(-3px)"}:undefined}><span>{owned.has(item.itemId)?"✓":item.icon}</span><b>{item.level}</b></button>)}</div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,padding:"11px 4px 0",fontSize:11,color:"#bdb2d5"}}><span>انتخاب: <b style={{color:"#fff"}}>{selected.name}</b></span><button onClick={buy} disabled={owned.has(selected.itemId)} style={{border:0,borderRadius:12,padding:"8px 11px",background:"linear-gradient(145deg,#6946ff,#ae3bd7)",color:"white",cursor:"pointer"}}>{owned.has(selected.itemId)?"خریداری شده":`خرید · ${fa(selected.price)} 🪙`}</button></div>
    </section>
    <section className={styles.challenge}><div><span>🎯 چالش امروز</span><h2>یک کار خانوادگی رو کامل کن</h2><p>پاداش واقعی Family Coin</p><i><em/></i></div><div className={styles.challengeArt}>🎯✨</div><button className={styles.reward} onClick={claimReward} style={{border:0,cursor:"pointer"}}>دریافت</button></section>
    <section className={styles.dual}><article><header><h2>ماموریت‌ها و نشان‌ها</h2><span><Icon name="trophy"/></span></header><p>پیشرفت واقعی از فعالیت Family Bot</p><Link href="/section/achievements">مشاهده دستاوردها ←</Link></article><article><header><h2>فروشگاه</h2><span><Icon name="store"/></span></header><div className={styles.shop}>{decor.map(item=><div key={item.itemId}><span>{item.icon}</span><b>{fa(item.price)} 🪙</b></div>)}</div><Link href="/section/store">مشاهده فروشگاه ←</Link></article></section>
  </main>
}
