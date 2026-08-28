"use client";

import { useEffect, useState } from "react";

type BaleUser = { id?: number; first_name?: string; last_name?: string; username?: string; photo_url?: string; allows_write_to_pm?: boolean };
type BaleTheme = { bg_color?: string; text_color?: string; hint_color?: string; link_color?: string; button_color?: string; button_text_color?: string; secondary_bg_color?: string; header_bg_color?: string; bottom_bar_bg_color?: string; accent_text_color?: string; section_bg_color?: string; section_header_text_color?: string; section_separator_color?: string; subtitle_text_color?: string; destructive_text_color?: string };
type BaleButton = { isVisible?: boolean; setText?: (text: string) => void; show?: () => void; hide?: () => void; onClick?: (cb: () => void) => void; offClick?: (cb: () => void) => void };
type BaleWebApp = {
  initData?: string;
  initDataUnsafe?: { query_id?: string; user?: BaleUser; auth_date?: number; hash?: string };
  version?: string;
  isIframe?: boolean;
  isMiniAppSupported?: boolean;
  colorScheme?: "light" | "dark";
  themeParams?: BaleTheme;
  viewportHeight?: number;
  viewportStableHeight?: number;
  isExpanded?: boolean;
  ready?: () => void;
  expand?: () => void;
  close?: () => void;
  sendData?: (data: string) => void;
  openLink?: (url: string, options?: { try_instant_view?: boolean }) => void;
  setHeaderColor?: (color: string) => void;
  enableClosingConfirmation?: () => void;
  disableClosingConfirmation?: () => void;
  addToHomeScreen?: () => void;
  checkHomeScreenStatus?: (cb?: (status: string) => void) => void;
  requestContact?: (cb?: (shared: boolean, phone?: string) => void) => void;
  MainButton?: BaleButton;
  BackButton?: BaleButton;
  SettingsButton?: BaleButton;
  HapticFeedback?: { impactOccurred?: (style: "light"|"medium"|"heavy") => void; notificationOccurred?: (type: "error"|"success"|"warning") => void; selectionChanged?: () => void };
  onEvent?: (event: string, cb: (...args: unknown[]) => void) => void;
  offEvent?: (event: string, cb: (...args: unknown[]) => void) => void;
};

declare global { interface Window { Bale?: { WebApp?: BaleWebApp } } }

function callSafe(target: unknown, method: string, ...args: unknown[]) {
  try {
    const fn = target && typeof target === "object" ? (target as Record<string, unknown>)[method] : undefined;
    if (typeof fn === "function") return fn.apply(target, args);
  } catch (error) {
    console.warn(`Bale WebApp ${method} failed`, error);
  }
}

function readWebApp(): BaleWebApp | null {
  try {
    const app = window.Bale?.WebApp;
    return app && typeof app === "object" ? app : null;
  } catch {
    return null;
  }
}

export function useBaleMiniApp() {
  const [webApp, setWebApp] = useState<BaleWebApp | null>(null);
  const [user, setUser] = useState<BaleUser | null>(null);

  useEffect(() => {
    let cancelled = false;
    let tries = 0;
    const connect = () => {
      const app = readWebApp();
      if (app) {
        callSafe(app, "ready");
        callSafe(app, "expand");
        if (!cancelled) {
          setWebApp(app);
          try { setUser(app.initDataUnsafe?.user ?? null); } catch { setUser(null); }
        }
        return;
      }
      if (!cancelled && tries++ < 40) window.setTimeout(connect, 75);
    };
    connect();
    return () => { cancelled = true; };
  }, []);

  function sendData(payload: unknown) { callSafe(webApp, "sendData", JSON.stringify(payload)); }
  function haptic(kind: "tap"|"success"|"warning"|"error" = "tap") {
    try {
      const feedback = webApp?.HapticFeedback;
      if (kind === "tap") callSafe(feedback, "impactOccurred", "light");
      else callSafe(feedback, "notificationOccurred", kind);
    } catch {}
  }

  let startParam = "";
  if (typeof window !== "undefined") {
    try { startParam = new URLSearchParams(window.location.search).get("tgWebAppStartParam") ?? ""; } catch {}
  }

  let initData = "";
  let theme: BaleTheme = {};
  let version = "";
  let isIframe = false;
  let supported = true;
  try {
    initData = typeof webApp?.initData === "string" ? webApp.initData : "";
    theme = webApp?.themeParams && typeof webApp.themeParams === "object" ? webApp.themeParams : {};
    version = typeof webApp?.version === "string" ? webApp.version : "";
    isIframe = Boolean(webApp?.isIframe);
    supported = webApp?.isMiniAppSupported !== false;
  } catch {}

  return { webApp, user, sendData, haptic, inBale: Boolean(webApp), supported, version, isIframe, initData, startParam, theme };
}
