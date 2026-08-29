import { NextRequest } from "next/server";
import { verifyAdminSession } from "@/lib/adminSession";
import { verifyFamilySession } from "@/lib/familySession";
import { isAdmin } from "@/lib/bale";
import { isFamilyFounder } from "@/lib/familyMutations";

export async function requireLiveAdmin(req: NextRequest) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const session = token ? verifyAdminSession(token) : null;
  if (!session) return null;
  const memberToken = req.headers.get("x-family-member-session") || "";
  const member = memberToken ? verifyFamilySession(memberToken) : null;
  if (!member) return null;
  if (member.familyId !== session.familyId || member.chatId !== session.chatId || member.userId !== session.userId) return null;

  const liveAdmin = await isAdmin(session.chatId, session.userId).catch(() => false);
  if (liveAdmin) return session;

  const founder = await isFamilyFounder(session.familyId, session.userId).catch(() => false);
  return founder ? session : null;
}
