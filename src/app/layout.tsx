import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pathology Frontend",
  description: "แพลตฟอร์มจัดการงานพยาธิวิทยา",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="th">
      <body className="antialiased">{children}</body>
    </html>
  );
}
