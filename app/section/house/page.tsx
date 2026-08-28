import Link from "next/link";
import { Icon, Mascot } from "../../ui";
import styles from "./house.module.css";

const decor = [
  ["🌳","درخت رویایی","LV.3","500"],
  ["⛲","فواره","LV.2","800"],
  ["🛋️","نیمکت قلبی","LV.1","600"],
  ["🏮","چراغ باغ","LV.2","450"],
  ["🌸","مجسمه گل","LV.1","700"],
  ["🎡","آلاچیق","LV.4","1200"],
];

export default function HousePage(){
  return <main className={styles.page}>
    <header className={styles.header}><Link href="/" className={styles.back}>←</Link><div><b>Family Bot</b><span>خانه خانواده</span></div><span className={styles.bot}><Mascot small/></span></header>

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
        <div className={styles.pet}><Mascot small/></div>
      </div>
      <div className={styles.decorRail}>{decor.map(([icon,name,level])=><button key={name}><span>{icon}</span><b>{level}</b></button>)}</div>
    </section>

    <section className={styles.challenge}><div><span>🎯 چالش امروز</span><h2>با خانواده ۱۵ دقیقه بازی کنید</h2><p>10 / 15</p><i><em/></i></div><div className={styles.challengeArt}>🎮⏱️</div><b className={styles.reward}>+ 50 🪙</b></section>

    <section className={styles.dual}>
      <article><header><h2>ماموریت‌ها</h2><span>🎁</span></header><p>۳ کار خوب انجام دهید <b>+30 🪙</b></p><p>به یک نفر کمک کنید <b>+40 🪙</b></p><Link href="/section/tasks">مشاهده همه ←</Link></article>
      <article><header><h2>فروشگاه</h2><span><Icon name="store"/></span></header><div className={styles.shop}>{decor.slice(0,3).map(([icon,name,,price])=><div key={name}><span>{icon}</span><b>{price} 🪙</b></div>)}</div><Link href="/section/store">مشاهده فروشگاه ←</Link></article>
    </section>

    <section className={styles.badges}><h2>دستاوردها</h2><div>{[["💜","خانه‌ساز"],["🤖","خانواده شاد"],["⭐","همراه صمیمی"],["🎯","هدفمند"],["🤲","یار مهربان"],["🏆","قهرمان خانواده"]].map(([icon,label])=><span key={label}><b>{icon}</b><small>{label}</small></span>)}</div></section>
  </main>
}
