export async function legacyGet(view: string, params: Record<string, string> = {}) {
  const session = sessionStorage.getItem("familybot.session");
  if (!session) throw new Error("unauthorized");
  const q = new URLSearchParams({view, ...params});
  const r = await fetch(`/api/family/legacy?${q}`, {headers: {authorization: `Bearer ${session}`}, cache: "no-store"});
  const d = await r.json();
  if (!d.ok) throw new Error(d.error || "read_failed");
  return d.data;
}

export async function legacyAct(action: string, payload: Record<string, unknown> = {}) {
  const session = sessionStorage.getItem("familybot.session");
  if (!session) throw new Error("برای ثبت، Mini App را از داخل بله باز کن.");
  const r = await fetch("/api/family/legacy", {
    method: "POST",
    headers: {"content-type": "application/json", authorization: `Bearer ${session}`},
    body: JSON.stringify({action, payload}),
    cache: "no-store",
  });
  const d = await r.json();
  if (!d.ok) throw new Error(persianError(d.error));
  return d.data;
}

export async function uploadLegacyFile(file: File) {
  const session = sessionStorage.getItem("familybot.session");
  if (!session) throw new Error("برای آپلود، Mini App را از داخل بله باز کن.");
  const form = new FormData();
  form.set("file", file);
  const r = await fetch("/api/family/memory-media", {method: "POST", headers: {authorization: `Bearer ${session}`}, body: form, cache: "no-store"});
  const d = await r.json();
  if (!r.ok || !d.ok) throw new Error(d.error === "file_too_large" ? "حجم فایل باید حداکثر ۲۰ مگابایت باشد." : d.error === "unsupported_media_type" ? "فقط JPG، PNG، WebP یا MP4 پشتیبانی می‌شود." : "آپلود انجام نشد.");
  return {mediaRef: String(d.mediaRef || ""), kind: String(d.kind || "image")};
}

export function persianError(code: string) {
  const map: Record<string, string> = {
    unauthorized: "ابتدا Mini App را از بله باز کن.",
    forbidden: "اجازه این کار را نداری.",
    admin_required: "فقط مدیران خانواده می‌توانند این مورد را تأیید کنند.",
    not_found: "این محتوا در دسترس تو نیست یا هنوز تأیید نشده.",
    title_required: "عنوان را بنویس.",
    name_required: "نام لازم است.",
    title_and_body_required: "عنوان و متن لازم است.",
    media_required: "فایل یا تصویر لازم است.",
    comment_required: "متن نظر خالی است.",
    message_required: "پیام یادبود خالی است.",
    slow_down: "لطفاً کمی صبر کن و دوباره بفرست.",
    invalid_reaction: "این واکنش برای این بخش مناسب نیست.",
    member_not_found: "عضو خانواده پیدا نشد.",
    invalid_close_member: "نمی‌توانی خودت را به دایره نزدیکان اضافه کنی.",
    close_circle_limit: "دایره نزدیکان پر است.",
  };
  return map[code] || "ثبت انجام نشد.";
}
