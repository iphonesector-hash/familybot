import type { Metadata, Viewport } from "next";
import Script from "next/script";
import BaleBridge from "./BaleBridge";
import BirthdayMode from "./BirthdayMode";
import SessionBridge from "./SessionBridge";
import MiniAppBootstrap from "./MiniAppBootstrap";
import NativeBaleNav from "./NativeBaleNav";
import "./globals.css";
import "./motion.css";
import "./platform.css";
import "./admin.css";
import "./birthday.css";

export const metadata: Metadata = {
  title: "Family Bot | خانواده بزرگ جهانی",
  description: "دستیار هوشمند، مدیریت، سرگرمی و زندگی دیجیتال خانواده بزرگ جهانی در بله",
  applicationName: "Family Bot",
  appleWebApp: { capable: true, title: "Family Bot", statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#09051f",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning>
      <head><Script src="https://tapi.bale.ai/miniapp.js?3" strategy="beforeInteractive"/></head>
      <body><SessionBridge/><BaleBridge/><MiniAppBootstrap/><NativeBaleNav/><BirthdayMode/>{children}</body>
    </html>
  );
}
