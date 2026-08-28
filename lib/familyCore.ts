import { createClient, SupabaseClient } from "@supabase/supabase-js";

type BaleIdentity = { id: number; first_name?: string; last_name?: string; username?: string };

type FamilyContext = {
  family: { id: string; bale_chat_id: number; name: string; level: number; xp: number; coins: number };
  member: { id: string; bale_user_id: number; display_name: string | null; first_name: string | null; xp: number; coins: number; level: number; streak: number };
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
  const memberPayload = {
    family_id: family.id,
    bale_user_id: user.id,
    first_name: user.first_name ?? null,
    last_name: user.last_name ?? null,
    username: user.username ?? null,
    display_name: displayName,
    last_active_at: new Date().toISOString(),
  };

  const upserted = await supabase.from("members").upsert(memberPayload, { onConflict: "family_id,bale_user_id" }).select("id,bale_user_id,display_name,first_name,xp,coins,level,streak").single();
  if (upserted.error) throw upserted.error;
  return { family, member: upserted.data } as FamilyContext;
}

export async function addActivityReward(ctx: FamilyContext, reason = "message", amountXp = 1) {
  const supabase = db();
  if (!supabase || amountXp <= 0) return;
  const nextXp = Number(ctx.member.xp || 0) + amountXp;
  const nextLevel = Math.max(1, Math.floor(Math.sqrt(nextXp / 50)) + 1);
  await supabase.from("members").update({ xp: nextXp, level: nextLevel, last_active_at: new Date().toISOString() }).eq("id", ctx.member.id);
  await supabase.from("activity_log").insert({ family_id: ctx.family.id, member_id: ctx.member.id, activity_type: reason, xp_delta: amountXp });
}

export async function getProfile(ctx: FamilyContext) {
  const supabase = db();
  if (!supabase) return ctx.member;
  const { data } = await supabase.from("members").select("display_name,xp,coins,level,streak").eq("id", ctx.member.id).single();
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
  const existing = await supabase.from("daily_claims").select("id").eq("member_id", ctx.member.id).eq("claim_date", day).maybeSingle();
  if (existing.data) return { ok: false as const, reason: "claimed" };
  const reward = 25;
  const nextCoins = Number(ctx.member.coins || 0) + reward;
  const insert = await supabase.from("daily_claims").insert({ family_id: ctx.family.id, member_id: ctx.member.id, claim_date: day, reward_coins: reward });
  if (insert.error) throw insert.error;
  await supabase.from("members").update({ coins: nextCoins }).eq("id", ctx.member.id);
  await supabase.from("coin_ledger").insert({ family_id: ctx.family.id, member_id: ctx.member.id, amount: reward, reason: "daily_reward" });
  return { ok: true as const, reward, coins: nextCoins };
}

export async function addWarning(familyId: string, actorId: number, targetId: number, reason?: string) {
  const supabase = db();
  if (!supabase) return null;
  const row = await supabase.from("warnings").insert({ family_id: familyId, actor_bale_user_id: actorId, target_bale_user_id: targetId, reason: reason || null }).select("id").single();
  if (row.error) throw row.error;
  const count = await supabase.from("warnings").select("id", { count: "exact", head: true }).eq("family_id", familyId).eq("target_bale_user_id", targetId).is("cleared_at", null);
  return count.count ?? 1;
}

export async function logModeration(familyId: string, actorId: number | undefined, targetId: number | undefined, action: string, reason?: string) {
  const supabase = db();
  if (!supabase) return;
  await supabase.from("moderation_actions").insert({ family_id: familyId, actor_bale_user_id: actorId ?? null, target_bale_user_id: targetId ?? null, action, reason: reason || null });
}
