export const VISIBILITY = ["family", "close_family", "private", "admins"] as const;
export type Visibility = (typeof VISIBILITY)[number];

export const MODERATION = ["draft", "pending", "approved", "rejected", "archived"] as const;
export type Moderation = (typeof MODERATION)[number];

export const ARTICLE_CATEGORIES = [
  "تاریخچه خانواده",
  "ریشه خانوادگی",
  "شهرها و روستاهای مرتبط",
  "خانه‌های قدیمی",
  "رویدادهای خانوادگی",
  "داستان‌های قدیمی",
  "سنت‌ها",
  "مشاغل خانوادگی",
  "افراد تأثیرگذار",
  "مکان‌های خاطره‌انگیز",
  "اسناد قدیمی",
  "اشیای تاریخی خانوادگی",
  "داستان عکس‌های قدیمی",
] as const;

export const ALBUM_PRESETS = [
  {key: "old-photos", title: "عکس‌های قدیمی"},
  {key: "childhood", title: "کودکی"},
  {key: "weddings", title: "عروسی‌ها"},
  {key: "birthdays", title: "تولدها"},
  {key: "trips", title: "سفرها"},
  {key: "gatherings", title: "دورهمی‌ها"},
  {key: "ceremonies", title: "مراسم‌ها"},
  {key: "nowruz", title: "نوروز"},
  {key: "occasions", title: "مناسبت‌ها"},
  {key: "old-generations", title: "نسل‌های قدیمی"},
  {key: "historical", title: "تصاویر تاریخی خانواده"},
] as const;

export const JOURNAL_KINDS = ["خاطره", "دلنوشته", "شعر", "داستان", "یادداشت", "روایت خانوادگی", "متن درباره یک شخص", "متن درباره یک عکس", "متن درباره یک رویداد"] as const;

export const GENERAL_REACTIONS = ["❤️", "👏", "🥹", "🕊️"] as const;
export const MEMORIAL_REACTIONS = ["❤️", "🕊️"] as const;

export type AccessActor = {
  memberId: string;
  isAdmin: boolean;
  closeMemberIds?: string[];
};

export type AccessRecord = {
  visibility: string;
  moderation_status: string;
  ownerId?: string | null;
  relatedMemberIds?: string[];
};

export function normalizePersian(input: string) {
  return String(input || "")
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[\u200c\u200f\u200e]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function parseVisibility(value: unknown): Visibility {
  return VISIBILITY.includes(value as Visibility) ? (value as Visibility) : "family";
}

export function parseModeration(value: unknown): Moderation {
  return MODERATION.includes(value as Moderation) ? (value as Moderation) : "draft";
}

export function defaultPublishStatus(isAdmin: boolean, requested?: unknown): Moderation {
  if (requested === "draft") return "draft";
  if (requested === "archived" && isAdmin) return "archived";
  if (isAdmin) return requested === "pending" ? "pending" : "approved";
  return "pending";
}

export function canSeeRecord(actor: AccessActor, record: AccessRecord) {
  const owner = record.ownerId && record.ownerId === actor.memberId;
  const related = Boolean(record.relatedMemberIds?.includes(actor.memberId));
  if (record.moderation_status === "archived" && !actor.isAdmin && !owner) return false;
  if (record.moderation_status === "rejected" && !actor.isAdmin && !owner) return false;
  if (record.moderation_status === "draft" && !owner && !actor.isAdmin) return false;
  if (record.moderation_status === "pending" && !owner && !actor.isAdmin) return false;
  const vis = parseVisibility(record.visibility);
  if (vis === "family") return true;
  if (vis === "private") return owner || actor.isAdmin;
  if (vis === "admins") return actor.isAdmin || owner;
  if (vis === "close_family") {
    if (owner || actor.isAdmin || related) return true;
    return Boolean(actor.closeMemberIds?.includes(record.ownerId || ""));
  }
  return false;
}

export function canModerate(actor: AccessActor) {
  return actor.isAdmin;
}

export function canEditRecord(actor: AccessActor, ownerId?: string | null) {
  return actor.isAdmin || Boolean(ownerId && ownerId === actor.memberId);
}

export function allowedReactions(targetType: string) {
  return targetType === "memorial" ? [...MEMORIAL_REACTIONS] : [...GENERAL_REACTIONS];
}

export function sanitizePlain(value: unknown, max = 8000) {
  return String(value || "")
    .replace(/[<>]/g, "")
    .replace(/\u0000/g, "")
    .slice(0, max)
    .trim();
}

export function sanitizeTags(tags: unknown, max = 12) {
  if (!Array.isArray(tags)) {
    return String(tags || "")
      .split(/[،,]/)
      .map((x) => sanitizePlain(x, 40))
      .filter(Boolean)
      .slice(0, max);
  }
  return tags.map((x) => sanitizePlain(x, 40)).filter(Boolean).slice(0, max);
}

export type DatePrecision = "full" | "year" | "month" | "unknown";

export function parsePrecision(value: unknown): DatePrecision {
  return value === "full" || value === "year" || value === "month" ? value : "unknown";
}

export function tehranNow(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Tehran",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const year = Number(parts.find((p) => p.type === "year")?.value);
  const month = Number(parts.find((p) => p.type === "month")?.value);
  const day = Number(parts.find((p) => p.type === "day")?.value);
  return {year, month, day};
}

export function tehranTodayIso(now = new Date()) {
  const t = tehranNow(now);
  return `${t.year}-${String(t.month).padStart(2, "0")}-${String(t.day).padStart(2, "0")}`;
}

export function matchesMonthDay(isoDate: string | null | undefined, precision: DatePrecision, now = new Date()) {
  if (!isoDate || precision !== "full") return false;
  const m = String(isoDate).slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return false;
  const today = tehranNow(now);
  return Number(m[2]) === today.month && Number(m[3]) === today.day;
}

export function yearsAgoLabel(isoDate: string | null | undefined, now = new Date()) {
  const m = String(isoDate || "").slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return 0;
  return Math.max(0, tehranNow(now).year - Number(m[1]));
}

export function searchHaystack(...parts: Array<string | null | undefined>) {
  return normalizePersian(parts.filter(Boolean).join(" "));
}

export function matchesQuery(query: string, ...parts: Array<string | null | undefined>) {
  const q = normalizePersian(query);
  if (!q) return true;
  return searchHaystack(...parts).includes(q);
}

export function fieldVisible(
  fieldPrivacy: Record<string, string> | null | undefined,
  field: string,
  actor: AccessActor,
  ownerId?: string | null,
) {
  if (actor.isAdmin || (ownerId && ownerId === actor.memberId)) return true;
  const vis = parseVisibility(fieldPrivacy?.[field] || "family");
  if (vis === "family") return true;
  if (vis === "private" || vis === "admins") return actor.isAdmin;
  return Boolean(actor.closeMemberIds?.includes(ownerId || ""));
}
