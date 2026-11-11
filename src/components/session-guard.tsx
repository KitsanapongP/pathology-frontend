"use client";

import { useEffect, useSyncExternalStore } from "react";
import { usePathname, useRouter } from "next/navigation";
import { portalSession } from "@/lib/portal-api";
import { sessionDestination, type SessionState } from "@/lib/session-manager";

export default function SessionGuard({ children }: { children: React.ReactNode }) {
  const state = useSyncExternalStore(portalSession.subscribe, portalSession.getSnapshot, (): SessionState => "checking");
  const pathname = usePathname();
  const router = useRouter();
  const destination = sessionDestination(state, pathname);
  useEffect(() => {
    void portalSession.start().catch(() => {});
    const resume = () => { if (document.visibilityState !== "hidden") void portalSession.getAccessToken().catch(() => {}); };
    window.addEventListener("focus", resume);
    window.addEventListener("pageshow", resume);
    document.addEventListener("visibilitychange", resume);
    return () => {
      window.removeEventListener("focus", resume);
      window.removeEventListener("pageshow", resume);
      document.removeEventListener("visibilitychange", resume);
    };
  }, []);
  useEffect(() => { if (destination) router.replace(destination); }, [destination, router]);
  if (state === "checking" || destination) return null;
  return children;
}
