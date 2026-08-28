import Link from "next/link";
import { Icon, Mascot } from "../../ui";
import styles from "./family.module.css";

const members = [
  ["مادر","م","#ff8cb9"],["پدر","پ","#6aa8ff"],["نیما","ن","#8c7bff"],["سارا","س","#55d6cc"],["علی","ع","#ffb260"],["مریم","م","#c87cff"],
];

export default function FamilyPage(){
  return <main className={styles.page}>
    <header className={styles.header}><Link href="/" className={styles.back}>←</Link><div><h1>خانواده</h1><p>اعضا، نسبت‌ها و لحظه‌های مشترک</p></div><Link href="/ai" className={styles.ai}><Icon name="ai"/></Link></header>

    <section className={styles.hero}>
      <div><span className={styles.pill}><Icon name="family" size={15}/> خانواده ما</span><h2>۴۸ عضو کنار هم 💜</h2><p>پروفایل‌ها، تولدها، شجره‌نامه و برنامه‌های مشترک در یک جای امن و صمیمی.</p><Link href="/section/occasions">۲ تولد نزدیک داریم ←</Link></div><Mascot small/>
    </section>

    <section className={styles.memberStrip}>{members.map(([name,letter,color])=><button key={name}><span style={{background:`linear-gradient(145deg,${color},#4e3b89)`}}>{letter}</span><b>{name}</b></button>)}<button className={styles.add}><span>＋</span><b>افزودن</b></button></section>

    <section className={styles.grid}>
      <Link href="/section/family-tree" className={styles.card}><span className={styles.icon}><Icon name="tree"/></span><h3>شجره‌نامه</h3><p>نمایش تصویری نسبت‌ها و ارتباط اعضای خانواده</p><b>مشاهده درخت ←</b></Link>
      <Link href="/section/occasions" className={styles.card}><span className={styles.iconPink}><Icon name="birthday"/></span><h3>تولدها و مناسبت‌ها</h3><p>تقویم تولد، سالگرد و برنامه‌های مهم خانوادگی</p><b>تقویم خانواده ←</b></Link>
      <Link href="/section/memories" className={styles.card}><span className={styles.iconCyan}><Icon name="memories"/></span><h3>خاطرات خانواده</h3><p>آلبوم خصوصی، سفرها و تایم‌لاین لحظه‌های به‌یادماندنی</p><b>باز کردن خاطرات ←</b></Link>
      <Link href="/section/tasks" className={styles.card}><span className={styles.iconGold}><Icon name="tasks"/></span><h3>کارهای مشترک</h3><p>لیست خرید، وظایف، برنامه‌ها و تقسیم کار بین اعضا</p><b>مشاهده کارها ←</b></Link>
    </section>

    <section className={styles.activity}><header><div><h2>فعالیت خانواده</h2><p>این هفته</p></div><Icon name="poll"/></header><div className={styles.bars}>{[52,84,63,92,71,48,77].map((h,i)=><i key={i} style={{height:`${h}%`}}><span/></i>)}</div><footer><span>۳۴۲ پیام</span><span>۷ بازی</span><span>۱۲ خاطره</span></footer></section>

    <nav className="bottomNav"><a href="/"><Icon name="home"/><span>خانه</span></a><a className="active" href="/section/family"><Icon name="family"/><span>خانواده</span></a><a href="/section/games"><Icon name="games"/><span>بازی‌ها</span></a><a href="/ai"><Icon name="ai"/><span>AI</span></a><a href="/section/leaderboard"><Icon name="profile"/><span>پروفایل</span></a></nav>
  </main>
}
