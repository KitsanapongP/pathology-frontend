"use client";
import { PortalText, usePortalLanguage } from './portal-preferences';

import PortalDate from "./portal-date";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import PortalIcon, { type PortalIconName } from "./portal-icon";

const requests = [
  { id: "REQ-2026-0012", title: "ขอเพิ่มสิทธิ์ใช้งานระบบพยาธิวิทยา", type: "บัญชีผู้ใช้", status: "รอดำเนินการ", date: "2026-10-16T00:00:00+07:00" },
  { id: "REQ-2026-0011", title: "ขอปรับปรุงข้อมูลหน่วยงาน", type: "ข้อมูล", status: "กำลังดำเนินการ", date: "2026-10-16T00:00:00+07:00" },
  { id: "REQ-2026-0010", title: "ขอเปิดใช้งานระบบใหม่", type: "ระบบ", status: "เสร็จสิ้น", date: "2026-10-15T00:00:00+07:00" },
  { id: "REQ-2026-0009", title: "แจ้งปัญหาการเข้าสู่ระบบ", type: "แจ้งปัญหา", status: "รอดำเนินการ", date: "2026-10-15T00:00:00+07:00" },
  { id: "REQ-2026-0008", title: "ขอแก้ไขข้อมูลบุคลากร", type: "ข้อมูล", status: "เสร็จสิ้น", date: "2026-10-14T00:00:00+07:00" },
];

const services: { name: string; icon: PortalIconName; uptime: number }[] = [
  { name: "Frontend Website", icon: "globe", uptime: 99.9 },
  { name: "Backend API", icon: "server", uptime: 99.8 },
  { name: "Database (PostgreSQL)", icon: "database", uptime: 99.9 },
  { name: "File Storage", icon: "folder", uptime: 99.7 },
  { name: "Authentication (SSO)", icon: "shield", uptime: 99.9 },
  { name: "Email Service", icon: "mail", uptime: 99.8 },
  { name: "Scheduled Jobs", icon: "clock", uptime: 100 },
  { name: "N8N Workflow", icon: "workflow", uptime: 99.6 },
];

const logs = [
  { id: 1, time: "2026-10-16T14:28:12+07:00", daysAgo: 0, level: "INFO", service: "backend-api", message: "User login successful: admin (SSO)", detail: "ผู้ใช้งาน Admin เข้าสู่ระบบผ่าน SSO สำเร็จ" },
  { id: 2, time: "2026-10-16T14:25:03+07:00", daysAgo: 0, level: "WARN", service: "file-storage", message: "High disk usage: 82% (threshold: 80%)", detail: "พื้นที่จัดเก็บข้อมูลเกินเกณฑ์ที่กำหนด ควรตรวจสอบพื้นที่และนโยบายการจัดเก็บ" },
  { id: 3, time: "2026-10-16T14:20:45+07:00", daysAgo: 0, level: "INFO", service: "n8n", message: "Workflow executed successfully: auto-backup", detail: "งานสำรองข้อมูลอัตโนมัติทำงานสำเร็จ" },
  { id: 4, time: "2026-10-15T14:18:21+07:00", daysAgo: 1, level: "ERROR", service: "email-service", message: "Failed to send email: connection timeout", detail: "การเชื่อมต่อ Email Service หมดเวลา กรุณาตรวจสอบสถานะการเชื่อมต่อ" },
  { id: 5, time: "2026-10-14T14:15:32+07:00", daysAgo: 2, level: "INFO", service: "frontend", message: "New session created", detail: "สร้าง session ของผู้ใช้งานสำเร็จ" },
];

function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  const { t } = usePortalLanguage();
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { ref.current?.showModal(); }, []);
  return <dialog ref={ref} aria-labelledby="portal-dialog-title" onCancel={onClose} onClick={(event) => { if (event.target === event.currentTarget) onClose(); }} className="portal-dialog m-auto max-h-[85svh] w-[calc(100%-2rem)] max-w-3xl overflow-y-auto rounded-2xl border border-[#dce6f3] bg-white p-0 text-[#24416b] shadow-2xl backdrop:bg-[#102b50]/35 backdrop:backdrop-blur-sm">
    <div className="flex items-center justify-between gap-4 border-b border-[#e7edf5] px-6 py-5"><h2 id="portal-dialog-title" className="text-lg font-bold text-[#0c285d]"><PortalText>{title}</PortalText></h2><button onClick={onClose} aria-label={t("ปิดหน้าต่าง")} className="portal-icon-button"><PortalIcon name="close" /></button></div>
    <div className="p-6"><PortalText>{children}</PortalText></div>
  </dialog>;
}

function StatusBadge({ status }: { status: string }) {
  const color = status === "เสร็จสิ้น" ? "green" : status === "กำลังดำเนินการ" ? "blue" : "amber";
  return <span className={`portal-badge badge-${color}`}><span className="size-1.5 rounded-full bg-current" /><PortalText>{status}</PortalText></span>;
}

function SimpleTable({ columns, rows }: { columns: string[]; rows: ReactNode[][] }) {
  const { t } = usePortalLanguage();
  return <div className="portal-table-scroll" tabIndex={0} role="region" aria-label={t("ตารางข้อมูล")}><table className="portal-table"><thead><tr>{columns.map(c => <th scope="col" key={c}><PortalText>{c}</PortalText></th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={index}>{row.map((cell, i) => <td key={i}><PortalText>{cell}</PortalText></td>)}</tr>)}</tbody></table></div>;
}

export default function PortalDashboard({ view = "dashboard" }: { view?: "dashboard" | "requests" | "storage" | "logs" }) {
  const { t } = usePortalLanguage();
  const router = useRouter();
  const [severity, setSeverity] = useState("ALL");
  const [period, setPeriod] = useState("7");
  const [search, setSearch] = useState("");
  const [updated, setUpdated] = useState<string | number>("2026-10-16T14:32:00+07:00");
  const [refreshing, setRefreshing] = useState(false);
  const [detail, setDetail] = useState<{ title: string; content: ReactNode } | null>(null);
  const filteredLogs = logs.filter(log => (severity === "ALL" || log.level === severity) && log.daysAgo < Number(period) && `${log.service} ${log.message}`.toLowerCase().includes(search.toLowerCase()));

  function showRequests() { router.push("/portal/admin/requests"); }

  function showUsers() { router.push("/portal/admin/users"); }

  function showInventory() { router.push("/portal/admin/storage"); }

  function showServices() { router.push("/portal/admin/logs"); }

  function showLogs() { router.push("/portal/admin/logs"); }

  function refresh() {
    setRefreshing(true);
    setUpdated(Date.now());
    window.setTimeout(() => setRefreshing(false), 600);
  }

  const servicesPanel = (<section className="portal-panel min-w-0" aria-labelledby="services-heading"><div className="portal-panel-heading"><h2 id="services-heading"><PortalIcon name="heart" className="portal-heading-icon" /><PortalText>สถานะเซอร์วิส</PortalText></h2>{view === "dashboard" && <button onClick={showServices} className="portal-text-link"><PortalText>ดูรายละเอียด</PortalText><PortalIcon name="arrow" className="size-3.5" /></button>}</div><ul className="pb-1">{services.map(service => <li key={service.name} className="portal-service-row"><PortalIcon name={service.icon} className="size-[17px] text-[#617a9e]" /><span className="truncate text-[0.75rem] text-[#334e77]"><PortalText>{service.name}</PortalText></span><span className="flex items-center gap-1.5 whitespace-nowrap text-[0.6875rem] text-[#10af49]"><span className="size-2 rounded-full bg-[#12bb4f]" /><PortalText>ใช้งานได้</PortalText></span><span className="text-right text-[0.6875rem] tabular-nums text-[#7a8daa]"><PortalText>{service.uptime}</PortalText>%</span><span role="meter" aria-label={`${t(service.name)} ${t("ระยะเวลาพร้อมใช้งาน")}`} aria-valuenow={service.uptime} aria-valuemin={0} aria-valuemax={100} className="h-[7px] overflow-hidden rounded-full bg-[#e3eaf1]"><span className="block h-full rounded-full bg-gradient-to-r from-[#31b86a] to-[#49bd78]" style={{ width: `${service.uptime}%` }} /></span></li>)}</ul></section>);
  const logsPanel = (<section className="portal-panel" aria-labelledby="logs-heading">
        <div className="portal-panel-heading flex-wrap gap-y-3"><h2 id="logs-heading"><PortalIcon name="file" className="portal-heading-icon" /><PortalText>ล็อกล่าสุด</PortalText></h2><div className="flex flex-wrap items-center gap-2"><label className="sr-only" htmlFor="log-severity"><PortalText>ระดับล็อก</PortalText></label><select id="log-severity" value={severity} onChange={e => setSeverity(e.target.value)} className="portal-filter w-36"><option value="ALL"><PortalText>ทั้งหมด</PortalText></option><option value="INFO">INFO</option><option value="WARN">WARN</option><option value="ERROR">ERROR</option></select><label className="sr-only" htmlFor="log-period"><PortalText>ช่วงเวลา</PortalText></label><select id="log-period" value={period} onChange={e => setPeriod(e.target.value)} className="portal-filter w-36"><option value="7"><PortalText>7 วันที่ผ่านมา</PortalText></option><option value="1"><PortalText>วันนี้</PortalText></option><option value="30"><PortalText>30 วันที่ผ่านมา</PortalText></option></select><div className="flex h-8 items-center gap-2 rounded-md border border-[#dce6f2] bg-white px-2.5 text-[#7c91ad]"><PortalIcon name="search" className="size-4" /><input aria-label={t("ค้นหาในล็อก")} value={search} onChange={e => setSearch(e.target.value)} placeholder={t("ค้นหาในล็อก...")} className="w-36 min-w-0 bg-transparent text-[0.75rem] text-[#35517c] outline-none placeholder:text-[#97a5b9] xl:w-44" /></div>{view === "dashboard" && <button onClick={showLogs} className="portal-text-link ml-2"><PortalText>ดูทั้งหมด</PortalText><PortalIcon name="arrow" className="size-3.5" /></button>}</div></div>
        <div className="portal-table-scroll"><table className="portal-table log-table"><thead><tr><th><PortalText>เวลา</PortalText></th><th><PortalText>ระดับ</PortalText></th><th><PortalText>บริการ</PortalText></th><th><PortalText>ข้อความ</PortalText></th><th><span className="sr-only"><PortalText>รายละเอียด</PortalText></span></th></tr></thead><tbody>{filteredLogs.map(log => <tr key={log.id}><td className="whitespace-nowrap tabular-nums text-[#6b82a3]"><PortalDate value={log.time} includeTime /></td><td><span className={`portal-level level-${log.level.toLowerCase()}`}><PortalText>{log.level}</PortalText></span></td><td className="whitespace-nowrap"><PortalText>{log.service}</PortalText></td><td className="min-w-64"><PortalText>{log.message}</PortalText></td><td><button onClick={() => setDetail({ title: `รายละเอียดล็อก #${log.id}`, content: <div className="space-y-4 text-sm"><div className="flex items-center gap-3"><span className={`portal-level level-${log.level.toLowerCase()}`}><PortalText>{log.level}</PortalText></span><span><PortalText>{log.service}</PortalText></span><span className="ml-auto text-xs text-[#8a99ad]"><PortalDate value={log.time} includeTime /></span></div><p className="rounded-lg bg-[#f2f6fb] p-4 font-mono text-xs leading-6 break-words"><PortalText>{log.message}</PortalText></p><p className="leading-7"><PortalText>{log.detail}</PortalText></p></div> })} className="whitespace-nowrap text-[0.75rem] text-[#0878ff] hover:underline"><PortalText>ดูรายละเอียด</PortalText></button></td></tr>)}{filteredLogs.length === 0 && <tr><td colSpan={5} className="py-8! text-center text-[#8493aa]"><PortalText>ไม่พบล็อกที่ตรงกับเงื่อนไขการค้นหา</PortalText></td></tr>}</tbody></table></div>
      </section>);
  if (view !== "dashboard") {
    const title = view === "requests" ? "จัดการคำร้อง" : view === "storage" ? "จัดการคลังข้อมูล" : "ตรวจสอบล็อกและเซอร์วิส";
    return <main className="portal-main admin-section">
      <h1 className="profile-heading"><PortalText>{title}</PortalText></h1>
      {view === "requests" && <section className="portal-panel admin-directory"><SimpleTable columns={["เลขคำร้อง", "หัวข้อคำร้อง", "ประเภท", "สถานะ", "วันที่"]} rows={requests.map(r => [r.id, r.title, r.type, <StatusBadge key={r.id} status={r.status} />, <PortalDate key={r.id} value={r.date} />])} /></section>}
      {view === "storage" && <section className="portal-panel admin-directory"><SimpleTable columns={["คลังข้อมูล", "รหัสหน่วยงาน", "ประเภท"]} rows={[["หน่วยรับสิ่งส่งตรวจ", "PATH-01", "ข้อมูลคำร้อง"], ["ห้องปฏิบัติการ", "PATH-02", "ชิ้นเนื้อและสไลด์"], ["คลังเอกสาร", "PATH-03", "เอกสารคำร้อง"]]} /></section>}
      {view === "logs" && <div className="admin-log-panels">{servicesPanel}{logsPanel}</div>}
      {detail && <Modal title={detail.title} onClose={() => setDetail(null)}>{detail.content}</Modal>}
    </main>;
  }
  return <>
    <main className="portal-main mx-auto px-4 py-6 sm:px-6 lg:ml-[296px] lg:px-8 lg:py-7 xl:px-9">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div><h1 className="text-[1.5625rem] font-bold tracking-tight text-[#0c265e] xl:text-[1.75rem]"><PortalText>แดชบอร์ดผู้ดูแลระบบ</PortalText></h1><p className="mt-1 text-[0.8125rem] text-[#8191ab]"><PortalText>ภาพรวมการใช้งานระบบ และสถานะบริการต่าง ๆ</PortalText></p></div>
        <div className="flex flex-wrap items-center gap-5 text-xs text-[#7388a7]"><span className="flex items-center gap-2"><PortalIcon name="calendar" className="size-4 text-[#1454a6]" /><span aria-live="polite"><PortalText>อัปเดตล่าสุด</PortalText>{" "}<PortalDate value={updated} includeTime /></span></span><button onClick={refresh} disabled={refreshing} className="portal-refresh"><PortalIcon name="refresh" className={`size-4 ${refreshing ? "animate-spin" : ""}`} /><PortalText>{refreshing ? "กำลังรีเฟรช..." : "รีเฟรชข้อมูล"}</PortalText></button></div>
      </div>

      <section aria-label={t("สรุปภาพรวม")} className="mb-4 grid grid-cols-1 gap-4 min-[640px]:grid-cols-2 min-[1600px]:grid-cols-4">
        {[
          { label: "ผู้ใช้ทั้งหมด", value: "1,482", icon: "users" as const, tone: "blue", action: showUsers, sub: <><PortalIcon name="up" className="size-3.5" /><span>+12 <span className="text-[#7d8eaa]"><PortalText>จากสัปดาห์ที่แล้ว</PortalText></span></span></> },
          { label: "คำร้องทั้งหมด", value: "87", icon: "file" as const, tone: "amber", action: showRequests, sub: <><span className="size-2.5 rounded-full bg-[#f39b0d]" /><PortalText>รอดำเนินการ 18 รายการ</PortalText></> },
          { label: "คลังข้อมูล", value: "24", icon: "database" as const, tone: "navy", action: showInventory, sub: <span className="text-[#8190aa]"><PortalText>แหล่งข้อมูลที่ใช้งานอยู่</PortalText></span> },
          { label: "สถานะเซอร์วิส", value: "8 / 8", icon: "heart" as const, tone: "green", action: showServices, sub: <><span className="size-2.5 rounded-full bg-[#0cba50]" /><PortalText>ทุกระบบใช้งานได้</PortalText></> },
        ].map(stat => <button key={stat.label} onClick={stat.action} className="portal-stat group flex min-h-[118px] items-start gap-4 rounded-xl bg-white p-[18px] text-left shadow-[0_3px_18px_rgba(42,77,115,0.025)] transition hover:-translate-y-0.5 hover:shadow-md"><span className={`portal-stat-icon tone-${stat.tone}`}><PortalIcon name={stat.icon} className="size-7" /></span><span className="min-w-0 flex-1"><span className="flex items-center justify-between gap-2 text-sm font-semibold text-[#284373]"><PortalText>{stat.label}</PortalText><PortalIcon name="chevron" className="size-3" /></span><span className="mt-1.5 block text-[1.6875rem] font-bold leading-8 tracking-wide text-[#0c255e]"><PortalText>{stat.value}</PortalText></span><span className={`mt-1.5 flex items-center gap-1.5 text-[0.75rem] ${stat.tone === "amber" ? "text-[#dd8500]" : "text-[#0bad4b]"}`}><PortalText>{stat.sub}</PortalText></span></span></button>)}
      </section>

      <div className="mb-4 grid items-stretch gap-4 min-[1350px]:grid-cols-[1.2fr_1fr]">
        <section className="portal-panel min-w-0" aria-labelledby="requests-heading">
          <div className="portal-panel-heading"><h2 id="requests-heading"><PortalIcon name="file" className="portal-heading-icon" /><PortalText>คำร้องล่าสุด</PortalText></h2><button onClick={showRequests} className="portal-text-link"><PortalText>ดูทั้งหมด</PortalText><PortalIcon name="arrow" className="size-3.5" /></button></div>
          <div className="portal-table-scroll pb-2"><table className="portal-table"><thead><tr><th>#</th><th><PortalText>หัวข้อคำร้อง</PortalText></th><th><PortalText>ประเภท</PortalText></th><th><PortalText>สถานะ</PortalText></th><th><PortalText>วันที่</PortalText></th></tr></thead><tbody>{requests.map(request => <tr key={request.id}><td className="whitespace-nowrap"><PortalText>{request.id}</PortalText></td><td><button onClick={() => setDetail({ title: request.id, content: <dl className="space-y-4 text-sm"><div><dt className="text-xs text-[#8091a9]"><PortalText>หัวข้อคำร้อง</PortalText></dt><dd className="mt-1 font-medium"><PortalText>{request.title}</PortalText></dd></div><div><dt className="mb-2 text-xs text-[#8091a9]"><PortalText>สถานะ</PortalText></dt><dd><StatusBadge status={request.status} /></dd></div><div><dt className="text-xs text-[#8091a9]"><PortalText>วันที่</PortalText></dt><dd className="mt-1"><PortalDate value={request.date} /></dd></div></dl> })} className="block max-w-44 truncate text-left hover:text-[#0878ff] hover:underline" title={t(request.title)}><PortalText>{request.title}</PortalText></button></td><td><span className="rounded-md bg-[#e9eef5] px-2 py-0.5 text-[0.6875rem] font-medium text-[#536b8d] whitespace-nowrap"><PortalText>{request.type}</PortalText></span></td><td><StatusBadge status={request.status} /></td><td className="whitespace-nowrap text-[#788da9]"><PortalDate value={request.date} /></td></tr>)}</tbody></table></div>
        </section>

        {servicesPanel}
      </div>

      {logsPanel}
    </main>
    {detail && <Modal title={detail.title} onClose={() => setDetail(null)}><PortalText>{detail.content}</PortalText></Modal>}
  </>;
}



