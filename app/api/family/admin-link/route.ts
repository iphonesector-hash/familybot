import { NextRequest, NextResponse } from "next/server";
import { verifyFamilySession } from "@/lib/familySession";
import { createAdminSession } from "@/lib/adminSession";
import { isAdmin } from "@/lib/bale";

function sessionFrom(req: NextRequest) {
  const auth = req.headers.get("authorization") || "";
  return auth.startsWith("Bearer ") ? verifyFamilySession(auth.slice(7)) : null;
}

export async function POST(req: NextRequest) {
  try {
    const session = sessionFrom(req);
    if (!session) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    const canManage = await isAdmin(session.chatId, session.userId).catch(() => false);
    if (!canManage) return NextResponse.json({ ok: false, error: "admin_required" }, { status: 403 });
    const token = createAdminSession({ familyId: session.familyId, chatId: session.chatId, userId: session.userId }, 15 * 60);
    return NextResponse.json({ ok: true, token, expiresIn: 900 }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    console.error("admin launcher failed", error);
    return NextResponse.json({ ok: false, error: "admin_link_unavailable" }, { status: 500 });
  }
}
