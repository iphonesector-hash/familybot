const PATCH_MARKER = Symbol.for("familybot.supabase.profile-fetch");
const PUBLIC_SUPABASE_URL = "https://ouuyarzxlusoebjiphgm.supabase.co";
const PUBLIC_APP_URL = "https://familybot-gray.vercel.app";

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  process.env.NEXT_PUBLIC_SUPABASE_URL ||= PUBLIC_SUPABASE_URL;
  process.env.NEXT_PUBLIC_APP_URL ||= PUBLIC_APP_URL;

  const base = (process.env.NEXT_PUBLIC_SUPABASE_URL || PUBLIC_SUPABASE_URL).replace(/\/$/, "");
  const globalState = globalThis as typeof globalThis & { [PATCH_MARKER]?: boolean };
  if (globalState[PATCH_MARKER]) return;

  const originalFetch = globalThis.fetch.bind(globalThis);
  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const target = typeof input === "string"
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;

    if (!target.startsWith(`${base}/rest/v1/`)) {
      return originalFetch(input, init);
    }

    const headers = new Headers(input instanceof Request ? input.headers : undefined);
    if (init?.headers) new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    headers.set("Accept-Profile", "familybot");
    headers.set("Content-Profile", "familybot");

    return originalFetch(input, { ...init, headers });
  };

  globalState[PATCH_MARKER] = true;
}
