"use client";

import { useEffect, useSyncExternalStore } from "react";
import { usePathname, useRouter } from "next/navigation";
import { portalSession } from "@/lib/portal-api";
import { sessionDestination, type SessionState } from "@/lib/session-manager";
import { demoDestination, demoSnapshot, isDemoAuth, subscribeDemo, type DemoState } from "@/lib/demo-session";

export default function SessionGuard({ children }: { children: React.ReactNode }) {
  return isDemoAuth() ? <DemoGuard>{children}</DemoGuard> : <ApiSessionGuard>{children}</ApiSessionGuard>;
}

function DemoGuard({ children }: { children: React.ReactNode }) {
  const state = useSyncExternalStore(subscribeDemo, demoSnapshot, (): DemoState => "checking");
  const apiState = useSyncExternalStore(portalSession.subscribe, portalSession.getSnapshot, (): SessionState => "checking");
  if (state === "checking") return null;
  if (state === "anonymous" || apiState === "password-required" || apiState === "authenticated") return <ApiSessionGuard>{children}</ApiSessionGuard>;
  return <DemoRoleGuard state={state}>{children}</DemoRoleGuard>;
}

function DemoRoleGuard({ state, children }: { state: DemoState; children: React.ReactNode }) {
  const router = useRouter();
  const destination = demoDestination(state, usePathname());
  useEffect(() => { if (destination) router.replace(destination); }, [destination, router]);
  return state === "checking" || destination ? null : children;
}

function ApiSessionGuard({ children }: { children: React.ReactNode }) {
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
