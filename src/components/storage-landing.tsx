"use client";
import { PortalText, usePortalLanguage } from './portal-preferences';
import Link from "next/link";
import PortalIcon from "./portal-icon";
import StorageIllustration from "./storage-illustration";
export default function StorageLanding() {
  const { t } = usePortalLanguage();
  return <div className="workspace-shell intake-shell min-h-svh"><main className="intake-main storage-main px-5 sm:px-8"><div className="portal-module-content">
    <nav className="intake-breadcrumb flex items-center gap-3" aria-label={t("เส้นทางหน้า")}><Link href="/portal" className="flex items-center gap-2"><PortalIcon name="home"/><PortalText>หน้าแรก</PortalText></Link><PortalIcon name="chevron" className="size-3"/><span><PortalText>คลังข้อมูล</PortalText></span></nav>
    <h1 className="sr-only"><PortalText>คลังข้อมูล</PortalText></h1><section className="intake-panel storage-landing"><h2 className="intake-heading"><PortalText>เลือกประเภทข้อมูลที่ต้องการจัดเก็บ</PortalText></h2><div className="storage-cards">{(["tissue", "slides"] as const).map(kind=><Link key={kind} href={`/portal/storage/${kind === "tissue" ? "examinations" : "requests"}`} className="storage-card"><StorageIllustration kind={kind}/><h3><PortalText>{kind === "tissue" ? "เก็บผลบันทึกการตรวจ" : "เก็บคำร้องจากถาดสไลด์"}</PortalText></h3><p><PortalText>{kind === "tissue" ? "สำหรับชิ้นเนื้อ (ขวด, ภาชนะใหญ่)" : "สำหรับสไลด์ (ถาดและกล่องเก็บ)"}</PortalText></p><span className="intake-button intake-button-primary"><PortalText>เข้าใช้งาน</PortalText><PortalIcon name="chevron"/></span></Link>)}</div></section>
  </div></main></div>;
}
