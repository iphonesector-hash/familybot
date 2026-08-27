type BaleMethod =
  | "sendMessage"
  | "deleteMessage"
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

export function openMiniAppKeyboard() {
  const url = process.env.NEXT_PUBLIC_APP_URL;
  if (!url) return undefined;
  return {
    inline_keyboard: [[{ text: "🏠 ورود به Family Bot", web_app: { url } }]],
  };
}

export async function isAdmin(chatId: string | number, userId: string | number) {
  const result = await baleApi<{ result?: Array<{ user?: { id?: number } }> }>("getChatAdministrators", { chat_id: chatId });
  return Boolean(result.result?.some((admin) => String(admin.user?.id) === String(userId)));
}
