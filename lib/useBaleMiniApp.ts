"use client";

import { useEffect, useState } from "react";

type BaleUser = { id?: number; first_name?: string; last_name?: string; username?: string };

type BaleWebApp = {
  initData?: string;
  initDataUnsafe?: { user?: BaleUser };
  ready?: () => void;
  expand?: () => void;
  close?: () => void;
  sendData?: (data: string) => void;
  MainButton?: { setText?: (text: string) => void; show?: () => void; hide?: () => void; onClick?: (cb: () => void) => void };
  BackButton?: { show?: () => void; hide?: () => void; onClick?: (cb: () => void) => void };
};

declare global {
  interface Window {
    Bale?: { WebApp?: BaleWebApp };
  }
}

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

  function sendData(payload: unknown) {
    webApp?.sendData?.(JSON.stringify(payload));
  }

  return { webApp, user, sendData, inBale: Boolean(webApp), initData: webApp?.initData ?? "" };
}
