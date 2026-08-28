import Link from "next/link";
import { Icon, Mascot } from "../ui";
import styles from "./onboarding.module.css";

const slides = [
  {icon:"family" as const,title:"مدیریت خانواده در یک نگاه",text:"اعضا، تولدها، یادآورها، برنامه‌های مشترک و اتفاق‌های مهم خانواده همیشه جلوی چشم شماست."},
  {icon:"games" as const,title:"سرگرمی و بازی برای همه سنین",text:"چالش روزانه، کوئیز، دوئل و بازی‌های خانوادگی با امتیاز، سکه و جایزه‌های مشترک."},
  {icon:"ai" as const,title:"دستیار صوتی همیشه همراه شما",text:"تایپ کنید یا فارسی حرف بزنید؛ Family AI برای برنامه‌ریزی، یادآوری، خلاصه‌سازی و سرگرمی آماده است."},
];

export default function OnboardingPage(){
  return <main className={styles.page}>
    <div className={styles.stars}/>
    <header className={styles.brand}><span className={styles.badge}>Bale Mini App</span><h1>Family Bot</h1><p>دستیار هوشمند خانواده</p></header>
    <section className={styles.phoneStage}><Mascot/><span className={styles.orbit}/><span className={styles.glow}/></section>
    <section className={styles.slides}>
      {slides.map((item,index)=><article className={styles.card} key={item.title}>
        <span className={styles.number}>۰{index+1}</span><span className={styles.icon}><Icon name={item.icon} size={28}/></span>
        <h2>{item.title}</h2><p>{item.text}</p>
      </article>)}
    </section>
    <div className={styles.dots}><i/><i/><i className={styles.active}/></div>
    <Link className={styles.cta} href="/">شروع کنیم ✨</Link>
    <p className={styles.foot}>تجربه‌ای امن، صمیمی و هوشمند برای خانواده 💜</p>
  </main>
}
