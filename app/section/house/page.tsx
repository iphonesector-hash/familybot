"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { Icon, Mascot } from "../../ui";
import styles from "./house.module.css";

const decor = [
  ["🌳","درخت رویایی","LV.3","500"],
  ["⛲","فواره","LV.2","800"],
  ["🛋️","نیمکت قلبی","LV.1","600"],
  ["🏮","چراغ باغ","LV.2","450"],
  ["🌸","مجسمه گل","LV.1","700"],
  ["🎡","آلاچیق","LV.4","1200"],
] as const;

export default function HousePage(){
  const [selected,setSelected]=useState<(typeof decor)[number]>(decor[0]);
  const [toast,setToast]=useState("");
  const [levelBurst,setLevelBurst]=useState(false);
  const timer=useRef<ReturnType<typeof setTimeout>|null>(null);
  function notify(text:string){setToast(text);if(timer.current)clearTimeout(timer.current);timer.current=setTimeout(()=>setToast(""),2000)}
  function claimReward(){notify("۵۰ سکه به صندوق خانواده اضافه شد ✨");setLevelBurst(true);setTimeout(()=>setLevelBurst(false),1500)}

  return <main className={styles.page}>
    <div className={`motionToast${toast?" show":""}`}>{toast}</div>
    <div className={`levelBurst${levelBurst?" show":""}`}><div className="levelBurstCore"><div><b>+50 🪙</b><span>پاداش خانوادگی دریافت شد</span></div></div></div>
    <header className={styles.header}><Link href="/" className={styles.back}>←</Link><div><b>Family Bot</b><span>خانه خانواده</span></div><span className={styles.bot}><Mascot small mood={levelBurst?"celebrate":"love"}/></span></header>

    <section className={styles.stats}>
      <div><span className={styles.statIcon}><Icon name="spark"/></span><p>سطح خانواده</p><b>Lv. 7</b><i><em/></i></div>
      <div><span className={styles.coin}>●</span><p>سکه‌ها</p><b>2,450</b></div>
      <div><span className={styles.statIcon}><Icon name="trophy"/></span><p>امتیاز خانواده</p><b>18,760</b></div>
    </section>

    <section className={styles.sceneCard}>
      <div className={styles.sceneTitle}><div><p>خانه خانواده</p><span>خانه دنج · سطح 7</span></div><span className={styles.score}>18,760<br/><small>مجموع امتیازات</small></span></div>
      <div className={styles.sky}><i className={styles.starA}/><i className={styles.starB}/><i className={styles.starC}/></div>
      <div className={styles.land}>
        <span className={styles.tree}/><span className={styles.bushA}/><span className={styles.bushB}/><span className={styles.fence}/>
        <div className={styles.house}><span className={styles.chimney}/><span className={styles.roof}/><span className={styles.wall}><i/><i/><b>♥</b></span></div>
        <div className={styles.swing}>╱╲<b>━</b></div>
        <div className={styles.pet}><Mascot small mood="love"/></div>
        <button onClick={()=>notify(`${selected[1]} برای چیدمان انتخاب شد`)} aria-label={`قرار دادن ${selected[1]}`} style={{position:"absolute",left:"18%",bottom:"14%",zIndex:8,width:58,height:58,borderRadius:20,border:"1px solid rgba(255,255,255,.18)",background:"linear-gradient(145deg,rgba(86,55,170,.94),rgba(30,19,75,.94))",boxShadow:"0 14px 35px rgba(0,0,0,.28)",fontSize:28,cursor:"pointer"}}>{selected[0]}</button>
      </div>
      <div className={styles.decorRail}>{decor.map(item=><button key={item[1]} onClick={()=>{setSelected(item);notify(`${item[1]} انتخاب شد`)}} aria-pressed={selected[1]===item[1]} style={selected[1]===item[1]?{outline:"2px solid rgba(172,132,255,.8)",transform:"translateY(-3px)"}:undefined}><span>{item[0]}</span><b>{item[2]}</b></button>)}</div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,padding:"11px 4px 0",fontSize:11,color:"#bdb2d5"}}><span>انتخاب فعلی: <b style={{color:"#fff"}}>{selected[1]}</b></span><button onClick={()=>notify(`${selected[1]} با قیمت ${selected[3]} سکه آماده خرید است`)} style={{border:0,borderRadius:12,padding:"8px 11px",background:"linear-gradient(145deg,#6946ff,#ae3bd7)",color:"white",cursor:"pointer"}}>خرید · {selected[3]} 🪙</button></div>
    </section>

    <section className={styles.challenge}><div><span>🎯 چالش امروز</span><h2>با خانواده ۱۵ دقیقه بازی کنید</h2><p>10 / 15</p><i><em/></i></div><div className={styles.challengeArt}>🎮⏱️</div><button className={styles.reward} onClick={claimReward} style={{border:0,cursor:"pointer"}}>+ 50 🪙</button></section>

    <section className={styles.dual}>
      <article><header><h2>ماموریت‌ها</h2><span>🎁</span></header><p>۳ کار خوب انجام دهید <b>+30 🪙</b></p><p>به یک نفر کمک کنید <b>+40 🪙</b></p><Link href="/section/tasks">مشاهده همه ←</Link></article>
      <article><header><h2>فروشگاه</h2><span><Icon name="store"/></span></header><div className={styles.shop}>{decor.slice(0,3).map(([icon,name,,price])=><div key={name}><span>{icon}</span><b>{price} 🪙</b></div>)}</div><Link href="/section/store">مشاهده فروشگاه ←</Link></article>
    </section>

    <section className={styles.badges}><h2>دستاوردها</h2><div>{[["💜","خانه‌ساز"],["🤖","خانواده شاد"],["⭐","همراه صمیمی"],["🎯","هدفمند"],["🤲","یار مهربان"],["🏆","قهرمان خانواده"]].map(([icon,label])=><span key={label}><b>{icon}</b><small>{label}</small></span>)}</div></section>
  </main>
}
