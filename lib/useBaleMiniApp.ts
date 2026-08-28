"use client";

import { useEffect, useState } from "react";

type BaleUser = { id?: number; first_name?: string; last_name?: string; username?: string; photo_url?: string; allows_write_to_pm?: boolean };
type BaleTheme = { bg_color?: string; text_color?: string; hint_color?: string; link_color?: string; button_color?: string; button_text_color?: string; secondary_bg_color?: string; header_bg_color?: string; bottom_bar_bg_color?: string };
type BaleButton = { show?: () => void; hide?: () => void; onClick?: (cb: () => void) => void; offClick?: (cb: () => void) => void };
type BaleWebApp = {
  initData?: string;
  initDataUnsafe?: { query_id?: string; user?: BaleUser; auth_date?: number; hash?: string };
  colorScheme?: "light" | "dark";
  themeParams?: BaleTheme;
  isMiniAppSupported?: boolean;
  isIframe?: boolean;
  ready?: () => void;
  expand?: () => void;
  close?: () => void;
  sendData?: (data: string) => void;
  BackButton?: BaleButton;
  SettingsButton?: BaleButton;
  setHeaderColor?: (color: string) => void;
  enableClosingConfirmation?: () => void;
  disableClosingConfirmation?: () => void;
  onEvent?: (event: string, cb: (...args: unknown[]) => void) => void;
  offEvent?: (event: string, cb: (...args: unknown[]) => void) => void;
};

declare global { interface Window { Bale?: { WebApp?: BaleWebApp } } }

export function useBaleMiniApp() {
  const [webApp, setWebApp] = useState<BaleWebApp | null>(null);
  const [user, setUser] = useState<BaleUser | null>(null);

  useEffect(() => {
    const app = window.Bale?.WebApp ?? null;
    if (!app) return;
    app.ready?.();
    app.expand?.();
    setWebApp(app);
    setUser(app.initDataUnsafe?.user ?? null);
  }, []);

  function sendData(payload: unknown) { webApp?.sendData?.(JSON.stringify(payload)); }

  return {
    webApp,
    user,
    sendData,
    inBale: Boolean(webApp),
    supported: webApp?.isMiniAppSupported !== false,
    initData: webApp?.initData ?? "",
    startParam: typeof window!=="undefined"?new URLSearchParams(window.location.search).get("tgWebAppStartParam")||"":"",
    theme: webApp?.themeParams ?? {},
  };
}
