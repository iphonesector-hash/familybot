type BaleMethod =
  | "sendMessage"
  | "editMessageText"
  | "deleteMessage"
  | "answerCallbackQuery"
  | "banChatMember"
  | "unbanChatMember"
  | "restrictChatMember"
  | "getChatAdministrators"
  | "pinChatMessage"
  | "unpinChatMessage"
  | "setWebhook"
  | "getWebhookInfo";

const API_BASE = "https://tapi.bale.ai/bot";

export type BaleInlineButton = {
  text: string;
  callback_data?: string;
  url?: string;
  web_app?: { url: string };
};

export async function baleApi<T = unknown>(method: BaleMethod, payload: Record<string, unknown> = {}) {
  const token = process.env.BALE_BOT_TOKEN;
  if (!token) throw new Error("BALE_BOT_TOKEN is not configured");

  const response = await fetch(`${API_BASE}${token}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  const data = await response.json();
  if (!response.ok || data?.ok === false) {
    throw new Error(data?.description ?? `Bale API ${method} failed`);
  }
  return data as T;
}

export function sendMessage(chatId: string | number, text: string, extra: Record<string, unknown> = {}) {
  return baleApi("sendMessage", { chat_id: chatId, text, ...extra });
}

export function answerCallbackQuery(callbackQueryId: string, text?: string, showAlert = false) {
  return baleApi("answerCallbackQuery", { callback_query_id: callbackQueryId, ...(text ? { text } : {}), show_alert: showAlert });
}

export function editMessageText(chatId: string | number, messageId: number, text: string, extra: Record<string, unknown> = {}) {
  return baleApi("editMessageText", { chat_id: chatId, message_id: messageId, text, ...extra });
}

export function openMiniAppKeyboard() {
  const url = process.env.NEXT_PUBLIC_APP_URL;
  if (!url) return undefined;
  return {
    inline_keyboard: [
      [{ text: "🏠 باز کردن Family Bot", web_app: { url } }],
      [{ text: "🎮 بازی‌ها", callback_data: "menu:games" }, { text: "👤 پروفایل", callback_data: "menu:profile" }],
    ],
  };
}

export function mainMenuKeyboard(canManage = false) {
  const base = process.env.NEXT_PUBLIC_APP_URL;
  const financeButton: BaleInlineButton = base
    ? { text: "💳 حساب خانواده", web_app: { url: new URL("/section/finance", base).toString() } }
    : { text: "💳 حساب خانواده", callback_data: "menu:finance" };
  const rows: BaleInlineButton[][] = [
    [{ text: "🏠 Mini App", callback_data: "menu:miniapp" }],
    [{ text: "👨‍👩‍👧‍👦 خانواده", callback_data: "menu:family" }, { text: "📅 برنامه‌ریز", callback_data: "menu:planner" }],
    [{ text: "🖼 خاطرات", callback_data: "menu:memories" }, financeButton],
    [{ text: "🛍 فروشگاه", callback_data: "menu:store" }, { text: "🏅 دستاوردها", callback_data: "menu:achievements" }],
    [{ text: "🎮 بازی و سرگرمی", callback_data: "menu:games" }, { text: "🤖 Family AI", callback_data: "menu:ai" }],
    [{ text: "👤 پروفایل", callback_data: "menu:profile" }, { text: "🏆 رتبه‌بندی", callback_data: "menu:rank" }],
    [{ text: "🎁 جایزه روزانه", callback_data: "menu:daily" }, { text: "📜 قوانین", callback_data: "menu:rules" }],
    [{ text: "❓ راهنما", callback_data: "menu:help" }],
  ];
  if (canManage) rows.push([{ text: "🛡 مدیریت گروه", callback_data: "menu:admin" }]);
  return { inline_keyboard: rows };
}

export async function isAdmin(chatId: string | number, userId: string | number) {
  const result = await baleApi<{ result?: Array<{ user?: { id?: number } }> }>("getChatAdministrators", { chat_id: chatId });
  return Boolean(result.result?.some((admin) => String(admin.user?.id) === String(userId)));
}
