"use client";

import Link from "next/link";
import type { ApiError } from "@/lib/api-client";
import { ApiErrorNotice } from "./api-feedback";
import { PortalText } from "./portal-preferences";

export default function PortalForbidden({ error }: { error?: ApiError }) {
  return <section className="profile-panel users-feedback" aria-labelledby="forbidden-heading">
    <h1 id="forbidden-heading"><PortalText>ไม่มีสิทธิ์</PortalText></h1>
    <ApiErrorNotice error={error ?? null} />
    <Link href="/portal" className="intake-button"><PortalText>กลับไปหน้า Portal</PortalText></Link>
  </section>;
}
