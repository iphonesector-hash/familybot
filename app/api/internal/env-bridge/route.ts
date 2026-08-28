import { NextRequest, NextResponse } from "next/server";
import { createCipheriv, createDecipheriv, createECDH, createHash } from "node:crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PROJECT_ID = "prj_R9AFSXlooprhZUNWTD3jxKHYmGHy";
const TEAM_ID = "team_2BtwJnpigYipSSdbgKdoBh7M";
const API = "https://api.vercel.com";

function bridgeSecret() {
  return process.env.BALE_WEBHOOK_PATH_TOKEN || process.env.BALE_WEBHOOK_SECRET || "";
}

function serverEcdh() {
  const secret = bridgeSecret();
  if (!secret) throw new Error("bridge_unavailable");
  const ecdh = createECDH("secp256k1");
  ecdh.setPrivateKey(createHash("sha256").update(`familybot-env-bridge:${secret}`).digest());
  return ecdh;
}

function b64uDecode(value: string) {
  return Buffer.from(value, "base64url");
}

function decryptPayload(params: URLSearchParams) {
  const ecdh = serverEcdh();
  const epk = params.get("epk");
  const iv = params.get("iv");
  const tag = params.get("tag");
  const data = params.get("data");
  if (!epk || !iv || !tag || !data) throw new Error("missing_payload");
  const shared = ecdh.computeSecret(b64uDecode(epk));
  const key = createHash("sha256").update("familybot-env-bridge-v1").update(shared).digest();
  const decipher = createDecipheriv("aes-256-gcm", key, b64uDecode(iv));
  decipher.setAuthTag(b64uDecode(tag));
  const plain = Buffer.concat([decipher.update(b64uDecode(data)), decipher.final()]).toString("utf8");
  const parsed = JSON.parse(plain) as {
    exp: number;
    token: string;
    values?: Record<string, string>;
    promoteExisting?: string[];
  };
  if (!parsed.exp || Date.now() > parsed.exp) throw new Error("expired_payload");
  if (!parsed.token || parsed.token.length < 20) throw new Error("invalid_token");
  return parsed;
}

type VercelEnv = {
  id: string;
  key: string;
  type?: string;
  target?: string[] | string;
  value?: string;
};

async function api(path: string, token: string, init?: RequestInit) {
  const response = await fetch(`${API}${path}${path.includes("?") ? "&" : "?"}teamId=${TEAM_ID}`, {
    ...init,
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });
  const text = await response.text();
  let body: any = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = null; }
  if (!response.ok) {
    const code = body?.error?.code || body?.code || `http_${response.status}`;
    throw new Error(String(code));
  }
  return body;
}

function targetsOf(env: VercelEnv) {
  const raw = env.target;
  if (Array.isArray(raw)) return raw;
  return raw ? [raw] : [];
}

async function listEnvs(token: string): Promise<VercelEnv[]> {
  const body = await api(`/v9/projects/${PROJECT_ID}/env`, token);
  return Array.isArray(body?.envs) ? body.envs : [];
}

async function patchEnv(token: string, env: VercelEnv, patch: Record<string, unknown>) {
  return api(`/v9/projects/${PROJECT_ID}/env/${env.id}`, token, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

async function createEnv(token: string, key: string, value: string, sensitive: boolean) {
  return api(`/v9/projects/${PROJECT_ID}/env`, token, {
    method: "POST",
    body: JSON.stringify({ key, value, target: ["production"], type: sensitive ? "sensitive" : "encrypted" }),
  });
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  if (!url.searchParams.has("data")) {
    try {
      const ecdh = serverEcdh();
      return NextResponse.json({
        ok: true,
        publicKey: ecdh.getPublicKey().toString("base64url"),
        curve: "secp256k1",
        cipher: "aes-256-gcm",
      }, { headers: { "cache-control": "no-store" } });
    } catch {
      return NextResponse.json({ ok: false, error: "bridge_unavailable" }, { status: 503 });
    }
  }

  try {
    const payload = decryptPayload(url.searchParams);
    const envs = await listEnvs(payload.token);
    const byKey = new Map(envs.map((env) => [env.key, env]));
    const changed: string[] = [];
    const missing: string[] = [];

    for (const key of payload.promoteExisting || []) {
      const env = byKey.get(key);
      if (!env) { missing.push(key); continue; }
      const target = Array.from(new Set([...targetsOf(env), "production"]));
      if (target.length !== targetsOf(env).length) {
        await patchEnv(payload.token, env, { target });
        changed.push(key);
      }
    }

    const sensitiveKeys = new Set(["GROQ_API_KEY", "AI_API_KEY", "ELEVENLABS_API_KEY", "SUPABASE_SERVICE_ROLE_KEY"]);
    for (const [key, value] of Object.entries(payload.values || {})) {
      const existing = byKey.get(key);
      const target = Array.from(new Set([...(existing ? targetsOf(existing) : []), "production"]));
      if (existing) {
        await patchEnv(payload.token, existing, { value, target });
      } else {
        await createEnv(payload.token, key, value, sensitiveKeys.has(key));
      }
      changed.push(key);
    }

    const after = await listEnvs(payload.token);
    const readiness = Object.fromEntries(
      [
        "NEXT_PUBLIC_APP_URL",
        "NEXT_PUBLIC_SUPABASE_URL",
        "NEXT_PUBLIC_SUPABASE_ANON_KEY",
        "SUPABASE_SERVICE_ROLE_KEY",
        "AI_PROVIDER",
        "AI_BASE_URL",
        "GROQ_API_KEY",
        "AI_MODEL",
        "ELEVENLABS_API_KEY",
        "ELEVENLABS_VOICE_ID",
        "ELEVENLABS_MODEL_ID",
      ].map((key) => {
        const env = after.find((item) => item.key === key);
        return [key, Boolean(env && targetsOf(env).includes("production"))];
      }),
    );

    return NextResponse.json({ ok: true, changed: Array.from(new Set(changed)), missing, readiness }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "bridge_failed";
    return NextResponse.json({ ok: false, error: message }, { status: 400, headers: { "cache-control": "no-store" } });
  }
}
