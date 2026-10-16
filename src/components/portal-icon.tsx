import type { CSSProperties } from "react";

const paths = {
  home: "m3 10 9-7 9 7M5 9v12h5v-7h4v7h5V9",
  users: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M17 4a4 4 0 0 1 0 8m5 9v-2a4 4 0 0 0-3-3.87M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z",
  file: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Zm0 0v6h6M8 12h8m-8 4h6",
  database: "M20 5c0 2-3.6 3-8 3S4 7 4 5s3.6-3 8-3 8 1 8 3Zm0 0v14c0 2-3.6 3-8 3s-8-1-8-3V5m0 7c0 2 3.6 3 8 3s8-1 8-3",
  chart: "M3 3h18v18H3V3Zm4 13 4-5 3 3 4-7",
  settings: "m9 3-1 3-3 1-2 3 2 2v3l3 1 1 3h4l1-3 3-1 2-3-2-2V7l-3-1-1-3H9Zm3 6a3 3 0 1 1 0 6 3 3 0 0 1 0-6Z",
  heart: "M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8ZM6 12h3l2-4 2 8 2-4h3",
  calendar: "M8 2v4m8-4v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z",
  refresh: "M20 7v5h-5M4 17v-5h5m-4-4a8 8 0 0 1 13-4l2 3M4 17l2 3a8 8 0 0 0 13-4",
  bell: "M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9m-11 12a2 2 0 0 0 4 0",
  chevron: "m9 5 7 7-7 7",
  arrow: "M4 12h16m-6-6 6 6-6 6",
  up: "M12 20V4m-6 6 6-6 6 6",
  globe: "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM3 12h18m-9-9a18 18 0 0 1 0 18 18 18 0 0 1 0-18Z",
  server: "M4 3h16v7H4V3Zm0 11h16v7H4v-7ZM7 6h.01M7 17h.01M11 6h6m-6 11h6",
  folder: "M3 5h7l2 3h9v12H3V5Z",
  shield: "m12 3 8 4v6c0 5-8 9-8 9s-8-4-8-9V7l8-4Zm-4 9 3 3 5-5",
  mail: "M3 5h18v14H3V5Zm0 0 9 8 9-8",
  clock: "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-5v5l3 2",
  workflow: "M9 2h6v6H9V2ZM2 16h6v6H2v-6Zm14 0h6v6h-6v-6Zm-4-8v4m-7 4v-4h14v4",
  search: "M10 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16Zm6-2 6 6",
  close: "m6 6 12 12M6 18 18 6",
  menu: "M3 6h18M3 12h18M3 18h18",
  logout: "M9 3H4v18h5m5-14 5 5-5 5m-7-5h12",
  scan: "M7 2H3v4m14-4h4v4M3 18v4h4m14-4v4h-4M9 6h5l4 4v9H7V6h2Zm5 0v4h4M10 13h5m-5 3h5",
  microphone: "M15 5a3 3 0 0 0-6 0v7a3 3 0 0 0 6 0V5ZM5 11v1a7 7 0 0 0 14 0v-1m-7 8v3m-4 0h8m6-13v5",
  barcode: "M7 2H3v4m14-4h4v4M3 18v4h4m14-4v4h-4M7 7v10m3-10v10m4-10v10m3-10v10",
  archive: "M3 4h18v5H3V4Zm1 5h16v12H4V9Zm6 4h4",
} as const;

export type PortalIconName = keyof typeof paths;

export default function PortalIcon({ name, className = "", style }: { name: PortalIconName; className?: string; style?: CSSProperties }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={`size-5 shrink-0 ${className}`} style={style}><path d={paths[name]} /></svg>;
}
