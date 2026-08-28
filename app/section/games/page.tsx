import Link from "next/link";
import { Icon, Mascot } from "../../ui";
import styles from "./games.module.css";

const games = [
  ["🧠","حدس کلمه","برای همه","+80 XP"],
  ["🕵️","جاسوس","گروهی","+120 XP"],
  ["⚔️","دوئل","دو نفره","+90 XP"],
  ["🏁","مسابقه سرعت","گروهی","+100 XP"],
  ["🎯","کوئیز خانوادگی","برای همه","+75 XP"],
  ["🎲","شانس امروز","تک‌نفره","جایزه ویژه"],
];

export default function GamesPage(){
  return <main className={styles.page}>
    <header className={styles.header}><Link href="/" className={styles.back}>←</Link><div><h1>مرکز بازی</h1><p>بازی، رقابت و جایزه خانوادگی</p></div><Link href="/section/leaderboard" className={styles.trophy}><Icon name="trophy"/></Link></header>

    <section className={styles.hero}><div><span className={styles.pill}><Icon name="games" size={15}/> چالش ویژه امروز</span><h2>حدس کلمه خانوادگی</h2><p>با پاسخ درست، برای خودت XP بگیر و امتیاز Family House رو بالا ببر.</p><button>شروع بازی</button></div><div className={styles.heroArt}><Mascot small/><span>?</span><i>ABC</i></div></section>

    <section className={styles.quickStats}><div><Icon name="coins"/><b>2,450</b><span>سکه</span></div><div><Icon name="trophy"/><b>#2</b><span>رتبه ماه</span></div><div><Icon name="spark"/><b>7</b><span>برد متوالی</span></div></section>

    <div className={styles.title}><h2>بازی‌های محبوب</h2><span>۶ بازی</span></div>
    <section className={styles.gameGrid}>{games.map(([icon,name,type,reward],index)=><button className={styles.game} key={name}><span className={styles.gameIcon}>{icon}</span><h3>{name}</h3><p>{type}</p><b>{reward}</b>{index===0&&<i>پیشنهادی</i>}</button>)}</section>

    <section className={styles.tournament}><div><span>🏆 مسابقه هفتگی</span><h2>قهرمان خانواده کیه؟</h2><p>تا پایان این هفته ۲ روز مونده</p><div className={styles.progress}><i/></div></div><div className={styles.podium}><span>🥈<b>سارا</b></span><span className={styles.first}>🥇<b>پیمان</b></span><span>🥉<b>علی</b></span></div></section>

    <section className={styles.rewards}><header><h2>جایزه روزانه</h2><span>🔥 ۵ روز متوالی</span></header><div>{["✓","✓","✓","✓","🪙","🎁","👑"].map((item,i)=><span className={i<4?styles.done:""} key={i}><b>{item}</b><small>روز {i+1}</small></span>)}</div></section>

    <nav className="bottomNav"><a href="/"><Icon name="home"/><span>خانه</span></a><a href="/section/family"><Icon name="family"/><span>خانواده</span></a><a className="active" href="/section/games"><Icon name="games"/><span>بازی‌ها</span></a><a href="/ai"><Icon name="ai"/><span>AI</span></a><a href="/section/leaderboard"><Icon name="profile"/><span>پروفایل</span></a></nav>
  </main>
}
