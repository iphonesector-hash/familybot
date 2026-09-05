import {NextRequest, NextResponse} from "next/server";
import {verifyFamilySession} from "@/lib/familySession";
import {
  addComment,
  addMemorialMessage,
  getArticle,
  getJournal,
  getLegend,
  getMedia,
  getMemorial,
  getPerson,
  lightCandle,
  listArticles,
  listGallery,
  listJournal,
  listLegends,
  listMemorials,
  listMembersForPicker,
  listPeople,
  moderateLegacy,
  readLegacyHome,
  saveAlbum,
  saveArticle,
  saveJournal,
  saveLegend,
  saveMedia,
  saveMemorial,
  savePerson,
  searchLegacy,
  toggleReaction,
} from "@/lib/familyLegacy";

function sessionFrom(req: NextRequest) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : req.nextUrl.searchParams.get("session") || "";
  return token ? verifyFamilySession(token) : null;
}

function fail(error: unknown, fallback = "legacy_failed") {
  const message = error instanceof Error ? error.message : fallback;
  const status =
    message === "unauthorized" ? 401 :
    message === "forbidden" || message === "admin_required" ? 403 :
    message === "not_found" ? 404 :
    message === "slow_down" ? 429 :
    400;
  return NextResponse.json({ok: false, error: message}, {status, headers: {"cache-control": "no-store"}});
}

export async function GET(req: NextRequest) {
  try {
    const s = sessionFrom(req);
    if (!s) return NextResponse.json({ok: false, error: "unauthorized"}, {status: 401});
    const view = req.nextUrl.searchParams.get("view") || "home";
    const id = req.nextUrl.searchParams.get("id") || "";
    const q = req.nextUrl.searchParams.get("q") || "";
    const category = req.nextUrl.searchParams.get("category") || "";
    const album = req.nextUrl.searchParams.get("album") || "";
    let data: unknown;
    switch (view) {
      case "home": data = await readLegacyHome(s.familyId, s.chatId, s.userId); break;
      case "search": data = await searchLegacy(s.familyId, s.chatId, s.userId, q); break;
      case "articles": data = await listArticles(s.familyId, s.chatId, s.userId, category ? {category} : undefined); break;
      case "article": data = await getArticle(s.familyId, s.chatId, s.userId, id); break;
      case "people": data = await listPeople(s.familyId, s.chatId, s.userId); break;
      case "person": data = await getPerson(s.familyId, s.chatId, s.userId, id); break;
      case "legends": data = await listLegends(s.familyId, s.chatId, s.userId); break;
      case "legend": data = await getLegend(s.familyId, s.chatId, s.userId, id); break;
      case "memorials": data = await listMemorials(s.familyId, s.chatId, s.userId); break;
      case "memorial": data = await getMemorial(s.familyId, s.chatId, s.userId, id); break;
      case "gallery": data = await listGallery(s.familyId, s.chatId, s.userId, album || undefined); break;
      case "media": data = await getMedia(s.familyId, s.chatId, s.userId, id); break;
      case "journal": data = await listJournal(s.familyId, s.chatId, s.userId); break;
      case "journalItem": data = await getJournal(s.familyId, s.chatId, s.userId, id); break;
      case "members": data = await listMembersForPicker(s.familyId); break;
      default: return NextResponse.json({ok: false, error: "unknown_view"}, {status: 400});
    }
    return NextResponse.json({ok: true, data}, {headers: {"cache-control": "no-store"}});
  } catch (error) {
    console.error("legacy get failed", error);
    return fail(error, "legacy_read_failed");
  }
}

export async function POST(req: NextRequest) {
  try {
    const s = sessionFrom(req);
    if (!s) return NextResponse.json({ok: false, error: "unauthorized"}, {status: 401});
    const body = await req.json() as {action?: string; payload?: Record<string, unknown>};
    const p = body.payload || {};
    let data: unknown;
    switch (body.action) {
      case "article.save": data = await saveArticle(s.familyId, s.chatId, s.userId, p); break;
      case "person.save": data = await savePerson(s.familyId, s.chatId, s.userId, p); break;
      case "legend.save": data = await saveLegend(s.familyId, s.chatId, s.userId, p); break;
      case "memorial.save": data = await saveMemorial(s.familyId, s.chatId, s.userId, p); break;
      case "memorial.candle": data = await lightCandle(s.familyId, s.chatId, s.userId, String(p.id || "")); break;
      case "memorial.message": data = await addMemorialMessage(s.familyId, s.chatId, s.userId, String(p.id || ""), String(p.body || "")); break;
      case "album.save": data = await saveAlbum(s.familyId, s.chatId, s.userId, p); break;
      case "media.save": data = await saveMedia(s.familyId, s.chatId, s.userId, p); break;
      case "journal.save": data = await saveJournal(s.familyId, s.chatId, s.userId, p); break;
      case "comment.add": data = await addComment(s.familyId, s.chatId, s.userId, String(p.targetType || ""), String(p.targetId || ""), String(p.body || "")); break;
      case "reaction.toggle": data = await toggleReaction(s.familyId, s.chatId, s.userId, String(p.targetType || ""), String(p.targetId || ""), String(p.emoji || "")); break;
      case "moderate": data = await moderateLegacy(s.familyId, s.chatId, s.userId, {targetType: String(p.targetType || ""), id: String(p.id || ""), status: String(p.status || "")}); break;
      default: return NextResponse.json({ok: false, error: "unknown_action"}, {status: 400});
    }
    return NextResponse.json({ok: true, data}, {headers: {"cache-control": "no-store"}});
  } catch (error) {
    console.error("legacy action failed", error);
    return fail(error);
  }
}
