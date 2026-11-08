"use client";

import { usePortalLanguage } from "./portal-preferences";

const fontOptions = [
  { value: 90, label: "ตัวอักษรขนาดเล็ก", size: "small" },
  { value: 100, label: "ตัวอักษรขนาดปกติ", size: "normal" },
  { value: 120, label: "ตัวอักษรขนาดใหญ่", size: "large" },
];

export default function PortalFontControl() {
  const { t, fontSize, setFontSize } = usePortalLanguage();
  return <div className="portal-font-control" role="group" aria-label={t("ขนาดตัวอักษร")}>
    {fontOptions.map(option => <button key={option.value} type="button" className={`portal-font-option font-${option.size}`} aria-label={t(option.label)} aria-pressed={fontSize === option.value} onClick={() => setFontSize(option.value)}>Aa</button>)}
  </div>;
}
