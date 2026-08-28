import { createClient } from "@supabase/supabase-js";

function db() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Family Core database is not configured");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function nextBirthday(dateText: string) {
  const birthday = new Date(`${dateText}T00:00:00Z`);
  const now = new Date();
  let next = new Date(Date.UTC(now.getUTCFullYear(), birthday.getUTCMonth(), birthday.getUTCDate()));
  if (next.getTime() < Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())) {
    next = new Date(Date.UTC(now.getUTCFullYear() + 1, birthday.getUTCMonth(), birthday.getUTCDate()));
  }
  const days = Math.ceil((next.getTime() - Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())) / 86400000);
  return { next: next.toISOString(), days };
}

export async function readMiniAppDashboard(familyId: string, userId: number) {
  const supabase = db();
  const now = new Date().toISOString();

  const [familyRes, profileRes, membersRes, leaderboardRes, birthdaysRes, tasksRes, eventsRes, memoriesRes] = await Promise.all([
    supabase.from("families").select("id,name,level,xp,coins,house_level").eq("id", familyId).single(),
    supabase.from("members").select("id,display_name,first_name,relation_label,avatar_url,xp,coins,level,streak,birthday").eq("family_id", familyId).eq("bale_user_id", userId).maybeSingle(),
    supabase.from("members").select("id", { count: "exact", head: true }).eq("family_id", familyId),
    supabase.from("members").select("bale_user_id,display_name,first_name,avatar_url,xp,coins,level").eq("family_id", familyId).order("xp", { ascending: false }).limit(10),
    supabase.from("members").select("display_name,first_name,avatar_url,birthday").eq("family_id", familyId).not("birthday", "is", null),
    supabase.from("tasks").select("id,title,status,due_at,reward_coins,assignee_member_id").eq("family_id", familyId).in("status", ["open", "doing"]).order("due_at", { ascending: true, nullsFirst: false }).limit(6),
    supabase.from("family_events").select("id,title,event_type,starts_at").eq("family_id", familyId).gte("starts_at", now).order("starts_at", { ascending: true }).limit(6),
    supabase.from("memories").select("id", { count: "exact", head: true }).eq("family_id", familyId),
  ]);

  for (const result of [familyRes, profileRes, membersRes, leaderboardRes, birthdaysRes, tasksRes, eventsRes, memoriesRes]) {
    if (result.error) throw result.error;
  }

  const birthdays = (birthdaysRes.data ?? [])
    .map((row) => ({ ...row, ...nextBirthday(row.birthday as string) }))
    .sort((a, b) => a.days - b.days)
    .slice(0, 5);

  const leaderboard = leaderboardRes.data ?? [];
  const rankIndex = leaderboard.findIndex((row) => Number(row.bale_user_id) === Number(userId));
  const family = familyRes.data;
  const familyXp = Number(family.xp || 0);
  const levelBase = Math.max(1, Number(family.level || 1));
  const levelFloor = Math.max(0, (levelBase - 1) * 500);
  const levelCeil = levelBase * 500;

  return {
    family: {
      id: family.id,
      name: family.name,
      level: levelBase,
      xp: familyXp,
      coins: Number(family.coins || 0),
      houseLevel: Number(family.house_level || 1),
      membersCount: membersRes.count ?? 0,
      upcomingEventsCount: eventsRes.data?.length ?? 0,
      upcomingBirthdaysCount: birthdays.filter((b) => b.days <= 30).length,
      memoriesCount: memoriesRes.count ?? 0,
      levelProgress: {
        current: Math.max(0, familyXp - levelFloor),
        target: Math.max(1, levelCeil - levelFloor),
      },
    },
    profile: profileRes.data ? { ...profileRes.data, rank: rankIndex >= 0 ? rankIndex + 1 : null } : null,
    leaderboard,
    birthdays,
    tasks: tasksRes.data ?? [],
    events: eventsRes.data ?? [],
    generatedAt: now,
  };
}
