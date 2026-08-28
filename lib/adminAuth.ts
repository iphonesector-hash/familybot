import { NextRequest } from "next/server";
import { verifyAdminSession } from "@/lib/adminSession";
import { isAdmin } from "@/lib/bale";

export async function requireLiveAdmin(req: NextRequest) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : req.nextUrl.searchParams.get("session") || "";
  const session = token ? verifyAdminSession(token) : null;
  if (!session) return null;
  const live = await isAdmin(session.chatId, session.userId).catch(() => false);
  return live ? session : null;
}
