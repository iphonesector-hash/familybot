import { NextRequest, NextResponse } from "next/server";
import { verifyFamilySession } from "@/lib/familySession";
import { readMiniAppDashboard } from "@/lib/miniAppData";

function sessionFrom(req: NextRequest) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : req.nextUrl.searchParams.get("session") || "";
  return token ? verifyFamilySession(token) : null;
}

export async function GET(req: NextRequest) {
  try {
    const session = sessionFrom(req);
    if (!session) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    const dashboard = await readMiniAppDashboard(session.familyId, session.userId);
    return NextResponse.json({ ok: true, dashboard, expiresAt: session.exp });
  } catch (error) {
    console.error("family dashboard failed", error);
    return NextResponse.json({ ok: false, error: "dashboard_unavailable" }, { status: 500 });
  }
}
