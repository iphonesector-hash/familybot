import crypto from "node:crypto";

export type FamilySessionPayload = {
  familyId: string;
  chatId: number;
  userId: number;
  exp: number;
};

function secret() {
  const value = process.env.FAMILY_MEMBER_SESSION_SECRET || process.env.FAMILY_ADMIN_SESSION_SECRET || process.env.BALE_WEBHOOK_SECRET;
  if (!value) throw new Error("FAMILY_MEMBER_SESSION_SECRET is not configured");
  return value;
}

function signature(encoded: string) {
  return crypto.createHmac("sha256", secret()).update(`member.${encoded}`).digest("base64url");
}

export function createFamilySession(payload: Omit<FamilySessionPayload, "exp">, ttlSeconds = 60 * 60 * 12) {
  const body: FamilySessionPayload = { ...payload, exp: Math.floor(Date.now() / 1000) + ttlSeconds };
  const encoded = Buffer.from(JSON.stringify(body)).toString("base64url");
  return `m.${encoded}.${signature(encoded)}`;
}

export function verifyFamilySession(token: string) {
  const [prefix, encoded, sig] = token.split(".");
  if (prefix !== "m" || !encoded || !sig) return null;
  const expected = signature(encoded);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as FamilySessionPayload;
    if (!payload.familyId || !payload.chatId || !payload.userId || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}
