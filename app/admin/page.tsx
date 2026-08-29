"use client";

import { useEffect, useState } from "react";
import { Icon, Mascot } from "../ui";
import AdminModerationPanel from "./AdminModerationPanel";
import OwnerGiftShortcut from "./OwnerGiftShortcut";
import { adminHeaders, bootstrapAdminSession, clearAdminSession } from "./adminClientSession";

type Settings = {
  anti_flood: boolean;
  anti_link: boolean;
  lock_photo: boolean;
  lock_video: boolean;
  lock_document: boolean;
  lock_forward: boolean;
  lock_sticker: boolean;
  lock_gif: boolean;
  lock_voice: boolean;
  lock_audio: boolean;
  lock_text: boolean;
  flood_limit: number;
  flood_window_seconds: number;
  flood_mute_minutes: number;
  warn_limit: number;
  welcome_enabled: boolean;
  welcome_message: string;
  filtered_words: string[];
  new_member_restrict_minutes: number;
  timezone: string;
  task_reminders_enabled: boolean;
  event_reminders_enabled: boolean;
  birthday_reminders_enabled: boolean;
  task_reminder_minutes: number;
  event_reminder_minutes: number;
  birthday_hour: number;
};

type LogRow = { id: string; action: string; reason: string | null; created_at: string };
type Stats = { members: number; activeWarnings: number; moderation24h: number; activity24h: number; deleted24h: number };
type WhiteRow = { bale_user_id: number; label: string | null };

const fallback: Settings = {
  anti_flood: true,
  anti_link: false,
  lock_photo: false,
  lock_video: false,
  lock_document: false,
  lock_forward: false,
  lock_sticker: false,
  lock_gif: false,
  lock_voice: false,
  lock_audio: false,
  lock_text: false,
  flood_limit: 5,
  flood_window_seconds: 5,
  flood_mute_minutes: 10,
  warn_limit: 3,
  welcome_enabled: true,
  welcome_message: "💜 {name} خوش اومدی!",
  filtered_words: [],
  new_member_restrict_minutes: 0,
  timezone: "Asia/Tehran",
  task_reminders_enabled: true,
  event_reminders_enabled: true,
  birthday_reminders_enabled: true,
  task_reminder_minutes: 60,
  event_reminder_minutes: 60,
  birthday_hour: 9,
};

const labels: Record<string, string> = {
  warn: "اخطار",
  auto_mute: "سکوت خودکار",
  anti_flood_mute: "ضداسپم",
  ban: "مسدود",
  unban: "رفع مسدودی",
  mute: "سکوت",
  pin: "پین",
  content_lock: "قفل محتوا",
  unwarn: "پاک‌کردن اخطار",
  anti_link_delete: "حذف لینک",
  filtered_word: "کلمه فیلترشده",
  new_member_guard: "محدودیت عضو تازه",
};

const toggles: Array<[keyof Settings, string, string]> = [
  ["anti_flood", "ضد اسپم", "ارسال سریع را محدود می‌کند"],
  ["anti_link", "قفل لینک", "لینک اعضای عادی حذف می‌شود"],
  ["lock_photo", "قفل عکس", "ارسال عکس محدود می‌شود"],
  ["lock_video", "قفل ویدیو", "ارسال ویدیو محدود می‌شود"],
  ["lock_document", "قفل فایل", "ارسال فایل محدود می‌شود"],
  ["lock_forward", "قفل فوروارد", "فوروارد محدود می‌شود"],
  ["lock_sticker", "قفل استیکر", "استیکر محدود می‌شود"],
  ["lock_gif", "قفل GIF", "GIF محدود می‌شود"],
  ["lock_voice", "قفل ویس", "ویس محدود می‌شود"],
  ["lock_audio", "قفل موزیک", "موزیک محدود می‌شود"],
  ["lock_text", "قفل متن", "متن اعضای عادی محدود می‌شود"],
  ["welcome_enabled", "خوش‌آمدگویی", "پیام ورود عضو جدید"],
];

export default function AdminPage() {
  const [session, setSession] = useState("");
  const [sessionReady, setSessionReady] = useState(false);
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [settings, setSettings] = useState<Settings>(fallback);
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [stats, setStats] = useState<Stats>({ members: 0, activeWarnings: 0, moderation24h: 0, activity24h: 0, deleted24h: 0 });
  const [whitelist, setWhitelist] = useState<WhiteRow[]>([]);
  const [newUserId, setNewUserId] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    void bootstrapAdminSession().then((token) => {
      setSession(token);
      setSessionReady(true);
    });
  }, []);

  useEffect(() => {
    if (!sessionReady) return;
    if (!session) {
      setAuthorized(false);
      return;
    }
    const headers = adminHeaders(session);
    Promise.all([
      fetch("/api/admin/settings", { headers, cache: "no-store" }).then((r) => r.json()),
      fetch("/api/admin/logs?limit=20", { headers, cache: "no-store" }).then((r) => r.json()),
      fetch("/api/admin/stats", { headers, cache: "no-store" }).then((r) => r.json()),
      fetch("/api/admin/whitelist", { headers, cache: "no-store" }).then((r) => r.json()),
    ])
      .then(([s, l, st, w]) => {
        if (!s.ok) {
          clearAdminSession();
          setAuthorized(false);
          return;
        }
        setAuthorized(true);
        setSettings({ ...fallback, ...s.settings, filtered_words: s.settings?.filtered_words || [] });
        if (l.ok) setLogs(l.rows || []);
        if (st.ok) setStats(st.stats || {});
        if (w.ok) setWhitelist(w.rows || []);
      })
      .catch(() => setAuthorized(false));
  }, [session, sessionReady]);

  function patch<K extends keyof Settings>(key: K, value: Settings[K]) {
    setSettings((current) => ({ ...current, [key]: value }));
  }

  async function save() {
    setSaving(true);
    try {
      const response = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "content-type": "application/json", ...adminHeaders(session) },
        body: JSON.stringify(settings),
      });
      const data = await response.json();
      if (!data.ok) {
        if (response.status === 403) {
          clearAdminSession();
          setAuthorized(false);
        }
        throw new Error("save_failed");
      }
      setSettings({ ...fallback, ...data.settings, filtered_words: data.settings?.filtered_words || [] });
      setMsg("تنظیمات ذخیره شد ✨");
    } catch {
      setMsg("ذخیره تنظیمات انجام نشد");
    } finally {
      setSaving(false);
    }
  }

  async function saveWhite(rows: WhiteRow[]) {
    const response = await fetch("/api/admin/whitelist", {
      method: "PUT",
      headers: { "content-type": "application/json", ...adminHeaders(session) },
      body: JSON.stringify({ rows }),
    });
    const data = await response.json();
    if (data.ok) setWhitelist(data.rows || rows);
    else if (response.status === 403) {
      clearAdminSession();
      setAuthorized(false);
    }
  }

  if (!sessionReady || authorized === null) {
    return <main className="appShell adminScreen"><section className="adminHero premiumPanel"><div><h1>در حال بررسی نقش مدیر...</h1><p>مجوز از خود بله تأیید می‌شود.</p></div><Mascot small mood="thinking" /></section></main>;
  }

  if (!authorized) {
    return <main className="appShell adminScreen"><div className="ambient ambientA" /><div className="starField" /><section className="adminHero premiumPanel"><div><span className="eyebrow"><Icon name="shield" size={15} /> دسترسی محدود</span><h1>فقط مدیران گروه اجازه‌ی ورود دارن</h1><p>برای ورود به مرکز مدیریت، Mini App را از همان گروه بله باز کن. هویت مدیر سمت سرور دوباره بررسی می‌شود.</p><a className="primaryCta" href="/">بازگشت</a></div><Mascot small mood="idle" /></section></main>;
  }

  const statCards: Array<[string, number]> = [
    ["اعضا", stats.members], ["اخطار فعال", stats.activeWarnings], ["عملیات ۲۴ساعت", stats.moderation24h], ["فعالیت ۲۴ساعت", stats.activity24h], ["حذف‌شده", stats.deleted24h],
  ];

  return (
    <main className="appShell adminScreen">
      <div className="ambient ambientA" /><div className="ambient ambientB" /><div className="starField" />
      <header className="appHeader"><a className="roundButton" href="/">←</a><div className="wordmark"><b>مرکز مدیریت</b><span>Admin verified</span></div><span className="profileAvatar"><Icon name="shield" /></span></header>
      <section className="adminHero premiumPanel"><div><span className="eyebrow"><Icon name="shield" size={15} /> مدیر تأییدشده</span><h1>کنترل کامل گروه</h1><p>امنیت، قوانین، خوش‌آمدگویی، قفل‌ها، اعلان‌ها و هدیه‌ها</p></div><Mascot small mood="thinking" /></section>
      {msg && <div className="adminNotice">{msg}</div>}
      <section className="dashboardGrid">{statCards.map(([title, value]) => <article className="dashboardCard" key={title}><div><h2>{title}</h2><p>{Number(value || 0).toLocaleString("fa-IR")}</p></div></article>)}</section>
      <section className="adminPanel premiumPanel" style={{marginTop:14}}><div className="sectionHeading"><div><h2>تنظیمات مهم گروه</h2><p>متن قوانین، اعلان‌ها و هدیه‌های مدیریتی</p></div></div><div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:8,marginTop:10}}><a className="primaryCta" href="/admin/rules">📜 ویرایش قوانین</a><a className="primaryCta" href="/admin/reminders">🔔 اعلان‌ها</a></div></section>
      <OwnerGiftShortcut />
      <AdminModerationPanel session={session} />
      <section className="adminGrid">{toggles.map(([key, title, description]) => {const enabled=Boolean(settings[key]);return <article className="adminCard" key={String(key)}><div className="adminCardHead"><span className="iconOrb violet"><Icon name="shield" /></span><button className={`switch${enabled ? " on" : ""}`} onClick={() => patch(key, (!enabled) as Settings[typeof key])} aria-label={`${title}: ${enabled ? "روشن" : "خاموش"}`}><i /></button></div><h2>{title}</h2><p>{description}</p></article>})}</section>
      <section className="adminPanel premiumPanel"><h2>قوانین خودکار</h2><label>سقف اخطار <b>{settings.warn_limit}</b><input type="range" min="1" max="10" value={settings.warn_limit} onChange={(e) => patch("warn_limit", Number(e.target.value))} /></label><label>حد Flood <b>{settings.flood_limit}</b><input type="range" min="3" max="20" value={settings.flood_limit} onChange={(e) => patch("flood_limit", Number(e.target.value))} /></label><label>بازه Flood <b>{settings.flood_window_seconds} ثانیه</b><input type="range" min="2" max="30" value={settings.flood_window_seconds} onChange={(e) => patch("flood_window_seconds", Number(e.target.value))} /></label><label>Mute خودکار <b>{settings.flood_mute_minutes} دقیقه</b><input type="range" min="1" max="60" value={settings.flood_mute_minutes} onChange={(e) => patch("flood_mute_minutes", Number(e.target.value))} /></label></section>
      <section className="adminPanel premiumPanel" style={{ marginTop: 14 }}><h2>پیام خوش‌آمد</h2><textarea value={settings.welcome_message} onChange={(e) => patch("welcome_message", e.target.value)} maxLength={1500} style={{ width: "100%", minHeight: 100 }} /></section>
      <section className="adminPanel premiumPanel" style={{ marginTop: 14 }}><h2>فیلتر کلمات و عضو تازه</h2><p style={{ fontSize: 11, opacity: 0.72 }}>کلمات را با ویرگول یا خط جدید جدا کن. پیام حاوی کلمه فیلترشده برای عضو عادی حذف و ثبت می‌شود.</p><textarea value={settings.filtered_words.join("، ")} onChange={(e) => patch("filtered_words", e.target.value.split(/[،,\n]/).map((x) => x.trim()).filter(Boolean))} placeholder="کلمات فیلترشده" style={{ width: "100%", minHeight: 90 }} /><label style={{ display: "grid", gap: 7, marginTop: 10 }}>محدودیت رسانه/لینک عضو تازه <b>{settings.new_member_restrict_minutes.toLocaleString("fa-IR")} دقیقه</b><input type="range" min="0" max="1440" step="5" value={Math.min(1440, settings.new_member_restrict_minutes)} onChange={(e) => patch("new_member_restrict_minutes", Number(e.target.value))} /></label><small style={{ opacity: 0.65 }}>۰ یعنی خاموش. Admin و اعضای Whitelist مستثنا هستند.</small></section>
      <section className="adminPanel premiumPanel" style={{ marginTop: 14 }}><div className="sectionHeading"><div><h2>اعلان‌ها و زمان‌بندی</h2><p>{settings.timezone}</p></div><a className="primaryCta" href="/admin/reminders">تنظیم اعلان‌ها</a></div></section>
      <section className="adminPanel premiumPanel" style={{ marginTop: 14 }}><h2>لیست سفید</h2><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}><input value={newUserId} onChange={(e) => setNewUserId(e.target.value)} inputMode="numeric" placeholder="شناسه بله" /><input value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="نام" /></div><button className="adminSave" style={{ marginTop: 8 }} onClick={() => {const id = Number(newUserId);if (id > 0) {const rows = [...whitelist.filter((x) => x.bale_user_id !== id), { bale_user_id: id, label: newLabel || null }];setNewUserId("");setNewLabel("");void saveWhite(rows);}}}>افزودن</button>{whitelist.map((row) => <div key={row.bale_user_id} style={{ display: "flex", justifyContent: "space-between", padding: 8 }}><span>{row.label || row.bale_user_id}</span><button onClick={() => void saveWhite(whitelist.filter((x) => x.bale_user_id !== row.bale_user_id))} aria-label="حذف از لیست سفید">×</button></div>)}</section>
      <button className="adminSave" disabled={saving} onClick={() => void save()}>{saving ? "در حال ذخیره..." : "ذخیره تنظیمات"}</button>
      <section className="adminPanel premiumPanel" style={{ marginTop: 14 }}><h2>آخرین رویدادهای مدیریتی</h2>{logs.map((row) => <div key={row.id} style={{ padding: 10, borderBottom: "1px solid rgba(255,255,255,.06)" }}><b>{labels[row.action] || row.action}</b><p>{row.reason || "بدون توضیح"}</p><small>{new Date(row.created_at).toLocaleString("fa-IR")}</small></div>)}</section>
    </main>
  );
}
