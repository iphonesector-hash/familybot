import { notFound } from "next/navigation";
import { Icon, IconName, IconOrb, Mascot } from "../../ui";
import LiveSection from "./LiveSection";

type Tone = "violet" | "blue" | "pink" | "gold" | "cyan";
type Item = { icon: IconName; title: string; text: string; tone: Tone };
type Section = { icon: IconName; title: string; subtitle: string; items: Item[] };

const liveSlugs = new Set(["family","occasions","tasks","leaderboard","house"]);
const sections: Record<string, Section> = {
  family: { icon: "family", title: "خانواده", subtitle: "اعضا، نسبت‌ها و شجره‌نامه خانواده در یک نمای گرم و ساده", items: [] },
  games: { icon: "games", title: "مرکز بازی", subtitle: "بازی‌های کوتاه، رقابت گروهی و چالش‌های روزانه", items: [
    { icon: "spark", title: "کوئیز خانوادگی", text: "سؤال‌های شخصی‌سازی‌شده و چندگزینه‌ای", tone: "violet" },
    { icon: "trophy", title: "دوئل", text: "رقابت مستقیم دو عضو", tone: "gold" },
    { icon: "ai", title: "جاسوس", text: "بازی گروهی مناسب دورهمی", tone: "blue" },
    { icon: "games", title: "مسابقه سرعت", text: "اولین پاسخ صحیح برنده می‌شود", tone: "pink" },
  ]},
  occasions: { icon: "birthday", title: "مناسبت‌ها", subtitle: "تولد، سالگرد، دورهمی و رویدادهای خانوادگی", items: [] },
  memories: { icon: "memories", title: "خاطرات", subtitle: "آلبوم خصوصی و تایم‌لاین لحظه‌های خانواده", items: [
    { icon: "memories", title: "آلبوم‌ها", text: "دسته‌بندی بر اساس سفر و مناسبت", tone: "cyan" },
    { icon: "calendar", title: "تایم‌لاین", text: "مرور خاطرات بر اساس زمان", tone: "violet" },
    { icon: "spark", title: "برچسب‌ها", text: "جستجو با نام، تاریخ و موضوع", tone: "pink" },
    { icon: "gift", title: "خاطره امروز", text: "نمایش خودکار خاطرات قدیمی", tone: "gold" },
  ]},
  tasks: { icon: "tasks", title: "کارهای خانواده", subtitle: "تقسیم کار، لیست خرید و برنامه‌های مشترک", items: [] },
  leaderboard: { icon: "trophy", title: "رتبه‌بندی", subtitle: "پیشرفت، افتخارها و فعالیت سالم اعضا", items: [] },
  house: { icon: "home", title: "Family House", subtitle: "خانه مشترکی که با فعالیت خانواده رشد می‌کند", items: [] },
  store: { icon: "store", title: "فروشگاه", subtitle: "آیتم‌های تزئینی و کلکسیونی Family Bot", items: [
    { icon: "profile", title: "فریم پروفایل", text: "ظاهر اختصاصی پروفایل", tone: "blue" },
    { icon: "spark", title: "لقب", text: "عنوان‌های ویژه و مناسبتی", tone: "violet" },
    { icon: "memories", title: "تم", text: "ظاهر شخصی Mini App", tone: "pink" },
    { icon: "gift", title: "هدیه", text: "ارسال آیتم به اعضای دیگر", tone: "gold" },
  ]},
};

export default async function SectionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const section = sections[slug];
  if (!section) notFound();
  if (liveSlugs.has(slug)) return <LiveSection slug={slug}/>;

  return <main className="appShell">
    <div className="ambient ambientA"/><div className="starField"/>
    <header className="appHeader">
      <a className="roundButton" href="/" aria-label="بازگشت">←</a>
      <div className="wordmark"><b style={{fontSize:22}}>{section.title}</b><span>Family Bot</span></div>
      <span className="profileAvatar"><Icon name={section.icon}/></span>
    </header>
    <section className="homeHero premiumPanel" style={{minHeight:250}}>
      <div className="homeHeroCopy"><span className="eyebrow"><Icon name={section.icon} size={15}/> خانه خانواده</span><h1>{section.title}</h1><p style={{lineHeight:1.9,maxWidth:290}}>{section.subtitle}</p></div><Mascot small/>
    </section>
    <div className="quickTitle"><h3>امکانات</h3><span style={{fontSize:11,color:"#8f85a9"}}>نسخه پایه</span></div>
    <section className="dashboardGrid">{section.items.map(item => <article className="dashboardCard" key={item.title}><IconOrb name={item.icon} tone={item.tone}/><div><h2>{item.title}</h2><p>{item.text}</p></div></article>)}</section>
  </main>;
}
