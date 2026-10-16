import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

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
      <body className="antialiased">{children}</body>
    </html>
  );
}
