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

export function useBaleMiniApp() {
  const [webApp, setWebApp] = useState<BaleWebApp | null>(null);
  const [user, setUser] = useState<BaleUser | null>(null);

  useEffect(() => {
    let cancelled = false;
    let tries = 0;
    const connect = () => {
      const app = window.Bale?.WebApp ?? null;
      if (app) {
        app.ready?.();
        app.expand?.();
        if (!cancelled) {
          setWebApp(app);
          setUser(app.initDataUnsafe?.user ?? null);
        }
        return;
      }
      if (!cancelled && tries++ < 20) window.setTimeout(connect, 50);
    };
    connect();
    return () => { cancelled = true; };
  }, []);

  function sendData(payload: unknown) { webApp?.sendData?.(JSON.stringify(payload)); }
  function haptic(kind: "tap"|"success"|"warning"|"error" = "tap") {
    if (kind === "tap") webApp?.HapticFeedback?.impactOccurred?.("light");
    else webApp?.HapticFeedback?.notificationOccurred?.(kind);
  }

  const startParam = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("tgWebAppStartParam") ?? "" : "";

  return {
    webApp,
    user,
    sendData,
    haptic,
    inBale: Boolean(webApp),
    supported: webApp?.isMiniAppSupported !== false,
    version: webApp?.version ?? "",
    isIframe: Boolean(webApp?.isIframe),
    initData: webApp?.initData ?? "",
    startParam,
    theme: webApp?.themeParams ?? {},
  };
}
