import { NextRequest, NextResponse } from "next/server";
import { isAdmin, openMiniAppKeyboard, sendMessage, baleApi } from "@/lib/bale";
import { addActivityReward, addWarning, claimDaily, ensureFamilyMember, familyCoreEnabled, getLeaderboard, getProfile, logModeration } from "@/lib/familyCore";

type Update = {
  message?: {
    message_id?: number;
    text?: string;
    chat?: { id?: number; type?: string; title?: string };
    from?: { id?: number; first_name?: string; last_name?: string; username?: string };
    new_chat_members?: Array<{ id?: number; first_name?: string; last_name?: string; username?: string }>;
    web_app_data?: { data?: string; button_text?: string };
    reply_to_message?: { from?: { id?: number; first_name?: string }; message_id?: number };
  };
};

const HELP = `🌍 Family Bot\n\n🏠 /start — ورود و Mini App\n👤 /profile — پروفایل من\n🏆 /rank — رتبه‌بندی خانواده\n🎁 /daily — جایزه روزانه\n🎮 /games — مرکز بازی\n🤖 /ai — هوش مصنوعی\n📜 /rules — قوانین\n\nمدیریت با Reply:\n⚠️ /warn [دلیل]\n🔇 /mute [دقیقه]\n⛔ /ban\n✅ /unban\n📌 /pin`;

function formatNumber(value: number | string | null | undefined) {
  return new Intl.NumberFormat("fa-IR").format(Number(value || 0));
}

export async function POST(req: NextRequest) {
  const expected = process.env.BALE_WEBHOOK_SECRET;
  const received = req.headers.get("x-bale-bot-api-secret-token") ?? req.nextUrl.searchParams.get("secret");
  if (expected && received !== expected) return NextResponse.json({ ok: false }, { status: 401 });

  const update = (await req.json()) as Update;
  const message = update.message;
  const chatId = message?.chat?.id;
  const userId = message?.from?.id;
  if (!message || !chatId) return NextResponse.json({ ok: true });

  let ctx = null;
  if (userId && familyCoreEnabled()) {
    try {
      ctx = await ensureFamilyMember(chatId, message.chat?.title, {
        id: userId,
        first_name: message.from?.first_name,
        last_name: message.from?.last_name,
        username: message.from?.username,
      });
    } catch (error) {
      console.error("Family Core bootstrap failed", error);
    }
  }

  if (message.new_chat_members?.length) {
    const names = message.new_chat_members.map((u) => u.first_name || "عضو جدید").join("، ");
    await sendMessage(chatId, `💜 ${names} خوش اومدی!\nبه Family Bot خوشحالیم که اضافه شدی.`, { reply_markup: openMiniAppKeyboard() });
    return NextResponse.json({ ok: true });
  }

  if (message.web_app_data?.data) {
    await sendMessage(chatId, "✅ اطلاعات Mini App دریافت شد و با Family Bot همگام می‌شود.");
    return NextResponse.json({ ok: true });
  }

  const text = message.text?.trim() ?? "";
  const [commandRaw = "", ...args] = text.split(/\s+/);
  const command = commandRaw.toLowerCase().split("@")[0];
  const isCommand = command.startsWith("/");

  if (ctx && text && !isCommand) {
    try { await addActivityReward(ctx, "message", 1); } catch (error) { console.error("activity reward failed", error); }
  }

  if (["/start", "/family"].includes(command)) {
    await sendMessage(chatId, "🏡 به Family Bot خوش اومدی!\nمدیریت، بازی، خاطرات، برنامه‌ریزی و هوش مصنوعی خانواده، همه یکجا.", { reply_markup: openMiniAppKeyboard() });
  } else if (["/help", "/menu"].includes(command)) {
    await sendMessage(chatId, HELP, { reply_markup: openMiniAppKeyboard() });
  } else if (command === "/profile") {
    if (!ctx) {
      await sendMessage(chatId, "👤 پروفایل آماده است؛ برای فعال شدن داده‌های زنده، Family Core باید به Supabase متصل شود.");
    } else {
      const p = await getProfile(ctx);
      await sendMessage(chatId, `👤 ${p.display_name || p.first_name || "عضو خانواده"}\n⭐ Level ${formatNumber(p.level)}\n✨ XP: ${formatNumber(p.xp)}\n🪙 Family Coin: ${formatNumber(p.coins)}\n🔥 Streak: ${formatNumber(p.streak)} روز`, { reply_markup: openMiniAppKeyboard() });
    }
  } else if (command === "/rank") {
    if (!ctx) {
      await sendMessage(chatId, "🏆 رتبه‌بندی بعد از اتصال Family Core فعال می‌شود.");
    } else {
      const rows = await getLeaderboard(ctx.family.id, 10);
      const body = rows.length ? rows.map((row, i) => `${i + 1}. ${row.display_name || row.first_name || "عضو خانواده"} — Lv.${formatNumber(row.level)} · ${formatNumber(row.xp)} XP`).join("\n") : "هنوز امتیازی ثبت نشده.";
      await sendMessage(chatId, `🏆 رتبه‌بندی خانواده\n\n${body}`, { reply_markup: openMiniAppKeyboard() });
    }
  } else if (command === "/daily") {
    if (!ctx) {
      await sendMessage(chatId, "🎁 جایزه روزانه بعد از اتصال Family Core فعال می‌شود.");
    } else {
      const result = await claimDaily(ctx);
      if (result.ok) await sendMessage(chatId, `🎁 جایزه امروز دریافت شد!\n+${formatNumber(result.reward)} 🪙\nموجودی جدید: ${formatNumber(result.coins)} سکه`);
      else if (result.reason === "claimed") await sendMessage(chatId, "⏳ جایزه امروز رو قبلاً گرفتی. فردا دوباره سر بزن 💜");
      else await sendMessage(chatId, "🎁 موتور جایزه روزانه هنوز کامل فعال نشده.");
    }
  } else if (command === "/games") {
    await sendMessage(chatId, "🎮 مرکز بازی Family Bot\n🧠 کوئیز خانوادگی\n🎲 تاس\n✊ سنگ کاغذ قیچی\n⚔️ دوئل\n🕵️ جاسوس\n🏁 مسابقه سرعت", { reply_markup: openMiniAppKeyboard() });
  } else if (command === "/ai") {
    await sendMessage(chatId, "🤖 Family AI آماده است. داخل Mini App می‌تونی تایپ کنی یا با من حرف بزنی 🎙️", { reply_markup: openMiniAppKeyboard() });
  } else if (command === "/rules") {
    await sendMessage(chatId, "📜 قوانین خانواده\n۱) احترام به همه اعضا\n۲) اسپم و تبلیغ بدون اجازه ممنوع\n۳) محتوای خصوصی خانواده بیرون گروه منتشر نشود\n۴) مدیرها می‌توانند قوانین را بعداً شخصی‌سازی کنند.");
  } else if (["/warn", "/ban", "/unban", "/mute", "/pin"].includes(command)) {
    if (!userId || !(await isAdmin(chatId, userId))) {
      await sendMessage(chatId, "⛔ این فرمان فقط برای مدیرهای گروه است.");
      return NextResponse.json({ ok: true });
    }
    const targetId = message.reply_to_message?.from?.id;
    const reason = args.join(" ").trim();
    if (!targetId && command !== "/pin") {
      await sendMessage(chatId, "↩️ این فرمان را روی پیام عضو موردنظر Reply کن.");
      return NextResponse.json({ ok: true });
    }

    if (command === "/warn") {
      const count = ctx ? await addWarning(ctx.family.id, userId, targetId!, reason) : null;
      if (ctx) await logModeration(ctx.family.id, userId, targetId, "warn", reason);
      await sendMessage(chatId, `⚠️ اخطار ثبت شد${count ? ` — اخطار فعال: ${formatNumber(count)}` : ""}${reason ? `\nدلیل: ${reason}` : ""}`);
      return NextResponse.json({ ok: true });
    }

    if (command === "/ban") await baleApi("banChatMember", { chat_id: chatId, user_id: targetId });
    if (command === "/unban") await baleApi("unbanChatMember", { chat_id: chatId, user_id: targetId, only_if_banned: true });
    if (command === "/mute") {
      const minutes = Math.max(1, Math.min(10080, Number(args[0]) || 10));
      await baleApi("restrictChatMember", { chat_id: chatId, user_id: targetId, permissions: { can_send_messages: false }, until_date: Math.floor(Date.now() / 1000) + minutes * 60 });
    }
    if (command === "/pin") {
      const messageId = message.reply_to_message?.message_id;
      if (!messageId) {
        await sendMessage(chatId, "↩️ برای پین کردن، روی پیام موردنظر Reply کن.");
        return NextResponse.json({ ok: true });
      }
      await baleApi("pinChatMessage", { chat_id: chatId, message_id: messageId, disable_notification: true });
    }
    if (ctx) await logModeration(ctx.family.id, userId, targetId, command.slice(1), reason);
    await sendMessage(chatId, "✅ انجام شد.");
  }

  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json({ ok: true, service: "familybot-bale-webhook", version: "0.2.0", familyCore: familyCoreEnabled() });
}
