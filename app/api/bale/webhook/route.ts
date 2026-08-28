import { NextRequest, NextResponse } from "next/server";
import { answerCallbackQuery, baleApi, isAdmin, mainMenuKeyboard, openMiniAppKeyboard, sendMessage } from "@/lib/bale";
import { createAdminSession } from "@/lib/adminSession";
import { createFamilySession } from "@/lib/familySession";
import { isWhitelisted, readAdminSettings } from "@/lib/adminSettings";
import { addActivityReward, addWarning, claimDaily, clearWarnings, createQuizSession, ensureFamilyMember, familyCoreEnabled, getLeaderboard, getProfile, logModeration, recordFloodEvent, resolveQuiz } from "@/lib/familyCore";
import { claimBaleUpdate, completeBaleUpdate, releaseBaleUpdate } from "@/lib/baleUpdateStore";

type BaleUser = { id?: number; first_name?: string; last_name?: string; username?: string };
type BaleMessage = { message_id?: number; text?: string; caption?: string; chat?: { id?: number; type?: string; title?: string }; from?: BaleUser; new_chat_members?: BaleUser[]; web_app_data?: { data?: string; button_text?: string }; reply_to_message?: { from?: BaleUser; message_id?: number }; photo?: unknown[]; video?: unknown; document?: unknown; sticker?: unknown; animation?: unknown; voice?: unknown; audio?: unknown; forward_origin?: unknown; forward_from?: BaleUser; forward_from_chat?: { id?: number } };
type Update = { update_id?: number; message?: BaleMessage; callback_query?: { id?: string; from?: BaleUser; data?: string; message?: BaleMessage } };
type Ctx = Awaited<ReturnType<typeof buildContext>>;

const HELP = `🌍 Family Bot\n\nهمه امکانات اصلی از منوی دکمه‌ای در دسترسه.\n🏠 Mini App\n👨‍👩‍👧‍👦 خانواده و شجره‌نامه\n📅 برنامه‌ریز، کارها و نظرسنجی\n🖼 خاطرات\n🛍 فروشگاه و Family Coin\n🏅 دستاوردها و مأموریت‌ها\n🎮 بازی و سرگرمی\n🤖 Family AI صوتی و متنی\n👤 پروفایل و رتبه‌بندی\n🎁 جایزه روزانه\n\nمدیریت فقط برای Adminهای گروه نمایش داده می‌شود و فرمان‌های مدیریتی هم سمت سرور دوباره بررسی می‌شوند.`;
const RULES = "📜 قوانین خانواده\n۱) احترام به همه اعضا\n۲) اسپم و تبلیغ بدون اجازه ممنوع\n۳) محتوای خصوصی خانواده بیرون گروه منتشر نشود\n۴) مدیرها می‌توانند تنظیمات امنیتی را شخصی‌سازی کنند.";
const fmt = (v: number | string | null | undefined) => new Intl.NumberFormat("fa-IR").format(Number(v || 0));
const hasExternalLink = (text: string) => /(https?:\/\/|www\.|(?:t|ble)\.me\/|ble\.ir\/|\.com\b|\.ir\b)/i.test(text);

function adminKeyboard(token: string) {
  const base = process.env.NEXT_PUBLIC_APP_URL;
  if (!base) return undefined;
  const admin = new URL("/admin", base); admin.searchParams.set("session", token);
  const reminders = new URL("/admin/reminders", base); reminders.searchParams.set("session", token);
  return { inline_keyboard: [[{ text: "🛡 مرکز مدیریت", web_app: { url: admin.toString() } }],[{ text: "🔔 اعلان‌ها و زمان‌بندی", web_app: { url: reminders.toString() } }]] };
}

function miniAppUrl(ctx: Exclude<Ctx, null>, path = "/") {
  const base = process.env.NEXT_PUBLIC_APP_URL;
  if (!base) return null;
  const token = createFamilySession({ familyId: ctx.family.id, chatId: ctx.family.bale_chat_id, userId: ctx.member.bale_user_id }, 60 * 60 * 12);
  const url = new URL(path, base); url.searchParams.set("session", token); return url.toString();
}

function memberMiniAppKeyboard(ctx: Exclude<Ctx, null>) {
  const home = miniAppUrl(ctx, "/");
  if (!home) return openMiniAppKeyboard();
  return { inline_keyboard: [[{ text: "🏠 باز کردن Family Bot", web_app: { url: home } }],[{ text: "🎮 بازی‌ها", callback_data: "menu:games" }, { text: "👤 پروفایل", callback_data: "menu:profile" }]] };
}

function featureKeyboard(ctx: Exclude<Ctx, null>, path: string, label: string) {
  const url = miniAppUrl(ctx, path);
  return url ? { inline_keyboard: [[{ text: label, web_app: { url } }],[{ text: "🏠 منوی اصلی", callback_data: "menu:home" }]] } : openMiniAppKeyboard();
}

function lockedContent(message: BaleMessage, settings: Awaited<ReturnType<typeof readAdminSettings>>, isCommand: boolean) {
  if (settings.lock_photo && message.photo?.length) return "عکس";
  if (settings.lock_video && message.video) return "ویدیو";
  if (settings.lock_document && message.document) return "فایل";
  if (settings.lock_forward && (message.forward_origin || message.forward_from || message.forward_from_chat)) return "فوروارد";
  if (settings.lock_sticker && message.sticker) return "استیکر";
  if (settings.lock_gif && message.animation) return "GIF";
  if (settings.lock_voice && message.voice) return "ویس";
  if (settings.lock_audio && message.audio) return "موزیک";
  if (settings.lock_text && message.text && !isCommand) return "متن";
  return null;
}

async function mute(chatId: number, userId: number, minutes: number) {
  await baleApi("restrictChatMember", { chat_id: chatId, user_id: userId, permissions: { can_send_messages: false }, until_date: Math.floor(Date.now() / 1000) + minutes * 60 });
}

async function buildContext(chatId: number, title: string | undefined, user?: BaleUser) {
  if (!user?.id || !familyCoreEnabled()) return null;
  try { return await ensureFamilyMember(chatId, title, { id: user.id, first_name: user.first_name, last_name: user.last_name, username: user.username }); }
  catch (error) { console.error("Family Core bootstrap failed", error); return null; }
}

async function sendProfile(chatId: number, ctx: Ctx) {
  if (!ctx) return sendMessage(chatId, "👤 برای داده‌های زنده، Family Core باید به Supabase متصل باشد.");
  const p = await getProfile(ctx);
  return sendMessage(chatId, `👤 ${p.display_name || p.first_name || "عضو خانواده"}\n⭐ Level ${fmt(p.level)}\n✨ XP: ${fmt(p.xp)}\n🪙 Family Coin: ${fmt(p.coins)}\n🔥 Streak: ${fmt(p.streak)} روز`, { reply_markup: memberMiniAppKeyboard(ctx) });
}
async function sendRank(chatId: number, ctx: Ctx) {
  if (!ctx) return sendMessage(chatId, "🏆 رتبه‌بندی بعد از اتصال Family Core فعال می‌شود.");
  const rows = await getLeaderboard(ctx.family.id, 10);
  const body = rows.length ? rows.map((r, i) => `${i + 1}. ${r.display_name || r.first_name || "عضو خانواده"} — Lv.${fmt(r.level)} · ${fmt(r.xp)} XP`).join("\n") : "هنوز امتیازی ثبت نشده.";
  return sendMessage(chatId, `🏆 رتبه‌بندی خانواده\n\n${body}`, { reply_markup: memberMiniAppKeyboard(ctx) });
}
async function daily(chatId: number, ctx: Ctx) {
  if (!ctx) return sendMessage(chatId, "🎁 جایزه روزانه بعد از اتصال Family Core فعال می‌شود.");
  const result = await claimDaily(ctx);
  if (result.ok) return sendMessage(chatId, `🎁 جایزه امروز دریافت شد!\n+${fmt(result.reward)} 🪙\nموجودی جدید: ${fmt(result.coins)} سکه`, { reply_markup: memberMiniAppKeyboard(ctx) });
  if (result.reason === "claimed") return sendMessage(chatId, "⏳ جایزه امروز رو قبلاً گرفتی. فردا دوباره سر بزن 💜", { reply_markup: memberMiniAppKeyboard(ctx) });
  return sendMessage(chatId, "🎁 موتور جایزه روزانه هنوز کامل فعال نشده.");
}
async function startQuiz(chatId: number, ctx: Ctx) {
  if (!ctx) return sendMessage(chatId, "🧠 کوئیز بعد از اتصال Family Core فعال می‌شود.");
  const quiz = await createQuizSession(ctx);
  if (!quiz) return sendMessage(chatId, "فعلاً کوئیز آماده نشد؛ دوباره امتحان کن.");
  return sendMessage(chatId, `🧠 کوئیز خانوادگی\n\n${quiz.prompt}\n\n🏆 جایزه: ${fmt(quiz.reward_coins)} سکه`, { reply_markup: { inline_keyboard: quiz.options.map((option, index) => [{ text: option, callback_data: `quiz:${quiz.id}:${index}` }]) } });
}

async function handleCallback(query: NonNullable<Update["callback_query"]>) {
  const callbackId = query.id, data = query.data || "", message = query.message, chatId = message?.chat?.id, user = query.from;
  if (!callbackId || !chatId || !user?.id) return;
  const ctx = await buildContext(chatId, message?.chat?.title, user);
  const canManage = await isAdmin(chatId, user.id).catch(() => false);
  if (data.startsWith("quiz:")) {
    const [, sessionId, optionRaw] = data.split(":");
    const result = ctx ? await resolveQuiz(sessionId, user.id, Number(optionRaw), ctx) : { ok: false as const, reason: "disabled" };
    if (result.ok) { await answerCallbackQuery(callbackId, `درسته! +${result.reward} سکه 🎉`, true); await sendMessage(chatId, `🎉 ${user.first_name || "آفرین"}! جواب درست بود و ${fmt(result.reward)} سکه بردی.`); }
    else { const text = result.reason === "wrong" ? "نه، این گزینه درست نبود 😄" : result.reason === "expired" ? "زمان این سؤال تموم شده ⏳" : "این سؤال قبلاً جواب داده شده."; await answerCallbackQuery(callbackId, text, result.reason !== "wrong"); }
    return;
  }
  await answerCallbackQuery(callbackId);
  if (data === "menu:home") return sendMessage(chatId, "🌍 منوی Family Bot", { reply_markup: mainMenuKeyboard(canManage) });
  if (data === "menu:profile") return sendProfile(chatId, ctx);
  if (data === "menu:rank") return sendRank(chatId, ctx);
  if (data === "menu:daily") return daily(chatId, ctx);
  if (data === "menu:help") return sendMessage(chatId, HELP, { reply_markup: mainMenuKeyboard(canManage) });
  if (data === "menu:rules") return sendMessage(chatId, RULES, { reply_markup: mainMenuKeyboard(canManage) });
  if (data === "menu:admin") {
    if (!canManage || !ctx) return answerCallbackQuery(callbackId, "این بخش فقط برای مدیرهای همین گروه است.", true);
    const token = createAdminSession({ familyId: ctx.family.id, chatId, userId: user.id }, 900);
    return sendMessage(chatId, "🛡 مرکز مدیریت فقط برای مدیر تأییدشده باز شد.", { reply_markup: adminKeyboard(token) });
  }
  if (data === "menu:miniapp" && ctx) return sendMessage(chatId, "🏠 Family Bot داخل Mini App بله باز می‌شود.", { reply_markup: featureKeyboard(ctx, "/", "🏠 باز کردن Mini App") });
  if (data === "menu:family" && ctx) return sendMessage(chatId, "👨‍👩‍👧‍👦 اعضا، شجره‌نامه و مناسبت‌ها", { reply_markup: featureKeyboard(ctx, "/section/family", "👨‍👩‍👧‍👦 باز کردن خانواده") });
  if (data === "menu:planner" && ctx) return sendMessage(chatId, "📅 کارها، تقویم، نظرسنجی و Family Coin", { reply_markup: featureKeyboard(ctx, "/section/planner", "📅 باز کردن برنامه‌ریز") });
  if (data === "menu:memories" && ctx) return sendMessage(chatId, "🖼 آلبوم و خط زمانی خاطرات", { reply_markup: featureKeyboard(ctx, "/section/memories", "🖼 باز کردن خاطرات") });
  if (data === "menu:store" && ctx) return sendMessage(chatId, "🛍 فروشگاه و آیتم‌های Family House", { reply_markup: featureKeyboard(ctx, "/section/store", "🛍 باز کردن فروشگاه") });
  if (data === "menu:achievements" && ctx) return sendMessage(chatId, "🏅 نشان‌ها و مأموریت‌های روزانه/هفتگی", { reply_markup: featureKeyboard(ctx, "/section/achievements", "🏅 باز کردن دستاوردها") });
  if (data === "menu:ai" && ctx) return sendMessage(chatId, "🤖 Family AI تایپی و صوتی", { reply_markup: featureKeyboard(ctx, "/ai", "🤖 باز کردن Family AI") });
  if (data === "menu:games") return sendMessage(chatId, "🎮 چی بازی کنیم؟", { reply_markup: { inline_keyboard: [[{ text: "🧠 کوئیز", callback_data: "game:quiz" }, { text: "🎲 تاس", callback_data: "game:dice" }], [{ text: "🪙 شیر یا خط", callback_data: "game:coin" }, { text: "✊ سنگ کاغذ قیچی", callback_data: "game:rps" }], ...(ctx ? [[{ text: "🎮 مرکز بازی Mini App", web_app: { url: miniAppUrl(ctx, "/section/games")! } }]] : []), [{ text: "🏠 منوی اصلی", callback_data: "menu:home" }]] } });
  if (data === "game:quiz") return startQuiz(chatId, ctx);
  if (data === "game:dice") return sendMessage(chatId, `🎲 تاس تو: ${Math.floor(Math.random() * 6) + 1}`);
  if (data === "game:coin") return sendMessage(chatId, Math.random() < 0.5 ? "🪙 شیر!" : "🪙 خط!");
  if (data === "game:rps") return sendMessage(chatId, "✊ انتخابت رو بزن:", { reply_markup: { inline_keyboard: [["سنگ", "کاغذ", "قیچی"].map((v, i) => ({ text: v, callback_data: `rps:${i}` }))] } });
  if (data.startsWith("rps:")) { const choice = Number(data.split(":")[1]), bot = Math.floor(Math.random() * 3), names = ["سنگ", "کاغذ", "قیچی"]; const result = choice === bot ? "مساوی شد 😄" : (choice - bot + 3) % 3 === 1 ? "تو بردی! 🎉" : "این دست من بردم 🤖"; return sendMessage(chatId, `تو: ${names[choice]}\nFamily Bot: ${names[bot]}\n\n${result}`); }
}

async function processUpdate(update:Update){
  if (update.callback_query) { await handleCallback(update.callback_query); return NextResponse.json({ ok: true }); }
  const message = update.message, chatId = message?.chat?.id, userId = message?.from?.id;
  if (!message || !chatId) return NextResponse.json({ ok: true });
  const ctx = await buildContext(chatId, message.chat?.title, message.from);
  const settings = ctx ? await readAdminSettings(ctx.family.id).catch(() => null) : null;
  const currentAdmin = userId ? await isAdmin(chatId, userId).catch(() => false) : false;

  if (message.new_chat_members?.length && settings?.welcome_enabled !== false) {
    const names = message.new_chat_members.map((u) => u.first_name || "عضو جدید").join("، ");
    const template = settings?.welcome_message || "💜 {name} خوش اومدی!";
    await sendMessage(chatId, template.replaceAll("{name}", names), { reply_markup: mainMenuKeyboard(false) });
    return NextResponse.json({ ok: true });
  }
  if (message.web_app_data?.data) { await sendMessage(chatId, "✅ اطلاعات Mini App دریافت شد و با Family Bot همگام می‌شود."); return NextResponse.json({ ok: true }); }

  const text = message.text?.trim() ?? "";
  const [commandRaw = "", ...args] = text.split(/\s+/);
  const command = commandRaw.toLowerCase().split("@")[0], isCommand = command.startsWith("/");
  let privileged = currentAdmin;
  if (ctx && userId && settings) {
    const whitelisted = !currentAdmin && await isWhitelisted(ctx.family.id, userId).catch(() => false);
    privileged = currentAdmin || whitelisted;
    const locked = privileged ? null : lockedContent(message, settings, isCommand);
    if (locked) { if (message.message_id) await baleApi("deleteMessage", { chat_id: chatId, message_id: message.message_id }).catch(() => undefined); await logModeration(ctx.family.id, undefined, userId, "content_lock", locked); await sendMessage(chatId, `🔒 ارسال ${locked} در حال حاضر برای اعضای عادی قفل است.`); return NextResponse.json({ ok: true }); }
  }

  if (ctx && userId && text && !isCommand && !privileged) {
    if (settings?.anti_link && hasExternalLink(text)) {
      if (message.message_id) await baleApi("deleteMessage", { chat_id: chatId, message_id: message.message_id }).catch(() => undefined);
      await logModeration(ctx.family.id, undefined, userId, "anti_link_delete", "link removed");
      const count = await addWarning(ctx.family.id, 0, userId, "ارسال لینک در حالت قفل لینک"); await sendMessage(chatId, `🔗 لینک حذف شد. اخطار فعال: ${fmt(count)}`);
      if (count >= settings.warn_limit) { await mute(chatId, userId, settings.flood_mute_minutes); await clearWarnings(ctx.family.id, userId); await logModeration(ctx.family.id, undefined, userId, "auto_mute", "warn limit reached"); await sendMessage(chatId, `🔇 به دلیل رسیدن به ${fmt(settings.warn_limit)} اخطار، کاربر ${fmt(settings.flood_mute_minutes)} دقیقه ساکت شد.`); }
      return NextResponse.json({ ok: true });
    }
    if (settings?.anti_flood) { const flood = await recordFloodEvent(ctx.family.id, userId, settings); if (flood.exceeded) { if (message.message_id) await baleApi("deleteMessage", { chat_id: chatId, message_id: message.message_id }).catch(() => undefined); await mute(chatId, userId, settings.flood_mute_minutes); await logModeration(ctx.family.id, undefined, userId, "anti_flood_mute", `${flood.count} messages in ${settings.flood_window_seconds}s`); await sendMessage(chatId, `🛡 ضداسپم فعال شد؛ ارسال سریع پیام تشخیص داده شد و کاربر ${fmt(settings.flood_mute_minutes)} دقیقه ساکت شد.`); return NextResponse.json({ ok: true }); } }
  }
  if (ctx && text && !isCommand) try { await addActivityReward(ctx, "message", 1); } catch (error) { console.error("activity reward failed", error); }

  if (["/start", "/family", "/menu"].includes(command)) await sendMessage(chatId, "🏡 Family Bot آماده‌ست. همه امکانات از منوی دکمه‌ای زیر در دسترسه.", { reply_markup: mainMenuKeyboard(currentAdmin) });
  else if (command === "/help") await sendMessage(chatId, HELP, { reply_markup: mainMenuKeyboard(currentAdmin) });
  else if (command === "/admin") {
    if (!userId || !ctx || !currentAdmin) { await sendMessage(chatId, "⛔ پنل مدیریت فقط برای مدیرهای همین گروه باز می‌شود."); return NextResponse.json({ ok: true }); }
    const token = createAdminSession({ familyId: ctx.family.id, chatId, userId }, 900); await sendMessage(chatId, "🛡 مرکز مدیریت Family Bot آماده است. این نشست ۱۵ دقیقه اعتبار دارد و مخصوص مدیر درخواست‌کننده است.", { reply_markup: adminKeyboard(token) });
  } else if (command === "/profile") await sendProfile(chatId, ctx);
  else if (command === "/rank") await sendRank(chatId, ctx);
  else if (command === "/daily") await daily(chatId, ctx);
  else if (command === "/games") await sendMessage(chatId, "🎮 مرکز بازی Family Bot", { reply_markup: { inline_keyboard: [[{ text: "🧠 کوئیز", callback_data: "game:quiz" }, { text: "🎲 تاس", callback_data: "game:dice" }], [{ text: "🪙 شیر یا خط", callback_data: "game:coin" }, { text: "✊ سنگ کاغذ قیچی", callback_data: "game:rps" }], [{ text: "🏠 منوی اصلی", callback_data: "menu:home" }]] } });
  else if (command === "/quiz") await startQuiz(chatId, ctx);
  else if (command === "/dice") await sendMessage(chatId, `🎲 تاس تو: ${Math.floor(Math.random() * 6) + 1}`);
  else if (command === "/coin") await sendMessage(chatId, Math.random() < 0.5 ? "🪙 شیر!" : "🪙 خط!");
  else if (command === "/rps") await sendMessage(chatId, "✊ انتخابت رو بزن:", { reply_markup: { inline_keyboard: [["سنگ", "کاغذ", "قیچی"].map((v, i) => ({ text: v, callback_data: `rps:${i}` }))] } });
  else if (command === "/ai") await sendMessage(chatId, "🤖 Family AI آماده است.", { reply_markup: ctx ? featureKeyboard(ctx, "/ai", "🤖 باز کردن Family AI") : openMiniAppKeyboard() });
  else if (command === "/rules") await sendMessage(chatId, RULES, { reply_markup: mainMenuKeyboard(currentAdmin) });
  else if (["/warn", "/unwarn", "/ban", "/unban", "/mute", "/pin"].includes(command)) {
    if (!userId || !currentAdmin) { await sendMessage(chatId, "⛔ این فرمان فقط برای مدیرهای گروه است."); return NextResponse.json({ ok: true }); }
    const targetId = message.reply_to_message?.from?.id, reason = args.join(" ").trim();
    if (!targetId && command !== "/pin") { await sendMessage(chatId, "↩️ این فرمان را روی پیام عضو موردنظر Reply کن."); return NextResponse.json({ ok: true }); }
    if (command === "/warn") { const count = ctx ? await addWarning(ctx.family.id, userId, targetId!, reason) : 0; if (ctx) await logModeration(ctx.family.id, userId, targetId, "warn", reason); await sendMessage(chatId, `⚠️ اخطار ثبت شد${count ? ` — اخطار فعال: ${fmt(count)}` : ""}${reason ? `\nدلیل: ${reason}` : ""}`); if (ctx && settings && count >= settings.warn_limit) { await mute(chatId, targetId!, settings.flood_mute_minutes); await clearWarnings(ctx.family.id, targetId!); await logModeration(ctx.family.id, userId, targetId, "auto_mute", "warn limit reached"); await sendMessage(chatId, `🔇 سقف اخطار پر شد؛ کاربر ${fmt(settings.flood_mute_minutes)} دقیقه ساکت شد و اخطارها ریست شدند.`); } return NextResponse.json({ ok: true }); }
    if (command === "/unwarn") { if (ctx) { await clearWarnings(ctx.family.id, targetId!); await logModeration(ctx.family.id, userId, targetId, "unwarn"); } await sendMessage(chatId, "🧹 اخطارهای فعال این عضو پاک شد."); return NextResponse.json({ ok: true }); }
    if (command === "/ban") await baleApi("banChatMember", { chat_id: chatId, user_id: targetId });
    if (command === "/unban") await baleApi("unbanChatMember", { chat_id: chatId, user_id: targetId, only_if_banned: true });
    if (command === "/mute") await mute(chatId, targetId!, Math.max(1, Math.min(10080, Number(args[0]) || 10)));
    if (command === "/pin") { const messageId = message.reply_to_message?.message_id; if (!messageId) { await sendMessage(chatId, "↩️ برای پین کردن، روی پیام موردنظر Reply کن."); return NextResponse.json({ ok: true }); } await baleApi("pinChatMessage", { chat_id: chatId, message_id: messageId, disable_notification: true }); }
    if (ctx) await logModeration(ctx.family.id, userId, targetId, command.slice(1), reason); await sendMessage(chatId, "✅ انجام شد.");
  }
  return NextResponse.json({ ok: true });
}

export async function POST(req: NextRequest) {
  const expected = process.env.BALE_WEBHOOK_SECRET;
  const received = req.headers.get("x-bale-bot-api-secret-token") ?? req.nextUrl.searchParams.get("secret");
  if (expected && received !== expected) return NextResponse.json({ ok: false }, { status: 401 });
  const update = (await req.json()) as Update;
  const updateId=Number(update.update_id);
  const kind=update.callback_query?"callback_query":update.message?"message":"unknown";
  const chatId=update.callback_query?.message?.chat?.id??update.message?.chat?.id;
  const claimed=Number.isSafeInteger(updateId)?await claimBaleUpdate(updateId,kind,chatId):{tracked:false,duplicate:false};
  if(claimed.duplicate)return NextResponse.json({ok:true,duplicate:true});
  try{
    const response=await processUpdate(update);
    if(claimed.tracked)await completeBaleUpdate(updateId);
    return response;
  }catch(error){
    if(claimed.tracked)await releaseBaleUpdate(updateId,error);
    console.error("Bale webhook processing failed",error);
    return NextResponse.json({ok:false,error:"processing_failed"},{status:500});
  }
}

export async function GET() { return NextResponse.json({ ok: true, service: "familybot-bale-webhook", version: "0.8.0", familyCore: familyCoreEnabled() }); }
