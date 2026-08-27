import { notFound } from "next/navigation";

const sections: Record<string, { icon: string; title: string; subtitle: string; items: Array<[string,string,string]> }> = {
  family: { icon: "👨‍👩‍👧‍👦", title: "خانواده", subtitle: "اعضا، نسبت‌ها و شجره‌نامه خانواده بزرگ جهانی", items: [["🌳","شجره‌نامه","نمایش گراف ارتباط اعضا و نسبت‌ها"],["🎂","تولدها","تولدهای نزدیک و یادآوری خودکار"],["💜","پروفایل اعضا","لقب، بیو، XP، سکه و افتخارات"],["🔎","جستجوی خانواده","پیدا کردن سریع اعضا و اطلاعات مجاز"]] },
  games: { icon: "🎮", title: "مرکز بازی", subtitle: "بازی‌های کوتاه، رقابت گروهی و چالش‌های روزانه", items: [["🧠","کوئیز خانوادگی","سؤال‌های شخصی‌سازی‌شده و چندگزینه‌ای"],["⚔️","دوئل","رقابت مستقیم دو عضو"],["🕵️","جاسوس","بازی گروهی دورهمی"],["🏁","مسابقه سرعت","اولین پاسخ صحیح برنده می‌شود"]] },
  occasions: { icon: "🎂", title: "مناسبت‌ها", subtitle: "تولد، سالگرد، دورهمی و رویدادهای خانوادگی", items: [["📅","تقویم مشترک","رویدادهای همه اعضا در یکجا"],["🎁","هدیه مخفی","قرعه‌کشی Secret Gift"],["🥳","جشن خودکار","تم و رویداد ویژه روز تولد"],["🔔","یادآوری","اعلان قبل از رویدادها"]] },
  memories: { icon: "📸", title: "خاطرات", subtitle: "آلبوم خصوصی و تایم‌لاین لحظه‌های خانواده", items: [["🖼️","آلبوم‌ها","دسته‌بندی بر اساس سفر و مناسبت"],["🕰️","تایم‌لاین","مرور خاطرات بر اساس زمان"],["🏷️","برچسب‌ها","جستجو با نام، تاریخ و موضوع"],["✨","خاطره امروز","نمایش خودکار خاطرات قدیمی"]] },
  tasks: { icon: "✅", title: "کارهای خانواده", subtitle: "تقسیم کار، لیست خرید و برنامه‌های مشترک", items: [["🛒","لیست خرید","افزودن و تیک‌زدن مشترک"],["📌","وظایف","مسئول، مهلت و وضعیت انجام"],["🪙","پاداش","Family Coin برای انجام ماموریت‌ها"],["🧾","تقسیم هزینه","ثبت هزینه و سهم هر نفر"]] },
  leaderboard: { icon: "🏆", title: "رتبه‌بندی", subtitle: "پیشرفت، افتخارها و فعالیت سالم اعضا", items: [["⭐","XP و Level","پیشرفت فردی بدون تشویق اسپم"],["🪙","Family Coin","اقتصاد سرگرمی داخل خانواده"],["🏅","Achievement","نشان‌های مناسبتی و فعالیتی"],["🔥","Streak","پیوستگی در ماموریت و مشارکت"]] },
  house: { icon: "🏡", title: "Family House", subtitle: "خانه مشترکی که با فعالیت خانواده رشد می‌کند", items: [["🌱","باغچه","آیتم‌های قابل ارتقا"],["🛋️","دکور","شخصی‌سازی با سکه"],["🐾","Family Pet","همراه مجازی مشترک خانواده"],["🏰","ارتقای خانه","پیشرفت مشترک همه اعضا"]] },
  store: { icon: "🛍️", title: "فروشگاه", subtitle: "آیتم‌های تزئینی و کلکسیونی Family Bot", items: [["🖼️","فریم پروفایل","ظاهر اختصاصی پروفایل"],["🏷️","لقب","عنوان‌های ویژه و مناسبتی"],["🎨","تم","ظاهر شخصی Mini App"],["🎁","هدیه","ارسال آیتم به اعضای دیگر"]] },
};

export default async function SectionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const section = sections[slug];
  if (!section) notFound();
  return (
    <main className="shell">
      <div className="stars" />
      <header className="topbar">
        <a href="/" className="brandMark" style={{textDecoration:"none",color:"white"}}>←</a>
        <div style={{textAlign:"center"}}><h1 style={{margin:0,fontSize:23}}>{section.icon} {section.title}</h1><p style={{margin:"5px 0 0",fontSize:12,color:"#aaa2c5"}}>Family Bot</p></div>
        <div className="avatar">💜</div>
      </header>
      <section className="hero">
        <span className="pill">🌍 خانواده بزرگ جهانی</span>
        <h2 style={{marginBottom:8}}>{section.title}</h2>
        <p>{section.subtitle}</p>
      </section>
      <div className="sectionTitle"><h3>امکانات</h3><span>نسخه پایه</span></div>
      <section className="grid">
        {section.items.map(([icon,title,text]) => <article className="card" key={title}><div className="icon">{icon}</div><h4>{title}</h4><p>{text}</p></article>)}
      </section>
    </main>
  );
}
