import { notFound } from "next/navigation";
import { Icon, IconName, IconOrb, Mascot } from "../../ui";

type Tone = "violet" | "blue" | "pink" | "gold" | "cyan";
type Item = { icon: IconName; title: string; text: string; tone: Tone };
type Section = { icon: IconName; title: string; subtitle: string; items: Item[] };

const sections: Record<string, Section> = {
  family: { icon: "family", title: "خانواده", subtitle: "اعضا، نسبت‌ها و شجره‌نامه خانواده در یک نمای گرم و ساده", items: [
    { icon: "tree", title: "شجره‌نامه", text: "نمایش ارتباط اعضا و نسبت‌ها", tone: "violet" },
    { icon: "birthday", title: "تولدها", text: "تولدهای نزدیک و یادآوری خودکار", tone: "pink" },
    { icon: "profile", title: "پروفایل اعضا", text: "لقب، بیو، XP، سکه و افتخارات", tone: "blue" },
    { icon: "shield", title: "حریم خصوصی", text: "کنترل دسترسی اطلاعات خانوادگی", tone: "cyan" },
  ]},
  games: { icon: "games", title: "مرکز بازی", subtitle: "بازی‌های کوتاه، رقابت گروهی و چالش‌های روزانه", items: [
    { icon: "spark", title: "کوئیز خانوادگی", text: "سؤال‌های شخصی‌سازی‌شده و چندگزینه‌ای", tone: "violet" },
    { icon: "trophy", title: "دوئل", text: "رقابت مستقیم دو عضو", tone: "gold" },
    { icon: "ai", title: "جاسوس", text: "بازی گروهی مناسب دورهمی", tone: "blue" },
    { icon: "games", title: "مسابقه سرعت", text: "اولین پاسخ صحیح برنده می‌شود", tone: "pink" },
  ]},
  occasions: { icon: "birthday", title: "مناسبت‌ها", subtitle: "تولد، سالگرد، دورهمی و رویدادهای خانوادگی", items: [
    { icon: "calendar", title: "تقویم مشترک", text: "رویدادهای همه اعضا در یکجا", tone: "blue" },
    { icon: "gift", title: "هدیه مخفی", text: "قرعه‌کشی Secret Gift", tone: "pink" },
    { icon: "spark", title: "جشن خودکار", text: "تم و رویداد ویژه روز تولد", tone: "gold" },
    { icon: "reminder", title: "یادآوری", text: "اعلان قبل از رویدادها", tone: "violet" },
  ]},
  memories: { icon: "memories", title: "خاطرات", subtitle: "آلبوم خصوصی و تایم‌لاین لحظه‌های خانواده", items: [
    { icon: "memories", title: "آلبوم‌ها", text: "دسته‌بندی بر اساس سفر و مناسبت", tone: "cyan" },
    { icon: "calendar", title: "تایم‌لاین", text: "مرور خاطرات بر اساس زمان", tone: "violet" },
    { icon: "spark", title: "برچسب‌ها", text: "جستجو با نام، تاریخ و موضوع", tone: "pink" },
    { icon: "gift", title: "خاطره امروز", text: "نمایش خودکار خاطرات قدیمی", tone: "gold" },
  ]},
  tasks: { icon: "tasks", title: "کارهای خانواده", subtitle: "تقسیم کار، لیست خرید و برنامه‌های مشترک", items: [
    { icon: "tasks", title: "لیست خرید", text: "افزودن و تیک‌زدن مشترک", tone: "cyan" },
    { icon: "calendar", title: "وظایف", text: "مسئول، مهلت و وضعیت انجام", tone: "blue" },
    { icon: "coins", title: "پاداش", text: "Family Coin برای انجام ماموریت‌ها", tone: "gold" },
    { icon: "poll", title: "تقسیم هزینه", text: "ثبت هزینه و سهم هر نفر", tone: "pink" },
  ]},
  leaderboard: { icon: "trophy", title: "رتبه‌بندی", subtitle: "پیشرفت، افتخارها و فعالیت سالم اعضا", items: [
    { icon: "spark", title: "XP و Level", text: "پیشرفت فردی بدون تشویق اسپم", tone: "violet" },
    { icon: "coins", title: "Family Coin", text: "اقتصاد سرگرمی داخل خانواده", tone: "gold" },
    { icon: "trophy", title: "Achievement", text: "نشان‌های مناسبتی و فعالیتی", tone: "pink" },
    { icon: "calendar", title: "Streak", text: "پیوستگی در ماموریت و مشارکت", tone: "blue" },
  ]},
  house: { icon: "home", title: "Family House", subtitle: "خانه مشترکی که با فعالیت خانواده رشد می‌کند", items: [
    { icon: "tree", title: "باغچه", text: "آیتم‌های قابل ارتقا", tone: "cyan" },
    { icon: "store", title: "دکور", text: "شخصی‌سازی با سکه", tone: "pink" },
    { icon: "ai", title: "Family Pet", text: "همراه مجازی مشترک خانواده", tone: "violet" },
    { icon: "home", title: "ارتقای خانه", text: "پیشرفت مشترک همه اعضا", tone: "gold" },
  ]},
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

  return <main className="appShell">
    <div className="ambient ambientA"/><div className="starField"/>
    <header className="appHeader">
      <a className="roundButton" href="/" aria-label="بازگشت">←</a>
      <div className="wordmark"><b style={{fontSize:22}}>{section.title}</b><span>Family Bot</span></div>
      <span className="profileAvatar"><Icon name={section.icon}/></span>
    </header>

    <section className="homeHero premiumPanel" style={{minHeight:250}}>
      <div className="homeHeroCopy">
        <span className="eyebrow"><Icon name={section.icon} size={15}/> خانه خانواده</span>
        <h1>{section.title}</h1>
        <p style={{lineHeight:1.9,maxWidth:290}}>{section.subtitle}</p>
      </div>
      <Mascot small/>
    </section>

    <div className="quickTitle"><h3>امکانات</h3><span style={{fontSize:11,color:"#8f85a9"}}>نسخه پایه</span></div>
    <section className="dashboardGrid">
      {section.items.map(item => <article className="dashboardCard" key={item.title}>
        <IconOrb name={item.icon} tone={item.tone}/>
        <div><h2>{item.title}</h2><p>{item.text}</p></div>
      </article>)}
    </section>
  </main>;
}
