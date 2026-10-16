import Link from "next/link";
import WorkspaceHeader from "./workspace-header";
import PortalIcon from "./portal-icon";
import StorageIllustration from "./storage-illustration";
export default function StorageLanding() {
  return <div className="workspace-shell intake-shell min-h-svh"><WorkspaceHeader/><main className="intake-main storage-main px-5 sm:px-8">
    <nav className="intake-breadcrumb flex items-center gap-3" aria-label="เส้นทางหน้า"><Link href="/portal" className="flex items-center gap-2"><PortalIcon name="home"/>หน้าแรก</Link><PortalIcon name="chevron" className="size-3"/><span>คลังข้อมูล</span></nav>
    <h1 className="sr-only">คลังข้อมูล</h1><section className="intake-panel storage-landing"><h2 className="intake-heading">เลือกประเภทข้อมูลที่ต้องการจัดเก็บ</h2><div className="storage-cards">{(["tissue", "slides"] as const).map(kind=><Link key={kind} href={`/portal/storage/${kind === "tissue" ? "examinations" : "requests"}`} className="storage-card"><StorageIllustration kind={kind}/><h3>{kind === "tissue" ? "เก็บผลบันทึกการตรวจ" : "เก็บคำร้องจากถาดสไลด์"}</h3><p>{kind === "tissue" ? "สำหรับชิ้นเนื้อ (ขวด, ภาชนะใหญ่)" : "สำหรับสไลด์ (ถาดและกล่องเก็บ)"}</p><span className="intake-button intake-button-primary">เข้าใช้งาน<PortalIcon name="chevron"/></span></Link>)}</div></section>
  </main></div>;
}
