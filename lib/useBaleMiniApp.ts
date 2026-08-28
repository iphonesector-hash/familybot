"use client";

import { useEffect, useState } from "react";

type BaleUser = { id?: number; first_name?: string; last_name?: string; username?: string; photo_url?: string };
type BaleTheme = { bg_color?: string; text_color?: string; hint_color?: string; link_color?: string; button_color?: string; button_text_color?: string; secondary_bg_color?: string };
type BaleButton = { setText?: (text: string) => void; show?: () => void; hide?: () => void; onClick?: (cb: () => void) => void; offClick?: (cb: () => void) => void };
type BaleWebApp = {
  initData?: string;
  initDataUnsafe?: { user?: BaleUser; start_param?: string; chat_type?: string; chat_instance?: string };
  colorScheme?: "light" | "dark";
  themeParams?: BaleTheme;
  viewportHeight?: number;
  viewportStableHeight?: number;
  isExpanded?: boolean;
  ready?: () => void;
  expand?: () => void;
  close?: () => void;
  sendData?: (data: string) => void;
  MainButton?: BaleButton;
  BackButton?: BaleButton;
  HapticFeedback?: { impactOccurred?: (style: "light"|"medium"|"heavy") => void; notificationOccurred?: (type: "error"|"success"|"warning") => void; selectionChanged?: () => void };
  onEvent?: (event: string, cb: () => void) => void;
  offEvent?: (event: string, cb: () => void) => void;
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
  function haptic(kind: "tap"|"success"|"warning"|"error" = "tap") {
    if (kind === "tap") webApp?.HapticFeedback?.impactOccurred?.("light");
    else webApp?.HapticFeedback?.notificationOccurred?.(kind);
  }

  return {
    webApp,
    user,
    sendData,
    haptic,
    inBale: Boolean(webApp),
    initData: webApp?.initData ?? "",
    startParam: webApp?.initDataUnsafe?.start_param ?? "",
    chatType: webApp?.initDataUnsafe?.chat_type ?? "",
    theme: webApp?.themeParams ?? {},
  };
}
