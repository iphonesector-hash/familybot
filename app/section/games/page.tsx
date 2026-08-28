"use client";

import { useEffect,useState } from "react";
import Link from "next/link";
import { Icon, Mascot } from "../../ui";
import styles from "./games.module.css";

type Dashboard={profile?:{coins?:number;rank?:number|null;streak?:number;xp?:number;level?:number}|null;leaderboard?:Array<{display_name?:string|null;first_name?:string|null;xp?:number}>};
type Quiz={id:string;prompt:string;options:string[];reward_coins:number};
const fa=(n:number)=>new Intl.NumberFormat("fa-IR").format(n||0);

export default function GamesPage(){
  const[d,setD]=useState<Dashboard>({}),[notice,setNotice]=useState(""),[busy,setBusy]=useState(false),[quiz,setQuiz]=useState<Quiz|null>(null);
  async function api(action:string,extra:Record<string,unknown>={}){const session=sessionStorage.getItem("familybot.session");if(!session)throw new Error("Mini App را از داخل بله باز کن.");const r=await fetch("/api/family/game",{method:"POST",headers:{"content-type":"application/json",authorization:`Bearer ${session}`},body:JSON.stringify({action,...extra})});const x=await r.json();if(!r.ok||!x.ok)throw new Error(x.error||"game_failed");return x.result}
  async function play(action:string,extra:Record<string,unknown>={}){setBusy(true);setNotice("");try{const r=await api(action,extra);if(action==="dice")setNotice(`🎲 عدد تاس: ${fa(r.value)}`);if(action==="coin")setNotice(`🪙 نتیجه: ${r.side}`);if(action==="rps"){const names=["سنگ","کاغذ","قیچی"];setNotice(`تو: ${names[r.choice]} · ربات: ${names[r.bot]} — ${r.outcome==="win"?`بردی! +${fa(r.reward)} سکه 🎉`:r.outcome==="draw"?"مساوی شد 😄":"این دست ربات برد"}`)}if(action==="quiz.start")setQuiz(r);if(action==="speed.start")setNotice(`🏁 سؤال مسابقه داخل گروه بله ارسال شد؛ جایزه ${fa(r.reward)} سکه است.`)}catch(e){setNotice(e instanceof Error?e.message:"بازی اجرا نشد")}finally{setBusy(false)}}
  async function answer(index:number){if(!quiz)return;setBusy(true);try{const r=await api("quiz.answer",{sessionId:quiz.id,option:index});setNotice(r.correct?`✅ درست بود! +${fa(r.reward)} سکه`:`❌ جواب درست نبود`);setQuiz(null)}catch(e){setNotice(e instanceof Error?e.message:"ثبت جواب انجام نشد")}finally{setBusy(false)}}
  useEffect(()=>{const session=sessionStorage.getItem("familybot.session");if(!session)return;fetch("/api/family/dashboard",{headers:{authorization:`Bearer ${session}`},cache:"no-store"}).then(r=>r.json()).then(x=>{if(x.ok)setD(x.dashboard||{})}).catch(()=>undefined)},[]);
  const leaders=d.leaderboard||[],profile=d.profile;
  return <main className={styles.page}>
    <header className={styles.header}><Link href="/" className={styles.back}>←</Link><div><h1>مرکز بازی</h1><p>بازی، رقابت و جایزه خانوادگی</p></div><Link href="/section/leaderboard" className={styles.trophy}><Icon name="trophy"/></Link></header>
    <section className={styles.hero}><div><span className={styles.pill}><Icon name="games" size={15}/> بازی واقعی امروز</span><h2>کوئیز خانوادگی</h2><p>سؤال دو دقیقه اعتبار داره؛ جواب درست ۱۵ Family Coin و XP می‌ده.</p><button disabled={busy} onClick={()=>void play("quiz.start")}>شروع کوئیز</button></div><div className={styles.heroArt}><Mascot small/><span>?</span><i>QUIZ</i></div></section>
    {notice&&<div className="adminNotice" style={{marginTop:10}}>{notice}</div>}
    {quiz&&<section className="adminPanel premiumPanel" style={{marginTop:10}}><h2>{quiz.prompt}</h2><div style={{display:"grid",gap:8,marginTop:10}}>{quiz.options.map((o,i)=><button className="adminSave" disabled={busy} key={o} onClick={()=>void answer(i)}>{o}</button>)}</div><p style={{fontSize:10,opacity:.7}}>جایزه: {fa(quiz.reward_coins)} سکه · زمان پاسخ: ۲ دقیقه</p></section>}
    <section className={styles.quickStats}><div><Icon name="coins"/><b>{fa(profile?.coins||0)}</b><span>سکه واقعی</span></div><div><Icon name="trophy"/><b>{profile?.rank?`#${fa(profile.rank)}`:"—"}</b><span>رتبه خانواده</span></div><div><Icon name="spark"/><b>{fa(profile?.streak||0)}</b><span>Streak</span></div></section>
    <div className={styles.title}><h2>بازی‌های فوری</h2><span>۴ بازی فعال</span></div>
    <section className={styles.gameGrid}>
      <button className={styles.game} disabled={busy} onClick={()=>void play("quiz.start")}><span className={styles.gameIcon}>🧠</span><h3>کوئیز خانوادگی</h3><p>تک‌نفره · سؤال زمان‌دار</p><b>+۱۵ سکه · +۱۰ XP</b><i>فعال</i></button>
      <button className={styles.game} disabled={busy} onClick={()=>void play("dice")}><span className={styles.gameIcon}>🎲</span><h3>تاس</h3><p>تک‌نفره</p><b>+۱ XP برای بازی</b><i>فعال</i></button>
      <button className={styles.game} disabled={busy} onClick={()=>void play("coin")}><span className={styles.gameIcon}>🪙</span><h3>شیر یا خط</h3><p>تک‌نفره</p><b>+۱ XP برای بازی</b><i>فعال</i></button>
      <article className={styles.game}><span className={styles.gameIcon}>✊</span><h3>سنگ کاغذ قیچی</h3><p>یک انتخاب بزن</p><div style={{display:"flex",gap:5,marginTop:10}}>{["سنگ","کاغذ","قیچی"].map((v,i)=><button key={v} disabled={busy} onClick={()=>void play("rps",{choice:i})}>{v}</button>)}</div><b>برد: +۵ سکه · +۳ XP</b><i>فعال</i></article>
    </section>
    <div className={styles.title}><h2>بازی‌های گروهی</h2><span>۴ بازی فعال</span></div>
    <section className={styles.gameGrid}>
      <Link href="/section/community" className={styles.game}><span className={styles.gameIcon}>⚔️</span><h3>دوئل خانوادگی</h3><p>دو نفره · انتخاب همزمان سنگ/کاغذ/قیچی</p><b>جایزه واقعی Family Coin</b><i>فعال</i></Link>
      <Link href="/section/multiplayer" className={styles.game}><span className={styles.gameIcon}>🕵️</span><h3>جاسوس</h3><p>لابی واقعی · حداقل ۳ بازیکن</p><b>نقش خصوصی برای هر عضو</b><i>فعال</i></Link>
      <button className={styles.game} disabled={busy} onClick={()=>void play("speed.start")}><span className={styles.gameIcon}>🏁</span><h3>مسابقه سرعت</h3><p>سؤال به گروه بله ارسال می‌شه</p><b>اولین جواب درست: +۲۰ سکه</b><i>فعال</i></button>
      <Link href="/section/multiplayer" className={styles.game}><span className={styles.gameIcon}>📝</span><h3>اسم‌فامیل</h3><p>لابی واقعی · حرف تصادفی · ۹۰ ثانیه</p><b>امتیاز و جایزه واقعی</b><i>فعال</i></Link>
      {[["🎭","مافیا Lite"],["❓","۲۰ سؤال"]].map(([icon,name])=><article className={styles.game} key={name}><span className={styles.gameIcon}>{icon}</span><h3>{name}</h3><p>گروهی · موتور مستقل لازم دارد</p><b>در حال توسعه</b></article>)}
    </section>
    <section className={styles.tournament}><div><span>🏆 رتبه‌بندی زنده</span><h2>قهرمان‌های خانواده</h2><p>بر اساس XP واقعی اعضا</p><div className={styles.progress}><i style={{width:`${Math.min(100,Number(profile?.xp||0)/5)}%`}}/></div></div><div className={styles.podium}>{leaders.slice(0,3).map((m,i)=><span className={i===0?styles.first:""} key={i}>{i===0?"🥇":i===1?"🥈":"🥉"}<b>{m.display_name||m.first_name||"عضو"}</b></span>)}</div></section>
    <section className={styles.rewards}><header><h2>جایزه روزانه</h2><span>Streak: {fa(profile?.streak||0)} روز</span></header><p style={{fontSize:10,color:"#a99fba"}}>جایزه روزانه واقعی از منوی ربات یا صفحه پروفایل قابل دریافت است.</p></section>
    <nav className="bottomNav"><a href="/"><Icon name="home"/><span>خانه</span></a><a href="/section/family"><Icon name="family"/><span>خانواده</span></a><a className="active" href="/section/games"><Icon name="games"/><span>بازی‌ها</span></a><a href="/ai"><Icon name="ai"/><span>AI</span></a><a href="/section/leaderboard"><Icon name="profile"/><span>پروفایل</span></a></nav>
  </main>
}
