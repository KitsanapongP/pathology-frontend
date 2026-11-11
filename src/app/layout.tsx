import type { Metadata } from "next";
import localFont from "next/font/local";
import type { CSSProperties } from "react";
import { publicAsset } from "@/lib/public-asset";
import "./globals.css";
import SessionGuard from "@/components/session-guard";

const notoSansThai = localFont({
  src: "./fonts/NotoSansThai.ttf",
  variable: "--font-noto-sans-thai",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Pathology Frontend",
  description: "แพลตฟอร์มจัดการงานพยาธิวิทยา",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="th" className={notoSansThai.variable}>
      <body className="antialiased" style={{ "--campus-background": `url("${publicAsset("/images/campus-background.png")}")` } as CSSProperties}><SessionGuard>{children}</SessionGuard></body>
    </html>
  );
}
