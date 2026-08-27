"use client";

import { useState } from "react";

const cards = [
  ["👨‍👩‍👧‍👦", "خانواده", "اعضا، نسبت‌ها و شجره‌نامه"],
  ["🎮", "بازی‌ها", "چالش، دوئل و مسابقه خانوادگی"],
  ["🎂", "مناسبت‌ها", "تولدها، سالگردها و یادآوری‌ها"],
  ["📸", "خاطرات", "آلبوم و تایم‌لاین خانواده"],
  ["✅", "کارها", "تقسیم وظایف و برنامه‌های مشترک"],
  ["🏆", "رتبه‌بندی", "XP، سکه، مدال و افتخارات"],
];

export default function HomePage() {
  const [active, setActive] = useState("خانه");

  return (
    <main className="shell">
      <div className="stars" />
      <header className="topbar">
        <div className="brand">
          <div className="brandMark">💜</div>
          <div>
            <h1>Family Bot</h1>
            <p>خانواده بزرگ جهانی 🌍</p>
          </div>
        </div>
        <div className="avatar">👤</div>
      </header>

      <section className="hero">
        <div className="heroGrid">
          <div>
            <span className="pill">✨ خانه هوشمند خانواده</span>
            <h2>سلام خانواده! 👋</h2>
            <p>
              مدیریت، سرگرمی، خاطره‌سازی و هوش مصنوعی؛ همه در یک خانه دیجیتال گرم و امن برای خانواده بزرگ جهانی.
            </p>
            <div className="stats">
              <div className="stat"><b>48</b><span>عضو</span></div>
              <div className="stat"><b>7</b><span>سطح خانواده</span></div>
              <div className="stat"><b>18,760</b><span>امتیاز</span></div>
            </div>
          </div>
          <div className="mascot" aria-label="Family Bot mascot">
            <div className="roof" />
            <div className="heart">♥</div>
            <div className="orb" />
            <div className="wave" />
          </div>
        </div>
      </section>

      <div className="sectionTitle"><h3>خانه خانواده</h3><span>همه امکانات</span></div>
      <section className="grid">
        {cards.map(([icon, title, text]) => (
          <article className="card" key={title}>
            <div className="icon">{icon}</div>
            <h4>{title}</h4>
            <p>{text}</p>
          </article>
        ))}
      </section>

      <div className="sectionTitle"><h3>هوش مصنوعی خانواده</h3><span>متنی + صوتی</span></div>
      <section className="aiCard">
        <div>
          <h3>با من حرف بزن 🤖</h3>
          <p>سؤال بپرس، برنامه خانوادگی بچین، یادآوری بساز یا خلاصه گروه را بخواه.</p>
        </div>
        <div className="mic">🎙️</div>
      </section>

      <div className="sectionTitle"><h3>پیشنهادهای سریع</h3><span>Family AI</span></div>
      <div className="chipRow">
        <span className="chip">🎂 تولدهای نزدیک</span>
        <span className="chip">🗓️ برنامه جمعه</span>
        <span className="chip">🧠 کوئیز خانوادگی</span>
        <span className="chip">📌 خلاصه امروز</span>
      </div>

      <div className="sectionTitle"><h3>Family House</h3><span>Level 7</span></div>
      <section className="familyHouse">
        <div className="houseScene">🏡</div>
        <div className="progress"><i /></div>
        <p style={{ color: "#b8afd5", fontSize: 12, marginBottom: 0 }}>720 / 1200 XP تا ارتقای خانه</p>
      </section>

      <nav className="nav">
        <div className="navInner">
          {["خانه", "خانواده", "بازی", "AI", "پروفایل"].map((item, i) => (
            <button
              key={item}
              className={`navItem ${active === item ? "active" : ""}`}
              onClick={() => setActive(item)}
              style={{ background: "none", border: 0, font: "inherit" }}
            >
              <b>{["⌂", "♧", "🎮", "🤖", "◉"][i]}</b>
              <span>{item}</span>
            </button>
          ))}
        </div>
      </nav>
    </main>
  );
}
