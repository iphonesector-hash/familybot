const cards = [
  ["👨‍👩‍👧‍👦", "خانواده", "اعضا، نسبت‌ها و شجره‌نامه", "/section/family"],
  ["🎮", "بازی‌ها", "چالش، دوئل و مسابقه خانوادگی", "/section/games"],
  ["🎂", "مناسبت‌ها", "تولدها، سالگردها و یادآوری‌ها", "/section/occasions"],
  ["📸", "خاطرات", "آلبوم و تایم‌لاین خانواده", "/section/memories"],
  ["✅", "کارها", "تقسیم وظایف و برنامه‌های مشترک", "/section/tasks"],
  ["🏆", "رتبه‌بندی", "XP، سکه، مدال و افتخارات", "/section/leaderboard"],
];

export default function HomePage() {
  return (
    <main className="shell">
      <div className="stars" />
      <header className="topbar">
        <div className="brand">
          <img src="/brand/familybot-mark.svg" alt="Family Bot" className="brandMark" />
          <div><h1>Family Bot</h1><p>خانواده بزرگ جهانی 🌍</p></div>
        </div>
        <div className="avatar">👤</div>
      </header>

      <section className="hero">
        <div className="heroGrid">
          <div>
            <span className="pill">✨ خانه هوشمند خانواده</span>
            <h2>سلام خانواده! 👋</h2>
            <p>مدیریت، سرگرمی، خاطره‌سازی و هوش مصنوعی؛ همه در یک خانه دیجیتال گرم و امن برای خانواده بزرگ جهانی.</p>
            <div className="stats">
              <div className="stat"><b>48</b><span>عضو</span></div>
              <div className="stat"><b>7</b><span>سطح خانواده</span></div>
              <div className="stat"><b>18,760</b><span>امتیاز</span></div>
            </div>
          </div>
          <div className="mascot"><img src="/brand/familybot-mark.svg" alt="ربات Family Bot" style={{width:160,height:160,filter:"drop-shadow(0 0 30px rgba(94,78,255,.5))"}} /></div>
        </div>
      </section>

      <div className="sectionTitle"><h3>خانه خانواده</h3><span>همه امکانات</span></div>
      <section className="grid">
        {cards.map(([icon, title, text, href]) => (
          <a href={href} className="card" key={title} style={{textDecoration:"none",color:"inherit"}}>
            <div className="icon">{icon}</div><h4>{title}</h4><p>{text}</p>
          </a>
        ))}
      </section>

      <div className="sectionTitle"><h3>هوش مصنوعی خانواده</h3><span>متنی + صوتی</span></div>
      <a href="/ai" className="aiCard" style={{textDecoration:"none",color:"white"}}>
        <div><h3>با من حرف بزن 🤖</h3><p>سؤال بپرس، برنامه خانوادگی بچین، یادآوری بساز یا خلاصه گروه را بخواه.</p></div>
        <div className="mic">🎙️</div>
      </a>

      <div className="sectionTitle"><h3>پیشنهادهای سریع</h3><span>Family AI</span></div>
      <div className="chipRow"><span className="chip">🎂 تولدهای نزدیک</span><span className="chip">🗓️ برنامه جمعه</span><span className="chip">🧠 کوئیز خانوادگی</span><span className="chip">📌 خلاصه امروز</span></div>

      <div className="sectionTitle"><h3>Family House</h3><a href="/section/house" style={{color:"#a99cff",fontSize:12,textDecoration:"none"}}>Level 7 ←</a></div>
      <a href="/section/house" className="familyHouse" style={{display:"block",textDecoration:"none",color:"inherit"}}>
        <div className="houseScene">🏡</div><div className="progress"><i /></div><p style={{color:"#b8afd5",fontSize:12,marginBottom:0}}>720 / 1200 XP تا ارتقای خانه</p>
      </a>

      <nav className="nav"><div className="navInner">
        <a className="navItem active" href="/"><b>⌂</b><span>خانه</span></a>
        <a className="navItem" href="/section/family"><b>♧</b><span>خانواده</span></a>
        <a className="navItem" href="/section/games"><b>🎮</b><span>بازی</span></a>
        <a className="navItem" href="/ai"><b>🤖</b><span>AI</span></a>
        <a className="navItem" href="/section/leaderboard"><b>◉</b><span>پروفایل</span></a>
      </div></nav>
    </main>
  );
}
