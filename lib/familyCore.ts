import { createClient, SupabaseClient } from "@supabase/supabase-js";

type BaleIdentity = { id: number; first_name?: string; last_name?: string; username?: string };

type FamilyContext = {
  family: { id: string; bale_chat_id: number; name: string; level: number; xp: number; coins: number };
  member: { id: string; bale_user_id: number; display_name: string | null; first_name: string | null; xp: number; coins: number; level: number; streak: number };
};

export type GroupSettings = {
  anti_flood: boolean;
  anti_link: boolean;
  flood_limit: number;
  flood_window_seconds: number;
  flood_mute_minutes: number;
  warn_limit: number;
  welcome_enabled: boolean;
};

let client: SupabaseClient | null = null;
function db() {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return client;
}

export function familyCoreEnabled() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export async function ensureFamilyMember(chatId: number, chatTitle: string | undefined, user: BaleIdentity): Promise<FamilyContext | null> {
  const supabase = db();
  if (!supabase) return null;
  let { data: family, error: familyError } = await supabase.from("families").select("id,bale_chat_id,name,level,xp,coins").eq("bale_chat_id", chatId).maybeSingle();
  if (familyError) throw familyError;
  if (!family) {
    const inserted = await supabase.from("families").insert({ bale_chat_id: chatId, name: chatTitle || "خانواده ما" }).select("id,bale_chat_id,name,level,xp,coins").single();
    if (inserted.error) throw inserted.error;
    family = inserted.data;
  }
  const displayName = [user.first_name, user.last_name].filter(Boolean).join(" ") || user.username || `عضو ${user.id}`;
  const memberPayload = { family_id: family.id, bale_user_id: user.id, first_name: user.first_name ?? null, last_name: user.last_name ?? null, username: user.username ?? null, display_name: displayName, last_active_at: new Date().toISOString() };
  const upserted = await supabase.from("members").upsert(memberPayload, { onConflict: "family_id,bale_user_id" }).select("id,bale_user_id,display_name,first_name,xp,coins,level,streak").single();
  if (upserted.error) throw upserted.error;
  await supabase.from("group_settings").upsert({ family_id: family.id }, { onConflict: "family_id", ignoreDuplicates: true });
  return { family, member: upserted.data } as FamilyContext;
}

export async function addActivityReward(ctx: FamilyContext, reason = "message", amountXp = 1) {
  const supabase = db();
  if (!supabase || amountXp <= 0) return;
  const reward = await supabase.rpc("family_add_member_xp", { p_member_id: ctx.member.id, p_delta: amountXp });
  if (reward.error) throw reward.error;
  await supabase.from("activity_log").insert({ family_id: ctx.family.id, member_id: ctx.member.id, activity_type: reason, xp_delta: amountXp });
}

export async function getProfile(ctx: FamilyContext) {
  const supabase = db();
  if (!supabase) return ctx.member;
  const { data } = await supabase.from("members").select("display_name,first_name,xp,coins,level,streak").eq("id", ctx.member.id).single();
  return data ?? ctx.member;
}

export async function getLeaderboard(familyId: string, limit = 10) {
  const supabase = db();
  if (!supabase) return [];
  const { data } = await supabase.from("members").select("display_name,first_name,xp,level,coins").eq("family_id", familyId).order("xp", { ascending: false }).limit(limit);
  return data ?? [];
}

export async function claimDaily(ctx: FamilyContext) {
  const supabase = db();
  if (!supabase) return { ok: false as const, reason: "disabled" };
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tehran", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const result = await supabase.rpc("family_claim_daily_atomic", { p_family_id: ctx.family.id, p_member_id: ctx.member.id, p_claim_date: day, p_reward: 25 });
  if (result.error) throw result.error;
  const row = result.data as { claimed?: boolean; reward?: number; coins?: number } | null;
  if (!row?.claimed) return { ok: false as const, reason: "claimed" };
  return { ok: true as const, reward: Number(row.reward || 25), coins: Number(row.coins || 0) };
}

export async function addWarning(familyId: string, actorId: number, targetId: number, reason?: string) {
  const supabase = db();
  if (!supabase) return 0;
  const row = await supabase.from("warnings").insert({ family_id: familyId, actor_bale_user_id: actorId, target_bale_user_id: targetId, reason: reason || null }).select("id").single();
  if (row.error) throw row.error;
  return countWarnings(familyId, targetId);
}

export async function countWarnings(familyId: string, targetId: number) {
  const supabase = db();
  if (!supabase) return 0;
  const count = await supabase.from("warnings").select("id", { count: "exact", head: true }).eq("family_id", familyId).eq("target_bale_user_id", targetId).is("cleared_at", null);
  return count.count ?? 0;
}

export async function clearWarnings(familyId: string, targetId: number) {
  const supabase = db();
  if (!supabase) return;
  await supabase.from("warnings").update({ cleared_at: new Date().toISOString() }).eq("family_id", familyId).eq("target_bale_user_id", targetId).is("cleared_at", null);
}

export async function getGroupSettings(familyId: string): Promise<GroupSettings> {
  const defaults: GroupSettings = { anti_flood: true, anti_link: false, flood_limit: 5, flood_window_seconds: 5, flood_mute_minutes: 10, warn_limit: 3, welcome_enabled: true };
  const supabase = db();
  if (!supabase) return defaults;
  const { data } = await supabase.from("group_settings").select("anti_flood,anti_link,flood_limit,flood_window_seconds,flood_mute_minutes,warn_limit,welcome_enabled").eq("family_id", familyId).maybeSingle();
  return { ...defaults, ...(data ?? {}) };
}

export async function recordFloodEvent(familyId: string, userId: number, settings: GroupSettings) {
  const supabase = db();
  if (!supabase || !settings.anti_flood) return { exceeded: false, count: 0 };
  const cutoff = new Date(Date.now() - settings.flood_window_seconds * 1000).toISOString();
  await supabase.from("flood_events").insert({ family_id: familyId, bale_user_id: userId });
  const result = await supabase.from("flood_events").select("id", { count: "exact", head: true }).eq("family_id", familyId).eq("bale_user_id", userId).gte("created_at", cutoff);
  const count = result.count ?? 0;
  if (count > settings.flood_limit) {
    await supabase.from("flood_events").delete().eq("family_id", familyId).eq("bale_user_id", userId).lt("created_at", new Date().toISOString());
  }
  return { exceeded: count > settings.flood_limit, count };
}

export async function logModeration(familyId: string, actorId: number | undefined, targetId: number | undefined, action: string, reason?: string) {
  const supabase = db();
  if (!supabase) return;
  await supabase.from("moderation_actions").insert({ family_id: familyId, actor_bale_user_id: actorId ?? null, target_bale_user_id: targetId ?? null, action, reason: reason || null });
}

export async function createQuizSession(ctx: FamilyContext) {
  const supabase = db();
  if (!supabase) return null;
  const bank = [
    { q: "کدام سیاره به سیاره سرخ معروف است؟", options: ["زمین", "مریخ", "زهره", "مشتری"], answer: "1" },
    { q: "حاصل ۷ × ۸ چند است؟", options: ["۵۴", "۵۶", "۵۸", "۶۴"], answer: "1" },
    { q: "پایتخت ایران کدام شهر است؟", options: ["شیراز", "تهران", "تبریز", "مشهد"], answer: "1" },
    { q: "کدام حیوان سریع‌ترین جانور خشکی است؟", options: ["یوزپلنگ", "اسب", "گرگ", "شیر"], answer: "0" },
  ];
  const quiz = bank[Math.floor(Math.random() * bank.length)];
  const insert = await supabase.from("game_sessions").insert({ family_id: ctx.family.id, chat_id: ctx.family.bale_chat_id, game_type: "quiz", prompt: quiz.q, answer: quiz.answer, options: quiz.options, reward_coins: 15, expires_at: new Date(Date.now() + 120000).toISOString() }).select("id,prompt,options,reward_coins").single();
  if (insert.error) throw insert.error;
  return insert.data as { id: string; prompt: string; options: string[]; reward_coins: number };
}

export async function resolveQuiz(sessionId: string, userId: number, optionIndex: number, ctx: FamilyContext) {
  const supabase = db();
  if (!supabase) return { ok: false as const, reason: "disabled" };
  const { data: session } = await supabase.from("game_sessions").select("id,answer,reward_coins,status,expires_at").eq("id", sessionId).maybeSingle();
  if (!session || session.status !== "open") return { ok: false as const, reason: "closed" };
  if (session.expires_at && new Date(session.expires_at).getTime() < Date.now()) {
    await supabase.from("game_sessions").update({ status: "closed" }).eq("id", sessionId);
    return { ok: false as const, reason: "expired" };
  }
  if (String(optionIndex) !== String(session.answer)) return { ok: false as const, reason: "wrong" };
  const reward = Number(session.reward_coins || 15);
  const won = await supabase.from("game_sessions").update({ status: "closed", winner_bale_user_id: userId }).eq("id", sessionId).eq("status", "open").select("id").maybeSingle();
  if (!won.data) return { ok: false as const, reason: "closed" };
  const balance = await supabase.rpc("family_add_member_coins", { p_member_id: ctx.member.id, p_delta: reward });
  if (balance.error) throw balance.error;
  await supabase.from("coin_ledger").insert({ family_id: ctx.family.id, member_id: ctx.member.id, amount: reward, reason: "quiz_win", reference_type: "game_session", reference_id: sessionId });
  await addActivityReward(ctx, "quiz_win", 10);
  return { ok: true as const, reward };
}