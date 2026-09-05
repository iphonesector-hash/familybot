import {createClient} from "@supabase/supabase-js";
import {isAdmin} from "@/lib/bale";
import {isFamilyFounder} from "@/lib/familyMutations";
import {
  AccessActor,
  ALBUM_PRESETS,
  ARTICLE_CATEGORIES,
  allowedReactions,
  canEditRecord,
  canSeeRecord,
  defaultPublishStatus,
  matchesMonthDay,
  matchesQuery,
  parseModeration,
  parsePrecision,
  parseVisibility,
  sanitizePlain,
  sanitizeTags,
  tehranTodayIso,
  yearsAgoLabel,
} from "@/lib/familyLegacyPrivacy";

const MEMORY_BUCKET = "familybot-memories";

function db() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Family Core database is not configured");
  return createClient(url, key, {db: {schema: "familybot"}, auth: {persistSession: false, autoRefreshToken: false}});
}

async function actorFor(familyId: string, chatId: number, userId: number): Promise<AccessActor & {userId: number; familyId: string}> {
  const s = db();
  const me = await s.from("members").select("id").eq("family_id", familyId).eq("bale_user_id", userId).maybeSingle();
  if (me.error) throw me.error;
  if (!me.data) throw new Error("member_not_found");
  const admin = (await isFamilyFounder(familyId, userId).catch(() => false)) || (await isAdmin(chatId, userId).catch(() => false));
  const inbound = await s.from("family_close_circle").select("member_id").eq("family_id", familyId).eq("close_member_id", me.data.id);
  return {
    memberId: me.data.id,
    isAdmin: admin,
    closeMemberIds: (inbound.data || []).map((x) => x.member_id),
    userId,
    familyId,
  };
}

async function memberNameMap(familyId: string) {
  const r = await db().from("members").select("id,display_name,first_name,last_name,avatar_url,birthday,relation_label").eq("family_id", familyId);
  if (r.error) throw r.error;
  const map = new Map<string, {id: string; name: string; avatar_url?: string | null; birthday?: string | null; relation_label?: string | null}>();
  for (const m of r.data || []) {
    const name = (m.display_name || [m.first_name, m.last_name].filter(Boolean).join(" ") || "عضو خانواده").trim();
    map.set(m.id, {id: m.id, name, avatar_url: m.avatar_url, birthday: m.birthday, relation_label: m.relation_label});
  }
  return map;
}

async function signedMedia(url?: string | null) {
  if (!url) return null;
  if (!url.startsWith("storage:")) return url;
  const signed = await db().storage.from(MEMORY_BUCKET).createSignedUrl(url.slice(8), 60 * 30);
  return signed.error ? null : signed.data.signedUrl;
}

function visible<T extends {visibility?: string; moderation_status?: string; created_by?: string | null; author_member_id?: string | null; uploader_member_id?: string | null; creator_member_id?: string | null; member_id?: string | null}>(actor: AccessActor, rows: T[], extraRelated?: (row: T) => string[]) {
  return rows.filter((row) =>
    canSeeRecord(actor, {
      visibility: String(row.visibility || "family"),
      moderation_status: String(row.moderation_status || "approved"),
      ownerId: row.created_by || row.author_member_id || row.uploader_member_id || row.creator_member_id || null,
      relatedMemberIds: extraRelated ? extraRelated(row) : row.member_id ? [row.member_id] : [],
    }),
  );
}

export async function readLegacyHome(familyId: string, chatId: number, userId: number) {
  const actor = await actorFor(familyId, chatId, userId);
  const s = db();
  const [articles, legends, memorials, profiles, albums, media, journal, events, memories, members] = await Promise.all([
    s.from("family_legacy_articles").select("id,title,cover_url,category,tags,visibility,moderation_status,featured,view_count,author_member_id,created_by,created_at,updated_at").eq("family_id", familyId).order("updated_at", {ascending: false}).limit(40),
    s.from("family_legends").select("id,full_name,photo_url,occupation,why_important,featured,visibility,moderation_status,member_id,created_by,created_at").eq("family_id", familyId).order("created_at", {ascending: false}).limit(20),
    s.from("family_memorials").select("id,name,portrait_url,birth_date,death_date,birth_precision,death_precision,visibility,moderation_status,member_id,created_by,created_at").eq("family_id", familyId).order("created_at", {ascending: false}).limit(20),
    s.from("family_people_profiles").select("id,member_id,first_name,last_name,photo_url,relationship_label,short_bio,city,visibility,moderation_status,created_by,created_at").eq("family_id", familyId).order("updated_at", {ascending: false}).limit(24),
    s.from("family_albums").select("id,title,description,cover_url,album_key,visibility,moderation_status,creator_member_id,created_at").eq("family_id", familyId).order("created_at", {ascending: false}).limit(20),
    s.from("family_legacy_media").select("id,title,media_url,media_kind,taken_on,taken_precision,visibility,moderation_status,uploader_member_id,album_id,created_at").eq("family_id", familyId).order("created_at", {ascending: false}).limit(30),
    s.from("family_journal_posts").select("id,title,body,kind,cover_url,tags,visibility,moderation_status,author_member_id,happened_on,happened_precision,created_at").eq("family_id", familyId).order("created_at", {ascending: false}).limit(20),
    s.from("family_legacy_events").select("id,title,description,event_kind,event_date,date_precision,related_member_ids,visibility,moderation_status,creator_member_id,created_at").eq("family_id", familyId).limit(80),
    s.from("memories").select("id,title,caption,media_url,memory_date,visibility,creator_member_id,created_at").eq("family_id", familyId).limit(80),
    s.from("members").select("id,display_name,first_name,last_name,birthday,relation_label,avatar_url").eq("family_id", familyId),
  ]);
  for (const r of [articles, legends, memorials, profiles, albums, media, journal, events, memories, members]) if (r.error) throw r.error;

  const aArticles = visible(actor, articles.data || []);
  const aLegends = visible(actor, legends.data || []);
  const aMemorials = visible(actor, memorials.data || []);
  const aProfiles = visible(actor, profiles.data || []);
  const aAlbums = visible(actor, albums.data || []);
  const aMedia = visible(actor, media.data || []);
  const aJournal = visible(actor, journal.data || []);
  const aEvents = visible(actor, events.data || []);
  const today = await buildTodayCards(actor, {
    members: members.data || [],
    memorials: aMemorials,
    profiles: aProfiles,
    events: aEvents,
    memories: (memories.data || []).filter((m) => m.visibility === "family" || m.creator_member_id === actor.memberId),
    media: aMedia,
    journal: aJournal,
  });

  return {
    me: {id: actor.memberId, isAdmin: actor.isAdmin},
    categories: ARTICLE_CATEGORIES,
    albumPresets: ALBUM_PRESETS,
    today,
    latestJournal: aJournal.slice(0, 6).map((p) => ({...p, body: String(p.body || "").slice(0, 180)})),
    latestArticles: aArticles.slice(0, 6),
    featuredArticles: aArticles.filter((x) => x.featured).slice(0, 4),
    oldPhotos: await Promise.all(aMedia.filter((m) => m.media_kind === "image").slice(0, 8).map(async (m) => ({...m, media_url: await signedMedia(m.media_url)}))),
    legends: aLegends.filter((x) => x.moderation_status === "approved").slice(0, 6),
    memorials: aMemorials.filter((x) => x.moderation_status === "approved").slice(0, 6),
    people: aProfiles.slice(0, 8),
    albums: aAlbums.slice(0, 8),
    counts: {
      articles: aArticles.length,
      legends: aLegends.length,
      memorials: aMemorials.length,
      people: aProfiles.length,
      albums: aAlbums.length,
      journal: aJournal.length,
    },
  };
}

async function buildTodayCards(actor: AccessActor, input: {
  members: Array<{id: string; display_name?: string | null; first_name?: string | null; last_name?: string | null; birthday?: string | null}>;
  memorials: Array<{id: string; name: string; death_date?: string | null; death_precision?: string; birth_date?: string | null; birth_precision?: string}>;
  profiles: Array<{id: string; member_id: string; first_name?: string | null; last_name?: string | null; marriage_date?: string | null; marriage_precision?: string}>;
  events: Array<{id: string; title: string; event_date?: string | null; date_precision?: string}>;
  memories: Array<{id: string; title?: string | null; memory_date?: string | null}>;
  media: Array<{id: string; title?: string | null; taken_on?: string | null; taken_precision?: string}>;
  journal: Array<{id: string; title: string; happened_on?: string | null; happened_precision?: string}>;
}) {
  const cards: Array<{kind: string; title: string; text: string; href: string}> = [];
  const nameOf = (m: {display_name?: string | null; first_name?: string | null; last_name?: string | null}) =>
    (m.display_name || [m.first_name, m.last_name].filter(Boolean).join(" ") || "عضو خانواده").trim();

  for (const m of input.members) {
    if (matchesMonthDay(m.birthday, "full")) {
      const years = yearsAgoLabel(m.birthday);
      cards.push({kind: "birthday", title: `امروز تولد ${nameOf(m)} است`, text: years ? `${years} سال پیش در چنین روزی به دنیا آمد.` : "تولد امروز.", href: `/section/legacy/people?member=${m.id}`});
    }
  }
  for (const m of input.memorials) {
    if (matchesMonthDay(m.death_date, parsePrecision(m.death_precision))) {
      const years = yearsAgoLabel(m.death_date);
      cards.push({kind: "memorial", title: `امروز سالگرد درگذشت ${m.name} است`, text: years ? `در چنین روزی ${years} سال پیش آسمانی شد.` : "یادش گرامی.", href: `/section/legacy/memorials/${m.id}`});
    }
  }
  for (const p of input.profiles) {
    if (matchesMonthDay((p as {marriage_date?: string}).marriage_date, parsePrecision((p as {marriage_precision?: string}).marriage_precision))) {
      const years = yearsAgoLabel((p as {marriage_date?: string}).marriage_date);
      const n = [p.first_name, p.last_name].filter(Boolean).join(" ") || "زوج خانواده";
      cards.push({kind: "wedding", title: `امروز سالگرد ازدواج ${n} است`, text: years ? `${years} سال از پیوندشان می‌گذرد.` : "سالگرد ازدواج.", href: `/section/legacy/people/${p.id}`});
    }
  }
  for (const e of input.events) {
    if (matchesMonthDay(e.event_date, parsePrecision(e.date_precision))) {
      const years = yearsAgoLabel(e.event_date);
      cards.push({kind: "event", title: e.title, text: years ? `در چنین روزی ${years} سال پیش این رویداد رخ داد.` : "رویداد خانوادگی امروز.", href: "/section/legacy/encyclopedia"});
    }
  }
  for (const mem of input.memories) {
    if (matchesMonthDay(mem.memory_date, "full")) {
      const years = yearsAgoLabel(mem.memory_date);
      cards.push({kind: "photo", title: mem.title || "عکس قدیمی", text: years ? `در چنین روزی ${years} سال پیش این عکس ثبت شده.` : "عکس ثبت‌شده در چنین روزی.", href: "/section/memories"});
    }
  }
  for (const media of input.media) {
    if (matchesMonthDay(media.taken_on, parsePrecision(media.taken_precision))) {
      const years = yearsAgoLabel(media.taken_on);
      cards.push({kind: "photo", title: media.title || "تصویر خانوادگی", text: years ? `در چنین روزی ${years} سال پیش این تصویر ثبت شده.` : "تصویر این روز.", href: `/section/legacy/gallery/${media.id}`});
    }
  }
  for (const j of input.journal) {
    if (matchesMonthDay(j.happened_on, parsePrecision(j.happened_precision))) {
      cards.push({kind: "journal", title: j.title, text: "خاطره‌ای که برای چنین روزی نوشته شده.", href: `/section/legacy/journal/${j.id}`});
    }
  }
  void actor;
  return cards.slice(0, 8);
}

export async function searchLegacy(familyId: string, chatId: number, userId: number, query: string) {
  const actor = await actorFor(familyId, chatId, userId);
  const s = db();
  const q = sanitizePlain(query, 80);
  const [articles, legends, memorials, profiles, albums, media, journal, members] = await Promise.all([
    s.from("family_legacy_articles").select("id,title,body,category,tags,visibility,moderation_status,author_member_id,created_by").eq("family_id", familyId).limit(80),
    s.from("family_legends").select("id,full_name,biography,occupation,visibility,moderation_status,created_by,member_id").eq("family_id", familyId).limit(80),
    s.from("family_memorials").select("id,name,biography,visibility,moderation_status,created_by,member_id").eq("family_id", familyId).limit(80),
    s.from("family_people_profiles").select("id,first_name,last_name,short_bio,occupation,city,visibility,moderation_status,created_by,member_id").eq("family_id", familyId).limit(80),
    s.from("family_albums").select("id,title,description,visibility,moderation_status,creator_member_id").eq("family_id", familyId).limit(80),
    s.from("family_legacy_media").select("id,title,description,visibility,moderation_status,uploader_member_id").eq("family_id", familyId).limit(80),
    s.from("family_journal_posts").select("id,title,body,tags,visibility,moderation_status,author_member_id").eq("family_id", familyId).limit(80),
    s.from("members").select("id,display_name,first_name,last_name,relation_label").eq("family_id", familyId).limit(200),
  ]);
  for (const r of [articles, legends, memorials, profiles, albums, media, journal, members]) if (r.error) throw r.error;
  const people = (members.data || [])
    .filter((m) => matchesQuery(q, m.display_name, m.first_name, m.last_name, m.relation_label))
    .slice(0, 8)
    .map((m) => ({type: "person" as const, id: m.id, title: (m.display_name || [m.first_name, m.last_name].filter(Boolean).join(" ") || "عضو").trim(), href: `/section/legacy/people?member=${m.id}`}));
  return {
    query: q,
    results: [
      ...people,
      ...visible(actor, articles.data || []).filter((x) => matchesQuery(q, x.title, x.body, x.category, (x.tags || []).join(" "))).slice(0, 8).map((x) => ({type: "article" as const, id: x.id, title: x.title, href: `/section/legacy/encyclopedia/${x.id}`})),
      ...visible(actor, legends.data || []).filter((x) => matchesQuery(q, x.full_name, x.biography, x.occupation)).slice(0, 6).map((x) => ({type: "legend" as const, id: x.id, title: x.full_name, href: `/section/legacy/legends/${x.id}`})),
      ...visible(actor, memorials.data || []).filter((x) => matchesQuery(q, x.name, x.biography)).slice(0, 6).map((x) => ({type: "memorial" as const, id: x.id, title: x.name, href: `/section/legacy/memorials/${x.id}`})),
      ...visible(actor, profiles.data || []).filter((x) => matchesQuery(q, x.first_name, x.last_name, x.short_bio, x.occupation, x.city)).slice(0, 6).map((x) => ({type: "profile" as const, id: x.id, title: [x.first_name, x.last_name].filter(Boolean).join(" ") || "معرفی", href: `/section/legacy/people/${x.id}`})),
      ...visible(actor, albums.data || []).filter((x) => matchesQuery(q, x.title, x.description)).slice(0, 6).map((x) => ({type: "album" as const, id: x.id, title: x.title, href: `/section/legacy/gallery?album=${x.id}`})),
      ...visible(actor, media.data || []).filter((x) => matchesQuery(q, x.title, x.description)).slice(0, 6).map((x) => ({type: "photo" as const, id: x.id, title: x.title || "تصویر", href: `/section/legacy/gallery/${x.id}`})),
      ...visible(actor, journal.data || []).filter((x) => matchesQuery(q, x.title, x.body, (x.tags || []).join(" "))).slice(0, 6).map((x) => ({type: "journal" as const, id: x.id, title: x.title, href: `/section/legacy/journal/${x.id}`})),
    ],
  };
}

export async function listArticles(familyId: string, chatId: number, userId: number, opts?: {category?: string}) {
  const actor = await actorFor(familyId, chatId, userId);
  let q = db().from("family_legacy_articles").select("id,title,cover_url,category,tags,visibility,moderation_status,featured,view_count,author_member_id,created_by,created_at,updated_at").eq("family_id", familyId).order("updated_at", {ascending: false}).limit(80);
  if (opts?.category) q = q.eq("category", opts.category);
  const r = await q;
  if (r.error) throw r.error;
  return {me: actor, categories: ARTICLE_CATEGORIES, items: visible(actor, r.data || [])};
}

export async function getArticle(familyId: string, chatId: number, userId: number, id: string) {
  const actor = await actorFor(familyId, chatId, userId);
  const s = db();
  const article = await s.from("family_legacy_articles").select("*").eq("id", id).eq("family_id", familyId).maybeSingle();
  if (article.error) throw article.error;
  if (!article.data || !visible(actor, [article.data]).length) throw new Error("not_found");
  await s.from("family_legacy_articles").update({view_count: Number(article.data.view_count || 0) + 1}).eq("id", id).eq("family_id", familyId);
  const [links, members, related, comments, reactions, revisions] = await Promise.all([
    s.from("family_legacy_article_links").select("related_article_id").eq("article_id", id),
    s.from("family_legacy_article_members").select("member_id").eq("article_id", id),
    s.from("family_legacy_articles").select("id,title,category,cover_url,visibility,moderation_status,author_member_id,created_by").eq("family_id", familyId).neq("id", id).limit(12),
    loadComments(familyId, "article", id),
    loadReactions(familyId, "article", id),
    s.from("family_legacy_article_revisions").select("id,title,created_at,editor_member_id").eq("article_id", id).order("created_at", {ascending: false}).limit(20),
  ]);
  const names = await memberNameMap(familyId);
  const relatedVisible = visible(actor, related.data || []).slice(0, 4);
  return {
    me: actor,
    article: {...article.data, cover_url: await signedMedia(article.data.cover_url)},
    relatedMembers: (members.data || []).map((x) => names.get(x.member_id)).filter(Boolean),
    relatedArticles: relatedVisible,
    comments,
    reactions,
    revisions: revisions.data || [],
    canEdit: canEditRecord(actor, article.data.author_member_id || article.data.created_by),
  };
}

export async function saveArticle(familyId: string, chatId: number, userId: number, input: Record<string, unknown>) {
  const actor = await actorFor(familyId, chatId, userId);
  const s = db();
  const title = sanitizePlain(input.title, 160);
  if (!title) throw new Error("title_required");
  const body = sanitizePlain(input.body, 20000);
  const category = ARTICLE_CATEGORIES.includes(input.category as typeof ARTICLE_CATEGORIES[number]) ? String(input.category) : ARTICLE_CATEGORIES[0];
  const visibility = parseVisibility(input.visibility);
  const status = defaultPublishStatus(actor.isAdmin, input.moderation_status);
  const payload = {
    family_id: familyId,
    author_member_id: actor.memberId,
    title,
    body,
    category,
    tags: sanitizeTags(input.tags),
    cover_url: sanitizePlain(input.cover_url, 1500) || null,
    visibility,
    moderation_status: status,
    featured: actor.isAdmin ? Boolean(input.featured) : false,
    created_by: actor.memberId,
    updated_by: actor.memberId,
    updated_at: new Date().toISOString(),
  };
  const id = input.id ? String(input.id) : "";
  let row;
  if (id) {
    const existing = await s.from("family_legacy_articles").select("id,author_member_id,created_by").eq("id", id).eq("family_id", familyId).maybeSingle();
    if (existing.error) throw existing.error;
    if (!existing.data) throw new Error("not_found");
    if (!canEditRecord(actor, existing.data.author_member_id || existing.data.created_by)) throw new Error("forbidden");
    const upd = await s.from("family_legacy_articles").update({...payload, created_by: existing.data.created_by}).eq("id", id).select("*").single();
    if (upd.error) throw upd.error;
    row = upd.data;
    await s.from("family_legacy_article_revisions").insert({article_id: id, editor_member_id: actor.memberId, title, body, category});
  } else {
    const ins = await s.from("family_legacy_articles").insert(payload).select("*").single();
    if (ins.error) throw ins.error;
    row = ins.data;
    await s.from("family_legacy_article_revisions").insert({article_id: row.id, editor_member_id: actor.memberId, title, body, category});
  }
  const memberIds = [...new Set((Array.isArray(input.relatedMemberIds) ? input.relatedMemberIds : []).map(String).filter(Boolean))].slice(0, 30);
  await s.from("family_legacy_article_members").delete().eq("article_id", row.id);
  if (memberIds.length) await s.from("family_legacy_article_members").insert(memberIds.map((member_id) => ({article_id: row.id, member_id})));
  return row;
}

export async function moderateLegacy(familyId: string, chatId: number, userId: number, input: {targetType: string; id: string; status: string}) {
  const actor = await actorFor(familyId, chatId, userId);
  if (!actor.isAdmin) throw new Error("admin_required");
  const status = parseModeration(input.status);
  const table = tableFor(input.targetType);
  const r = await db().from(table).update({moderation_status: status, updated_by: actor.memberId}).eq("id", input.id).eq("family_id", familyId).select("id,moderation_status").maybeSingle();
  if (r.error) throw r.error;
  if (!r.data) throw new Error("not_found");
  return r.data;
}

function tableFor(type: string) {
  switch (type) {
    case "article": return "family_legacy_articles";
    case "legend": return "family_legends";
    case "memorial": return "family_memorials";
    case "profile": return "family_people_profiles";
    case "journal": return "family_journal_posts";
    case "media": return "family_legacy_media";
    case "album": return "family_albums";
    default: throw new Error("invalid_target");
  }
}

export async function listPeople(familyId: string, chatId: number, userId: number) {
  const actor = await actorFor(familyId, chatId, userId);
  const s = db();
  const [profiles, members] = await Promise.all([
    s.from("family_people_profiles").select("*").eq("family_id", familyId).order("updated_at", {ascending: false}),
    s.from("members").select("id,display_name,first_name,last_name,relation_label,avatar_url,birthday,bio").eq("family_id", familyId).order("created_at"),
  ]);
  if (profiles.error) throw profiles.error;
  if (members.error) throw members.error;
  return {me: actor, profiles: visible(actor, profiles.data || []), members: members.data || []};
}

export async function getPerson(familyId: string, chatId: number, userId: number, id: string) {
  const actor = await actorFor(familyId, chatId, userId);
  const s = db();
  const profile = await s.from("family_people_profiles").select("*").eq("id", id).eq("family_id", familyId).maybeSingle();
  if (profile.error) throw profile.error;
  if (!profile.data || !visible(actor, [profile.data]).length) throw new Error("not_found");
  const member = profile.data.member_id
    ? await s.from("members").select("id,display_name,first_name,last_name,relation_label,avatar_url,birthday,bio").eq("id", profile.data.member_id).maybeSingle()
    : {data: null, error: null};
  const related = await s.from("family_people_relations").select("related_member_id").eq("profile_id", id);
  const names = await memberNameMap(familyId);
  return {
    me: actor,
    profile: {...profile.data, photo_url: await signedMedia(profile.data.photo_url)},
    member: member.data,
    related: (related.data || []).map((x) => names.get(x.related_member_id)).filter(Boolean),
    comments: await loadComments(familyId, "profile", id),
    reactions: await loadReactions(familyId, "profile", id),
    canEdit: canEditRecord(actor, profile.data.created_by),
  };
}

export async function savePerson(familyId: string, chatId: number, userId: number, input: Record<string, unknown>) {
  const actor = await actorFor(familyId, chatId, userId);
  const memberId = String(input.member_id || input.memberId || actor.memberId);
  const belongs = await db().from("members").select("id").eq("id", memberId).eq("family_id", familyId).maybeSingle();
  if (!belongs.data) throw new Error("member_not_found");
  if (!actor.isAdmin && memberId !== actor.memberId) throw new Error("forbidden");
  const payload = {
    family_id: familyId,
    member_id: memberId,
    first_name: sanitizePlain(input.first_name, 80) || null,
    last_name: sanitizePlain(input.last_name, 80) || null,
    photo_url: sanitizePlain(input.photo_url, 1500) || null,
    relationship_label: sanitizePlain(input.relationship_label, 80) || null,
    short_bio: sanitizePlain(input.short_bio, 800) || null,
    occupation: sanitizePlain(input.occupation, 120) || null,
    city: sanitizePlain(input.city, 80) || null,
    interests: sanitizePlain(input.interests, 400) || null,
    hobbies: sanitizePlain(input.hobbies, 400) || null,
    personal_story: sanitizePlain(input.personal_story, 8000) || null,
    family_branch: sanitizePlain(input.family_branch, 120) || null,
    birthday: input.birthday ? String(input.birthday).slice(0, 10) : null,
    birthday_precision: parsePrecision(input.birthday_precision || (input.birthday ? "full" : "unknown")),
    marriage_date: input.marriage_date ? String(input.marriage_date).slice(0, 10) : null,
    marriage_precision: parsePrecision(input.marriage_precision || (input.marriage_date ? "full" : "unknown")),
    visibility: parseVisibility(input.visibility),
    field_privacy: typeof input.field_privacy === "object" && input.field_privacy ? input.field_privacy : {},
    moderation_status: defaultPublishStatus(actor.isAdmin, input.moderation_status || "approved"),
    created_by: actor.memberId,
    updated_by: actor.memberId,
    updated_at: new Date().toISOString(),
  };
  const existing = await db().from("family_people_profiles").select("id").eq("family_id", familyId).eq("member_id", memberId).maybeSingle();
  if (existing.data) {
    const upd = await db().from("family_people_profiles").update(payload).eq("id", existing.data.id).select("*").single();
    if (upd.error) throw upd.error;
    return upd.data;
  }
  const ins = await db().from("family_people_profiles").insert(payload).select("*").single();
  if (ins.error) throw ins.error;
  return ins.data;
}

export async function listLegends(familyId: string, chatId: number, userId: number) {
  const actor = await actorFor(familyId, chatId, userId);
  const r = await db().from("family_legends").select("*").eq("family_id", familyId).order("featured", {ascending: false}).order("created_at", {ascending: false});
  if (r.error) throw r.error;
  return {me: actor, items: visible(actor, r.data || [])};
}

export async function getLegend(familyId: string, chatId: number, userId: number, id: string) {
  const actor = await actorFor(familyId, chatId, userId);
  const r = await db().from("family_legends").select("*").eq("id", id).eq("family_id", familyId).maybeSingle();
  if (r.error) throw r.error;
  if (!r.data || !visible(actor, [r.data]).length) throw new Error("not_found");
  return {
    me: actor,
    item: {...r.data, photo_url: await signedMedia(r.data.photo_url)},
    comments: await loadComments(familyId, "legend", id),
    reactions: await loadReactions(familyId, "legend", id),
    canEdit: canEditRecord(actor, r.data.created_by),
  };
}

export async function saveLegend(familyId: string, chatId: number, userId: number, input: Record<string, unknown>) {
  const actor = await actorFor(familyId, chatId, userId);
  const full_name = sanitizePlain(input.full_name, 160);
  if (!full_name) throw new Error("name_required");
  const payload = {
    family_id: familyId,
    member_id: input.member_id ? String(input.member_id) : null,
    full_name,
    photo_url: sanitizePlain(input.photo_url, 1500) || null,
    birth_info: sanitizePlain(input.birth_info, 240) || null,
    biography: sanitizePlain(input.biography, 12000) || null,
    occupation: sanitizePlain(input.occupation, 160) || null,
    achievements: sanitizePlain(input.achievements, 4000) || null,
    why_important: sanitizePlain(input.why_important, 2000) || null,
    timeline: Array.isArray(input.timeline) ? input.timeline.slice(0, 30) : [],
    tags: sanitizeTags(input.tags),
    featured: actor.isAdmin ? Boolean(input.featured) : false,
    visibility: parseVisibility(input.visibility),
    moderation_status: defaultPublishStatus(actor.isAdmin, input.moderation_status),
    created_by: actor.memberId,
    updated_by: actor.memberId,
    updated_at: new Date().toISOString(),
  };
  if (input.id) {
    const existing = await db().from("family_legends").select("id,created_by").eq("id", String(input.id)).eq("family_id", familyId).maybeSingle();
    if (!existing.data || !canEditRecord(actor, existing.data.created_by)) throw new Error("forbidden");
    const upd = await db().from("family_legends").update(payload).eq("id", existing.data.id).select("*").single();
    if (upd.error) throw upd.error;
    return upd.data;
  }
  const ins = await db().from("family_legends").insert(payload).select("*").single();
  if (ins.error) throw ins.error;
  return ins.data;
}

export async function listMemorials(familyId: string, chatId: number, userId: number) {
  const actor = await actorFor(familyId, chatId, userId);
  const r = await db().from("family_memorials").select("*").eq("family_id", familyId).order("created_at", {ascending: false});
  if (r.error) throw r.error;
  return {me: actor, items: visible(actor, r.data || [])};
}

export async function getMemorial(familyId: string, chatId: number, userId: number, id: string) {
  const actor = await actorFor(familyId, chatId, userId);
  const s = db();
  const r = await s.from("family_memorials").select("*").eq("id", id).eq("family_id", familyId).maybeSingle();
  if (r.error) throw r.error;
  if (!r.data || !visible(actor, [r.data]).length) throw new Error("not_found");
  const [messages, candles, comments, reactions] = await Promise.all([
    s.from("family_memorial_messages").select("id,body,author_member_id,created_at").eq("memorial_id", id).order("created_at", {ascending: false}).limit(40),
    s.from("family_memorial_candles").select("member_id,lit_on").eq("memorial_id", id).eq("lit_on", tehranTodayIso()),
    loadComments(familyId, "memorial", id),
    loadReactions(familyId, "memorial", id),
  ]);
  return {
    me: actor,
    item: {...r.data, portrait_url: await signedMedia(r.data.portrait_url)},
    messages: messages.data || [],
    candlesToday: candles.data?.length || 0,
    myCandle: Boolean(candles.data?.some((c) => c.member_id === actor.memberId)),
    comments,
    reactions,
    canEdit: canEditRecord(actor, r.data.created_by),
  };
}

export async function saveMemorial(familyId: string, chatId: number, userId: number, input: Record<string, unknown>) {
  const actor = await actorFor(familyId, chatId, userId);
  const name = sanitizePlain(input.name, 160);
  if (!name) throw new Error("name_required");
  const payload = {
    family_id: familyId,
    member_id: input.member_id ? String(input.member_id) : null,
    name,
    portrait_url: sanitizePlain(input.portrait_url, 1500) || null,
    birth_date: input.birth_date ? String(input.birth_date).slice(0, 10) : null,
    birth_precision: parsePrecision(input.birth_precision || (input.birth_date ? "full" : "unknown")),
    death_date: input.death_date ? String(input.death_date).slice(0, 10) : null,
    death_precision: parsePrecision(input.death_precision || (input.death_date ? "full" : "unknown")),
    biography: sanitizePlain(input.biography, 8000) || null,
    personal_history: sanitizePlain(input.personal_history, 8000) || null,
    quotes: sanitizePlain(input.quotes, 2000) || null,
    cemetery_info: sanitizePlain(input.cemetery_info, 400) || null,
    visibility: parseVisibility(input.visibility),
    moderation_status: defaultPublishStatus(actor.isAdmin, input.moderation_status),
    created_by: actor.memberId,
    updated_by: actor.memberId,
    updated_at: new Date().toISOString(),
  };
  if (input.id) {
    const existing = await db().from("family_memorials").select("id,created_by").eq("id", String(input.id)).eq("family_id", familyId).maybeSingle();
    if (!existing.data || !canEditRecord(actor, existing.data.created_by)) throw new Error("forbidden");
    const upd = await db().from("family_memorials").update(payload).eq("id", existing.data.id).select("*").single();
    if (upd.error) throw upd.error;
    return upd.data;
  }
  const ins = await db().from("family_memorials").insert(payload).select("*").single();
  if (ins.error) throw ins.error;
  return ins.data;
}

export async function lightCandle(familyId: string, chatId: number, userId: number, memorialId: string) {
  const actor = await actorFor(familyId, chatId, userId);
  const memorial = await getMemorial(familyId, chatId, userId, memorialId);
  void memorial;
  const today = tehranTodayIso();
  const r = await db().from("family_memorial_candles").upsert({memorial_id: memorialId, member_id: actor.memberId, lit_on: today}, {onConflict: "memorial_id,member_id,lit_on"}).select("memorial_id");
  if (r.error) throw r.error;
  return {lit: true, date: today};
}

export async function addMemorialMessage(familyId: string, chatId: number, userId: number, memorialId: string, body: string) {
  const actor = await actorFor(familyId, chatId, userId);
  await getMemorial(familyId, chatId, userId, memorialId);
  const text = sanitizePlain(body, 1200);
  if (!text) throw new Error("message_required");
  const r = await db().from("family_memorial_messages").insert({memorial_id: memorialId, author_member_id: actor.memberId, body: text}).select("*").single();
  if (r.error) throw r.error;
  return r.data;
}

export async function listGallery(familyId: string, chatId: number, userId: number, albumId?: string) {
  const actor = await actorFor(familyId, chatId, userId);
  const s = db();
  const [albums, media] = await Promise.all([
    s.from("family_albums").select("*").eq("family_id", familyId).order("created_at", {ascending: false}),
    s.from("family_legacy_media").select("*").eq("family_id", familyId).order("created_at", {ascending: false}).limit(120),
  ]);
  if (albums.error) throw albums.error;
  if (media.error) throw media.error;
  const aAlbums = visible(actor, albums.data || []);
  let items = visible(actor, media.data || []);
  if (albumId) items = items.filter((m) => m.album_id === albumId);
  const signed = await Promise.all(items.slice(0, 60).map(async (m) => ({...m, media_url: await signedMedia(m.media_url)})));
  return {me: actor, albums: aAlbums, presets: ALBUM_PRESETS, items: signed};
}

export async function getMedia(familyId: string, chatId: number, userId: number, id: string) {
  const actor = await actorFor(familyId, chatId, userId);
  const s = db();
  const item = await s.from("family_legacy_media").select("*").eq("id", id).eq("family_id", familyId).maybeSingle();
  if (item.error) throw item.error;
  if (!item.data || !visible(actor, [item.data]).length) throw new Error("not_found");
  const tags = await s.from("family_legacy_media_tags").select("member_id").eq("media_id", id);
  const names = await memberNameMap(familyId);
  const siblings = await listGallery(familyId, chatId, userId, item.data.album_id || undefined);
  const idx = siblings.items.findIndex((x) => x.id === id);
  return {
    me: actor,
    item: {...item.data, media_url: await signedMedia(item.data.media_url)},
    tags: (tags.data || []).map((t) => names.get(t.member_id)).filter(Boolean),
    prev: siblings.items[idx - 1] || null,
    next: siblings.items[idx + 1] || null,
    comments: await loadComments(familyId, "media", id),
    reactions: await loadReactions(familyId, "media", id),
  };
}

export async function saveAlbum(familyId: string, chatId: number, userId: number, input: Record<string, unknown>) {
  const actor = await actorFor(familyId, chatId, userId);
  const title = sanitizePlain(input.title, 120) || ALBUM_PRESETS.find((p) => p.key === input.album_key)?.title || "";
  if (!title) throw new Error("title_required");
  const payload = {
    family_id: familyId,
    creator_member_id: actor.memberId,
    title,
    description: sanitizePlain(input.description, 800) || null,
    cover_url: sanitizePlain(input.cover_url, 1500) || null,
    album_key: sanitizePlain(input.album_key, 40) || null,
    visibility: parseVisibility(input.visibility),
    moderation_status: defaultPublishStatus(actor.isAdmin, input.moderation_status || "approved"),
    updated_at: new Date().toISOString(),
  };
  const ins = await db().from("family_albums").insert(payload).select("*").single();
  if (ins.error) throw ins.error;
  return ins.data;
}

export async function saveMedia(familyId: string, chatId: number, userId: number, input: Record<string, unknown>) {
  const actor = await actorFor(familyId, chatId, userId);
  const media_url = sanitizePlain(input.media_url, 1500);
  if (!media_url) throw new Error("media_required");
  if (media_url.startsWith("storage:") && !media_url.startsWith(`storage:${familyId}/`)) throw new Error("invalid_media");
  const taken = input.taken_on ? String(input.taken_on).slice(0, 10) : null;
  const payload = {
    family_id: familyId,
    album_id: input.album_id ? String(input.album_id) : null,
    uploader_member_id: actor.memberId,
    media_url,
    media_kind: input.media_kind === "video" || input.media_kind === "document" ? String(input.media_kind) : "image",
    title: sanitizePlain(input.title, 160) || null,
    description: sanitizePlain(input.description, 1200) || null,
    taken_on: taken,
    taken_precision: parsePrecision(input.taken_precision || (taken ? "full" : "unknown")),
    related_article_id: input.related_article_id ? String(input.related_article_id) : null,
    visibility: parseVisibility(input.visibility),
    moderation_status: defaultPublishStatus(actor.isAdmin, input.moderation_status || "approved"),
  };
  const ins = await db().from("family_legacy_media").insert(payload).select("*").single();
  if (ins.error) throw ins.error;
  const tags = [...new Set((Array.isArray(input.taggedMemberIds) ? input.taggedMemberIds : []).map(String))].slice(0, 40);
  if (tags.length) await db().from("family_legacy_media_tags").insert(tags.map((member_id) => ({media_id: ins.data.id, member_id})));
  return ins.data;
}

export async function listJournal(familyId: string, chatId: number, userId: number) {
  const actor = await actorFor(familyId, chatId, userId);
  const r = await db().from("family_journal_posts").select("*").eq("family_id", familyId).order("created_at", {ascending: false}).limit(80);
  if (r.error) throw r.error;
  return {me: actor, items: visible(actor, r.data || [])};
}

export async function getJournal(familyId: string, chatId: number, userId: number, id: string) {
  const actor = await actorFor(familyId, chatId, userId);
  const r = await db().from("family_journal_posts").select("*").eq("id", id).eq("family_id", familyId).maybeSingle();
  if (r.error) throw r.error;
  if (!r.data || !visible(actor, [r.data]).length) throw new Error("not_found");
  return {
    me: actor,
    item: {...r.data, cover_url: await signedMedia(r.data.cover_url)},
    comments: await loadComments(familyId, "journal", id),
    reactions: await loadReactions(familyId, "journal", id),
    canEdit: canEditRecord(actor, r.data.author_member_id),
  };
}

export async function saveJournal(familyId: string, chatId: number, userId: number, input: Record<string, unknown>) {
  const actor = await actorFor(familyId, chatId, userId);
  const title = sanitizePlain(input.title, 160);
  const body = sanitizePlain(input.body, 16000);
  if (!title || !body) throw new Error("title_and_body_required");
  const happened = input.happened_on ? String(input.happened_on).slice(0, 10) : null;
  const payload = {
    family_id: familyId,
    author_member_id: actor.memberId,
    title,
    body,
    cover_url: sanitizePlain(input.cover_url, 1500) || null,
    kind: sanitizePlain(input.kind, 40) || "خاطره",
    tags: sanitizeTags(input.tags),
    related_member_id: input.related_member_id ? String(input.related_member_id) : null,
    happened_on: happened,
    happened_precision: parsePrecision(input.happened_precision || (happened ? "full" : "unknown")),
    visibility: parseVisibility(input.visibility),
    moderation_status: defaultPublishStatus(actor.isAdmin, input.moderation_status),
    updated_at: new Date().toISOString(),
  };
  if (input.id) {
    const existing = await db().from("family_journal_posts").select("id,author_member_id").eq("id", String(input.id)).eq("family_id", familyId).maybeSingle();
    if (!existing.data || !canEditRecord(actor, existing.data.author_member_id)) throw new Error("forbidden");
    const upd = await db().from("family_journal_posts").update(payload).eq("id", existing.data.id).select("*").single();
    if (upd.error) throw upd.error;
    return upd.data;
  }
  const ins = await db().from("family_journal_posts").insert(payload).select("*").single();
  if (ins.error) throw ins.error;
  return ins.data;
}

export async function addComment(familyId: string, chatId: number, userId: number, targetType: string, targetId: string, body: string) {
  const actor = await actorFor(familyId, chatId, userId);
  const text = sanitizePlain(body, 1000);
  if (!text) throw new Error("comment_required");
  tableFor(targetType);
  const recent = await db().from("family_legacy_comments").select("id,created_at").eq("family_id", familyId).eq("author_member_id", actor.memberId).eq("target_type", targetType).eq("target_id", targetId).order("created_at", {ascending: false}).limit(1);
  if (recent.data?.[0] && Date.now() - new Date(recent.data[0].created_at).getTime() < 4000) throw new Error("slow_down");
  const r = await db().from("family_legacy_comments").insert({family_id: familyId, author_member_id: actor.memberId, target_type: targetType, target_id: targetId, body: text}).select("*").single();
  if (r.error) throw r.error;
  return r.data;
}

export async function toggleReaction(familyId: string, chatId: number, userId: number, targetType: string, targetId: string, emoji: string) {
  const actor = await actorFor(familyId, chatId, userId);
  const allowed = allowedReactions(targetType);
  if (!allowed.includes(emoji as (typeof allowed)[number])) throw new Error("invalid_reaction");
  const s = db();
  const existing = await s.from("family_legacy_reactions").select("emoji").eq("member_id", actor.memberId).eq("target_type", targetType).eq("target_id", targetId).eq("emoji", emoji).maybeSingle();
  if (existing.data) {
    await s.from("family_legacy_reactions").delete().eq("member_id", actor.memberId).eq("target_type", targetType).eq("target_id", targetId).eq("emoji", emoji);
    return {on: false, emoji};
  }
  const ins = await s.from("family_legacy_reactions").insert({family_id: familyId, member_id: actor.memberId, target_type: targetType, target_id: targetId, emoji});
  if (ins.error) {
    if (String(ins.error.code) === "23505") return {on: true, emoji};
    throw ins.error;
  }
  return {on: true, emoji};
}

async function loadComments(familyId: string, targetType: string, targetId: string) {
  const r = await db().from("family_legacy_comments").select("id,body,author_member_id,created_at").eq("family_id", familyId).eq("target_type", targetType).eq("target_id", targetId).order("created_at", {ascending: true}).limit(80);
  if (r.error) throw r.error;
  const names = await memberNameMap(familyId);
  return (r.data || []).map((c) => ({...c, author: names.get(c.author_member_id || "")?.name || "عضو خانواده"}));
}

async function loadReactions(familyId: string, targetType: string, targetId: string) {
  const r = await db().from("family_legacy_reactions").select("emoji,member_id").eq("family_id", familyId).eq("target_type", targetType).eq("target_id", targetId);
  if (r.error) throw r.error;
  const counts: Record<string, number> = {};
  for (const row of r.data || []) counts[row.emoji] = (counts[row.emoji] || 0) + 1;
  return {counts, mine: r.data || []};
}

export async function listMembersForPicker(familyId: string) {
  const r = await db().from("members").select("id,display_name,first_name,last_name,relation_label").eq("family_id", familyId).order("created_at");
  if (r.error) throw r.error;
  return (r.data || []).map((m) => ({id: m.id, name: (m.display_name || [m.first_name, m.last_name].filter(Boolean).join(" ") || "عضو").trim(), relation: m.relation_label}));
}

export async function listCloseCircle(familyId: string, chatId: number, userId: number, ownerMemberId?: string) {
  const actor = await actorFor(familyId, chatId, userId);
  const ownerId = ownerMemberId || actor.memberId;
  if (ownerId !== actor.memberId && !actor.isAdmin) throw new Error("forbidden");
  const belongs = await db().from("members").select("id").eq("id", ownerId).eq("family_id", familyId).maybeSingle();
  if (!belongs.data) throw new Error("member_not_found");
  const rows = await db().from("family_close_circle").select("close_member_id,created_at").eq("family_id", familyId).eq("member_id", ownerId).order("created_at");
  if (rows.error) throw rows.error;
  const names = await memberNameMap(familyId);
  return {
    me: actor,
    ownerId,
    members: (rows.data || []).map((r) => names.get(r.close_member_id)).filter(Boolean),
  };
}

export async function addCloseMember(familyId: string, chatId: number, userId: number, closeMemberId: string, ownerMemberId?: string) {
  const actor = await actorFor(familyId, chatId, userId);
  const ownerId = ownerMemberId || actor.memberId;
  if (ownerId !== actor.memberId && !actor.isAdmin) throw new Error("forbidden");
  const target = String(closeMemberId || "");
  if (!target || target === ownerId) throw new Error("invalid_close_member");
  const ok = await db().from("members").select("id").eq("id", target).eq("family_id", familyId).maybeSingle();
  if (!ok.data) throw new Error("member_not_found");
  const ownerOk = await db().from("members").select("id").eq("id", ownerId).eq("family_id", familyId).maybeSingle();
  if (!ownerOk.data) throw new Error("member_not_found");
  const count = await db().from("family_close_circle").select("close_member_id", {count: "exact", head: true}).eq("family_id", familyId).eq("member_id", ownerId);
  if ((count.count || 0) >= 50) throw new Error("close_circle_limit");
  const r = await db().from("family_close_circle").upsert({family_id: familyId, member_id: ownerId, close_member_id: target}, {onConflict: "family_id,member_id,close_member_id"}).select("close_member_id").maybeSingle();
  if (r.error) throw r.error;
  return listCloseCircle(familyId, chatId, userId, ownerId);
}

export async function removeCloseMember(familyId: string, chatId: number, userId: number, closeMemberId: string, ownerMemberId?: string) {
  const actor = await actorFor(familyId, chatId, userId);
  const ownerId = ownerMemberId || actor.memberId;
  if (ownerId !== actor.memberId && !actor.isAdmin) throw new Error("forbidden");
  const del = await db().from("family_close_circle").delete().eq("family_id", familyId).eq("member_id", ownerId).eq("close_member_id", String(closeMemberId || ""));
  if (del.error) throw del.error;
  return listCloseCircle(familyId, chatId, userId, ownerId);
}

export async function untagMedia(familyId: string, chatId: number, userId: number, mediaId: string, memberId: string) {
  const actor = await actorFor(familyId, chatId, userId);
  const item = await db().from("family_legacy_media").select("id,uploader_member_id,family_id").eq("id", mediaId).eq("family_id", familyId).maybeSingle();
  if (!item.data) throw new Error("not_found");
  if (!actor.isAdmin && item.data.uploader_member_id !== actor.memberId && memberId !== actor.memberId) throw new Error("forbidden");
  const del = await db().from("family_legacy_media_tags").delete().eq("media_id", mediaId).eq("member_id", memberId);
  if (del.error) throw del.error;
  return {removed: true, memberId};
}
