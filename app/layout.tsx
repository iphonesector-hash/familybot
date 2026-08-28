import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./motion.css";

export const metadata: Metadata = {
  title: "Family Bot | خانواده بزرگ جهانی",
  description: "دستیار هوشمند، مدیریت، سرگرمی و زندگی دیجیتال خانواده بزرگ جهانی در بله",
  applicationName: "Family Bot",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#09051f",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fa" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
