const PATCH_MARKER = Symbol.for("familybot.supabase.profile-fetch");

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const base = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
  if (!base) return;

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
