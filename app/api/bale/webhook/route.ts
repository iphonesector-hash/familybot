import { NextRequest, NextResponse } from "next/server";
import { isAdmin, openMiniAppKeyboard, sendMessage, baleApi } from "@/lib/bale";

type Update = {
  message?: {
    message_id?: number;
    text?: string;
    chat?: { id?: number; type?: string; title?: string };
    from?: { id?: number; first_name?: string; username?: string };
    new_chat_members?: Array<{ first_name?: string }>;
    web_app_data?: { data?: string; button_text?: string };
    reply_to_message?: { from?: { id?: number }; message_id?: number };
  };
};

const HELP = `🌍 Family Bot — خانواده بزرگ جهانی\n\n🏠 /start ورود و Mini App\n👤 /profile پروفایل من\n🏆 /rank رتبه‌بندی\n🎁 /daily جایزه روزانه\n🎮 /games بازی‌ها\n🤖 /ai هوش مصنوعی\n📜 /rules قوانین\n\nمدیریت: /warn /mute /ban /unban /pin`;

export async function POST(req: NextRequest) {
  const expected = process.env.BALE_WEBHOOK_SECRET;
  const received = req.headers.get("x-bale-bot-api-secret-token") ?? req.nextUrl.searchParams.get("secret");
  if (expected && received !== expected) return NextResponse.json({ ok: false }, { status: 401 });

  const update = (await req.json()) as Update;
  const message = update.message;
  const chatId = message?.chat?.id;
  const userId = message?.from?.id;
  if (!message || !chatId) return NextResponse.json({ ok: true });

  if (message.new_chat_members?.length) {
    const names = message.new_chat_members.map((u) => u.first_name || "عضو جدید").join("، ");
    await sendMessage(chatId, `💜 ${names} خوش اومدی!\nبه خانواده بزرگ جهانی خوشحالیم که اضافه شدی 🌍`, {
      reply_markup: openMiniAppKeyboard(),
    });
    return NextResponse.json({ ok: true });
  }

  if (message.web_app_data?.data) {
    await sendMessage(chatId, "✅ اطلاعات Mini App با موفقیت دریافت شد.");
    return NextResponse.json({ ok: true });
  }

  const text = message.text?.trim() ?? "";
  const [commandRaw, ...args] = text.split(/\s+/);
  const command = commandRaw.toLowerCase().split("@")[0];

  if (["/start", "/family"].includes(command)) {
    await sendMessage(chatId, "🏡 به Family Bot خوش اومدی!\nمدیریت، بازی، خاطرات، برنامه‌ریزی و هوش مصنوعی خانواده، همه یکجا.", {
      reply_markup: openMiniAppKeyboard(),
    });
  } else if (["/help", "/menu"].includes(command)) {
    await sendMessage(chatId, HELP, { reply_markup: openMiniAppKeyboard() });
  } else if (command === "/profile") {
    await sendMessage(chatId, `👤 پروفایل ${message.from?.first_name ?? "عضو خانواده"}\n⭐ Level 1\n✨ XP: 0\n🪙 Family Coin: 0\n🔥 Streak: 0 روز\n\nنسخه دیتابیسی پروفایل در فاز بعد فعال می‌شود.`);
  } else if (command === "/rank") {
    await sendMessage(chatId, "🏆 جدول رتبه‌بندی خانواده\n\nدر حال اتصال به Family Core و دیتابیس...");
  } else if (command === "/daily") {
    await sendMessage(chatId, "🎁 جایزه روزانه آماده است؛ موتور اقتصاد Family Coin در حال فعال‌سازی است.");
  } else if (command === "/games") {
    await sendMessage(chatId, "🎮 مرکز بازی Family Bot\n🧠 کوئیز خانوادگی\n🎲 تاس\n✊ سنگ کاغذ قیچی\n⚔️ دوئل\n🕵️ جاسوس\n🏁 مسابقه سرعت", { reply_markup: openMiniAppKeyboard() });
  } else if (command === "/ai") {
    await sendMessage(chatId, "🤖 Family AI آماده است. داخل Mini App می‌تونی تایپ کنی یا با من حرف بزنی 🎙️", { reply_markup: openMiniAppKeyboard() });
  } else if (["/ban", "/unban", "/mute", "/pin"].includes(command)) {
    if (!userId || !(await isAdmin(chatId, userId))) {
      await sendMessage(chatId, "⛔ این فرمان فقط برای مدیرهای گروه است.");
      return NextResponse.json({ ok: true });
    }
    const targetId = message.reply_to_message?.from?.id;
    if (!targetId && command !== "/pin") {
      await sendMessage(chatId, "↩️ این فرمان را روی پیام عضو موردنظر Reply کن.");
      return NextResponse.json({ ok: true });
    }
    if (command === "/ban") await baleApi("banChatMember", { chat_id: chatId, user_id: targetId });
    if (command === "/unban") await baleApi("unbanChatMember", { chat_id: chatId, user_id: targetId, only_if_banned: true });
    if (command === "/mute") {
      const minutes = Math.max(1, Math.min(10080, Number(args[0]) || 10));
      await baleApi("restrictChatMember", {
        chat_id: chatId,
        user_id: targetId,
        permissions: { can_send_messages: false },
        until_date: Math.floor(Date.now() / 1000) + minutes * 60,
      });
    }
    if (command === "/pin") {
      const messageId = message.reply_to_message?.message_id;
      if (messageId) await baleApi("pinChatMessage", { chat_id: chatId, message_id: messageId, disable_notification: true });
    }
    await sendMessage(chatId, "✅ انجام شد.");
  }

  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json({ ok: true, service: "familybot-bale-webhook", version: "0.1.0" });
}
