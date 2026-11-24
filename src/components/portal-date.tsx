"use client";

import { usePortalLanguage } from "./portal-preferences";

/** Pass an ISO date/time or epoch milliseconds; API Unix seconds need ×1000. */
export default function PortalDate({ value, includeTime = false }: { value: string | number; includeTime?: boolean }) {
  const { locale } = usePortalLanguage();
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return <>—</>;
  const formatted = new Intl.DateTimeFormat(locale, {
    timeZone: "Asia/Bangkok", day: "numeric", month: "short", year: "numeric",
    ...(includeTime ? { hour: "2-digit", minute: "2-digit", second: "2-digit" } as const : {}),
  }).format(date);
  return <time dateTime={date.toISOString()}>{formatted}</time>;
}
