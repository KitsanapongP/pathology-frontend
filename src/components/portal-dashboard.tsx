"use client";
import { PortalText, usePortalLanguage } from './portal-preferences';

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import PortalIcon, { type PortalIconName } from "./portal-icon";

const requests = [
  { id: "REQ-2026-0012", title: "ขอเพิ่มสิทธิ์ใช้งานระบบพยาธิวิทยา", type: "บัญชีผู้ใช้", status: "รอดำเนินการ", date: "16 ต.ค. 2569" },
  { id: "REQ-2026-0011", title: "ขอปรับปรุงข้อมูลหน่วยงาน", type: "ข้อมูล", status: "กำลังดำเนินการ", date: "16 ต.ค. 2569" },
  { id: "REQ-2026-0010", title: "ขอเปิดใช้งานระบบใหม่", type: "ระบบ", status: "เสร็จสิ้น", date: "15 ต.ค. 2569" },
  { id: "REQ-2026-0009", title: "แจ้งปัญหาการเข้าสู่ระบบ", type: "แจ้งปัญหา", status: "รอดำเนินการ", date: "15 ต.ค. 2569" },
  { id: "REQ-2026-0008", title: "ขอแก้ไขข้อมูลบุคลากร", type: "ข้อมูล", status: "เสร็จสิ้น", date: "14 ต.ค. 2569" },
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
  { id: 1, time: "16 ต.ค. 2569  14:28:12", daysAgo: 0, level: "INFO", service: "backend-api", message: "User login successful: admin (SSO)", detail: "ผู้ใช้งาน Admin เข้าสู่ระบบผ่าน SSO สำเร็จ" },
  { id: 2, time: "16 ต.ค. 2569  14:25:03", daysAgo: 0, level: "WARN", service: "file-storage", message: "High disk usage: 82% (threshold: 80%)", detail: "พื้นที่จัดเก็บข้อมูลเกินเกณฑ์ที่กำหนด ควรตรวจสอบพื้นที่และนโยบายการจัดเก็บ" },
  { id: 3, time: "16 ต.ค. 2569  14:20:45", daysAgo: 0, level: "INFO", service: "n8n", message: "Workflow executed successfully: auto-backup", detail: "งานสำรองข้อมูลอัตโนมัติทำงานสำเร็จ" },
  { id: 4, time: "15 ต.ค. 2569  14:18:21", daysAgo: 1, level: "ERROR", service: "email-service", message: "Failed to send email: connection timeout", detail: "การเชื่อมต่อ Email Service หมดเวลา กรุณาตรวจสอบสถานะการเชื่อมต่อ" },
  { id: 5, time: "14 ต.ค. 2569  14:15:32", daysAgo: 2, level: "INFO", service: "frontend", message: "New session created", detail: "สร้าง session ของผู้ใช้งานสำเร็จ" },
];

const demoUsers = [
  ["Admin", "ผู้ดูแลระบบ", "ภาควิชาพยาธิวิทยา", "ใช้งานอยู่"],
  ["เจ้าหน้าที่รับคำร้อง 01", "เจ้าหน้าที่รับคำร้อง", "หน่วยรับสิ่งส่งตรวจ", "ใช้งานอยู่"],
  ["ผู้ตรวจสอบ 01", "ผู้ยืนยันคำร้อง", "ห้องปฏิบัติการ", "ใช้งานอยู่"],
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

function SimpleTable({ columns, rows }: { columns: string[]; rows: string[][] }) {
  return <div className="overflow-x-auto"><table className="portal-table"><thead><tr>{columns.map(c => <th key={c}><PortalText>{c}</PortalText></th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={index}>{row.map((cell, i) => <td key={i}><PortalText>{cell}</PortalText></td>)}</tr>)}</tbody></table></div>;
}

export default function PortalDashboard() {
  const { t } = usePortalLanguage();
  const [mobileMenu, setMobileMenu] = useState(false);
  const [accountMenu, setAccountMenu] = useState(false);
  const [notifications, setNotifications] = useState(false);
  const [severity, setSeverity] = useState("ALL");
  const [period, setPeriod] = useState("7");
  const [search, setSearch] = useState("");
  const [updated, setUpdated] = useState("16 ตุลาคม 2569  14:32 น.");
  const [refreshing, setRefreshing] = useState(false);
  const [detail, setDetail] = useState<{ title: string; content: ReactNode } | null>(null);
  const filteredLogs = logs.filter(log => (severity === "ALL" || log.level === severity) && log.daysAgo < Number(period) && `${log.service} ${log.message}`.toLowerCase().includes(search.toLowerCase()));

  function showRequests() {
    setDetail({ title: "คำร้องทั้งหมด", content: <SimpleTable columns={["เลขคำร้อง", "หัวข้อคำร้อง", "ประเภท", "สถานะ", "วันที่"]} rows={requests.map(r => [r.id, r.title, r.type, r.status, r.date])} /> });
    setMobileMenu(false);
  }

  function showUsers() {
    setDetail({ title: "จัดการผู้ใช้", content: <SimpleTable columns={["ชื่อผู้ใช้", "บทบาท", "หน่วยงาน", "สถานะ"]} rows={demoUsers} /> });
    setMobileMenu(false);
  }

  function showInventory() {
    setDetail({ title: "จัดการคลังข้อมูล", content: <SimpleTable columns={["คลังข้อมูล", "รหัสหน่วยงาน", "ประเภท"]} rows={[["หน่วยรับสิ่งส่งตรวจ", "PATH-01", "ข้อมูลคำร้อง"], ["ห้องปฏิบัติการ", "PATH-02", "ชิ้นเนื้อและสไลด์"], ["คลังเอกสาร", "PATH-03", "เอกสารคำร้อง"]]} /> });
    setMobileMenu(false);
  }

  function showServices() {
    setDetail({ title: "สถานะเซอร์วิส", content: <><SimpleTable columns={["บริการ", "สถานะ", "Uptime"]} rows={services.map(s => [s.name, "ใช้งานได้", `${s.uptime}%`])} /></> });
  }

  function showLogs() {
    setDetail({ title: "ล็อกและประวัติเซอร์วิส", content: <SimpleTable columns={["เวลา", "ระดับ", "บริการ", "ข้อความ"]} rows={logs.map(l => [l.time, l.level, l.service, l.message])} /> });
    setMobileMenu(false);
  }

  function showSettings() {
    setDetail({ title: "ตั้งค่าระบบ", content: <dl className="grid grid-cols-[auto_1fr] gap-x-8 gap-y-4 text-sm"><dt className="text-[#7a8ba4]"><PortalText>ชื่อระบบ</PortalText></dt><dd><PortalText>ระบบสารสนเทศงานพยาธิวิทยา</PortalText></dd><dt className="text-[#7a8ba4]"><PortalText>หน่วยงาน</PortalText></dt><dd><PortalText>ภาควิชาพยาธิวิทยา</PortalText></dd><dt className="text-[#7a8ba4]"><PortalText>ภาษา</PortalText></dt><dd><PortalText>ภาษาไทย</PortalText></dd><dt className="text-[#7a8ba4]"><PortalText>เขตเวลา</PortalText></dt><dd>Asia/Bangkok</dd></dl> });
    setMobileMenu(false);
  }

  function refresh() {
    setRefreshing(true);
    setUpdated(new Intl.DateTimeFormat("th-TH", { timeZone: "Asia/Bangkok", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date()) + " น.");
    window.setTimeout(() => setRefreshing(false), 600);
  }

  const nav = [
    { label: "จัดการผู้ใช้", icon: "users" as const, action: showUsers },
    { label: "จัดการคำร้อง", icon: "file" as const, action: showRequests },
    { label: "จัดการคลังข้อมูล", icon: "database" as const, action: showInventory },
    { label: "ตรวจสอบล็อกและเซอร์วิส", icon: "chart" as const, action: showLogs },
  ];

  return <div className="portal-shell min-h-svh bg-[#edf3f9] text-[#29436b]">
    <header className="portal-topbar relative z-30 flex h-[76px] items-center justify-between gap-4 bg-white/95 px-5 shadow-[0_3px_20px_rgba(32,60,95,0.04)] lg:px-9">
      <div className="flex items-center gap-3"><button onClick={() => setMobileMenu(!mobileMenu)} aria-expanded={mobileMenu} aria-controls="portal-navigation" aria-label={t("เปิดเมนู")} className="portal-icon-button lg:hidden"><PortalIcon name={mobileMenu ? "close" : "menu"} /></button></div>
      <div className="flex h-full items-center gap-4 sm:gap-5">
        <div className="relative"><button aria-label={t("การแจ้งเตือน")} aria-expanded={notifications} onClick={() => { setNotifications(!notifications); setAccountMenu(false); }} className="portal-icon-button relative text-[#173563]"><PortalIcon name="bell" className="size-6" /><span className="absolute right-1 top-0.5 size-2.5 rounded-full border-2 border-white bg-[#f15461]" /></button>
          {notifications && <div className="portal-dropdown right-0 w-72"><p className="border-b border-[#edf1f7] px-4 py-3 font-semibold"><PortalText>การแจ้งเตือน</PortalText></p><button onClick={() => { setNotifications(false); showRequests(); }} className="w-full px-4 py-3 text-left text-sm hover:bg-blue-50"><PortalText>มีคำร้องรอดำเนินการ 18 รายการ</PortalText><span className="mt-1 block text-xs text-[#8a98ad]"><PortalText>ดูคำร้องล่าสุด</PortalText></span></button><button onClick={() => { setNotifications(false); showServices(); }} className="w-full px-4 py-3 text-left text-sm hover:bg-blue-50"><PortalText>ดูสถานะเซอร์วิสทั้ง 8 บริการ</PortalText></button></div>}
        </div>
        <div className="h-9 w-px bg-[#dce4ee]" />
        <div className="relative"><button onClick={() => { setAccountMenu(!accountMenu); setNotifications(false); }} aria-expanded={accountMenu} className="flex items-center gap-3 rounded-lg py-2 text-left focus-visible:outline-2 focus-visible:outline-blue-600"><span className="flex size-10 shrink-0 items-center justify-center rounded-full border-2 border-[#e7edf5] bg-[#e2eaf4] text-xs font-bold text-[#2b507d]">AD</span><span className="hidden sm:block"><span className="block text-sm font-semibold text-[#17315a]">Admin</span><span className="mt-0.5 block text-xs text-[#7c8ba4]"><PortalText>ผู้ดูแลระบบ</PortalText></span></span><PortalIcon name="chevron" className="size-3.5 rotate-90" /></button>
          {accountMenu && <div className="portal-dropdown right-0 w-52"><p className="border-b border-[#edf1f7] px-4 py-3 text-xs text-[#7f8da3]">Admin</p><button onClick={() => { setAccountMenu(false); showSettings(); }} className="flex w-full items-center gap-2 px-4 py-3 text-sm hover:bg-blue-50"><PortalIcon name="settings" className="size-4" /><PortalText>ตั้งค่าระบบ</PortalText></button><Link href="/" className="flex items-center gap-2 px-4 py-3 text-sm hover:bg-blue-50"><PortalIcon name="logout" className="size-4" /><PortalText>ออกจากระบบ</PortalText></Link></div>}
        </div>
      </div>
    </header>

    {mobileMenu && <button aria-label={t("ปิดเมนู")} className="fixed inset-0 z-30 bg-[#173563]/25 lg:hidden" onClick={() => setMobileMenu(false)} />}
    <aside id="portal-navigation" data-open={mobileMenu} className={`portal-sidebar fixed bottom-0 left-0 top-[76px] z-40 flex w-[296px] flex-col overflow-y-auto border-r border-[#e5edf6] bg-white transition-transform lg:translate-x-0 ${mobileMenu ? "translate-x-0" : "-translate-x-full"}`}>
      <nav aria-label={t("เมนูหลัก")} className="relative z-10 px-4 pt-7">
        <button aria-current="page" onClick={() => { setMobileMenu(false); setDetail(null); }} className="flex min-h-[52px] w-full items-center gap-4 rounded-xl bg-gradient-to-r from-[#084b9c] to-[#0d2d66] px-4 text-sm font-semibold text-white shadow-[0_3px_8px_rgba(21,72,137,0.12)]"><PortalIcon name="home" className="size-[22px]" /><PortalText>แผงควบคุม</PortalText><PortalIcon name="chevron" className="ml-auto size-3.5" /></button>
        <p className="mb-2 mt-6 px-4 text-xs font-semibold text-[#61799b]"><PortalText>จัดการระบบ</PortalText></p>
        {nav.map(item => <button key={item.label} onClick={item.action} className="portal-nav-item"><PortalIcon name={item.icon} className="size-[21px] text-[#627da1]" /><span><PortalText>{item.label}</PortalText></span>{item.icon !== "chart" && <PortalIcon name="chevron" className="ml-auto size-3.5 text-[#8498b5]" />}</button>)}
        <div className="mx-4 my-5 h-px bg-[#dce5f1]" />
        <p className="mb-2 px-4 text-xs font-semibold text-[#61799b]"><PortalText>ตั้งค่า</PortalText></p>
        <button onClick={showSettings} className="portal-nav-item"><PortalIcon name="settings" className="size-[21px] text-[#627da1]" /><PortalText>ตั้งค่าระบบ</PortalText><PortalIcon name="chevron" className="ml-auto size-3.5 text-[#8498b5]" /></button>
      </nav>
      <div className="portal-sidebar-campus relative mt-auto min-h-64 flex-1"><div className="absolute bottom-7 left-8 text-xs font-medium leading-5 tracking-wider text-[#5d789e]"><PortalText>เชื่อมโยงข้อมูล</PortalText><br /><PortalText>เพื่อการทำงาน</PortalText><br /><PortalText>ที่มีประสิทธิภาพ</PortalText><span className="mt-3 block h-px w-6 bg-[#7990b2]" /></div></div>
    </aside>

    <main className="portal-main mx-auto px-4 py-6 sm:px-6 lg:ml-[296px] lg:px-8 lg:py-7 xl:px-9">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div><h1 className="text-[1.5625rem] font-bold tracking-tight text-[#0c265e] xl:text-[1.75rem]"><PortalText>แผงควบคุมผู้ดูแลระบบ</PortalText></h1><p className="mt-1 text-[0.8125rem] text-[#8191ab]"><PortalText>ภาพรวมการใช้งานระบบ และสถานะบริการต่าง ๆ</PortalText></p></div>
        <div className="flex flex-wrap items-center gap-5 text-xs text-[#7388a7]"><span className="flex items-center gap-2"><PortalIcon name="calendar" className="size-4 text-[#1454a6]" /><span aria-live="polite"><PortalText>วันนี้&nbsp; </PortalText><PortalText>{updated}</PortalText></span></span><button onClick={refresh} disabled={refreshing} className="portal-refresh"><PortalIcon name="refresh" className={`size-4 ${refreshing ? "animate-spin" : ""}`} /><PortalText>{refreshing ? "กำลังรีเฟรช..." : "รีเฟรชข้อมูล"}</PortalText></button></div>
      </div>

      <section aria-label={t("สรุปภาพรวม")} className="mb-4 grid grid-cols-1 gap-4 min-[500px]:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "ผู้ใช้ทั้งหมด", value: "1,482", icon: "users" as const, tone: "blue", action: showUsers, sub: <><PortalIcon name="up" className="size-3.5" /><span>+12 <span className="text-[#7d8eaa]"><PortalText>จากสัปดาห์ที่แล้ว</PortalText></span></span></> },
          { label: "คำร้องทั้งหมด", value: "87", icon: "file" as const, tone: "amber", action: showRequests, sub: <><span className="size-2.5 rounded-full bg-[#f39b0d]" /><PortalText>รอดำเนินการ 18 รายการ</PortalText></> },
          { label: "คลังข้อมูล", value: "24", icon: "database" as const, tone: "navy", action: showInventory, sub: <span className="text-[#8190aa]"><PortalText>แหล่งข้อมูลที่ใช้งานอยู่</PortalText></span> },
          { label: "สถานะเซอร์วิส", value: "8 / 8", icon: "heart" as const, tone: "green", action: showServices, sub: <><span className="size-2.5 rounded-full bg-[#0cba50]" /><PortalText>ทุกระบบใช้งานได้</PortalText></> },
        ].map(stat => <button key={stat.label} onClick={stat.action} className="portal-stat group flex min-h-[118px] items-start gap-4 rounded-xl bg-white p-[18px] text-left shadow-[0_3px_18px_rgba(42,77,115,0.025)] transition hover:-translate-y-0.5 hover:shadow-md"><span className={`portal-stat-icon tone-${stat.tone}`}><PortalIcon name={stat.icon} className="size-7" /></span><span className="min-w-0 flex-1"><span className="flex items-center justify-between gap-2 text-sm font-semibold text-[#284373]"><PortalText>{stat.label}</PortalText><PortalIcon name="chevron" className="size-3" /></span><span className="mt-1.5 block text-[1.6875rem] font-bold leading-8 tracking-wide text-[#0c255e]"><PortalText>{stat.value}</PortalText></span><span className={`mt-1.5 flex items-center gap-1.5 whitespace-nowrap text-[0.75rem] ${stat.tone === "amber" ? "text-[#dd8500]" : "text-[#0bad4b]"}`}><PortalText>{stat.sub}</PortalText></span></span></button>)}
      </section>

      <div className="mb-4 grid items-stretch gap-4 min-[1350px]:grid-cols-[1.2fr_1fr]">
        <section className="portal-panel min-w-0" aria-labelledby="requests-heading">
          <div className="portal-panel-heading"><h2 id="requests-heading"><PortalIcon name="file" className="portal-heading-icon" /><PortalText>คำร้องล่าสุด</PortalText></h2><button onClick={showRequests} className="portal-text-link"><PortalText>ดูทั้งหมด</PortalText><PortalIcon name="arrow" className="size-3.5" /></button></div>
          <div className="overflow-x-auto pb-2"><table className="portal-table request-table"><thead><tr><th>#</th><th><PortalText>หัวข้อคำร้อง</PortalText></th><th><PortalText>ประเภท</PortalText></th><th><PortalText>สถานะ</PortalText></th><th><PortalText>วันที่</PortalText></th></tr></thead><tbody>{requests.map(request => <tr key={request.id}><td className="whitespace-nowrap"><PortalText>{request.id}</PortalText></td><td><button onClick={() => setDetail({ title: request.id, content: <dl className="space-y-4 text-sm"><div><dt className="text-xs text-[#8091a9]"><PortalText>หัวข้อคำร้อง</PortalText></dt><dd className="mt-1 font-medium"><PortalText>{request.title}</PortalText></dd></div><div><dt className="mb-2 text-xs text-[#8091a9]"><PortalText>สถานะ</PortalText></dt><dd><StatusBadge status={request.status} /></dd></div><div><dt className="text-xs text-[#8091a9]"><PortalText>วันที่</PortalText></dt><dd className="mt-1"><PortalText>{request.date}</PortalText></dd></div></dl> })} className="block max-w-44 truncate text-left hover:text-[#0878ff] hover:underline" title={request.title}><PortalText>{request.title}</PortalText></button></td><td><span className="rounded-md bg-[#e9eef5] px-2 py-0.5 text-[0.6875rem] font-medium text-[#536b8d] whitespace-nowrap"><PortalText>{request.type}</PortalText></span></td><td><StatusBadge status={request.status} /></td><td className="whitespace-nowrap text-[#788da9]"><PortalText>{request.date}</PortalText></td></tr>)}</tbody></table></div>
        </section>

        <section className="portal-panel min-w-0" aria-labelledby="services-heading"><div className="portal-panel-heading"><h2 id="services-heading"><PortalIcon name="heart" className="portal-heading-icon" /><PortalText>สถานะเซอร์วิส</PortalText></h2><button onClick={showServices} className="portal-text-link"><PortalText>ดูรายละเอียด</PortalText><PortalIcon name="arrow" className="size-3.5" /></button></div><ul className="pb-1">{services.map(service => <li key={service.name} className="portal-service-row"><PortalIcon name={service.icon} className="size-[17px] text-[#617a9e]" /><span className="truncate text-[0.75rem] text-[#334e77]"><PortalText>{service.name}</PortalText></span><span className="flex items-center gap-1.5 whitespace-nowrap text-[0.6875rem] text-[#10af49]"><span className="size-2 rounded-full bg-[#12bb4f]" /><PortalText>ใช้งานได้</PortalText></span><span className="text-right text-[0.6875rem] tabular-nums text-[#7a8daa]"><PortalText>{service.uptime}</PortalText>%</span><span role="meter" aria-label={`${service.name} uptime`} aria-valuenow={service.uptime} aria-valuemin={0} aria-valuemax={100} className="h-[7px] overflow-hidden rounded-full bg-[#e3eaf1]"><span className="block h-full rounded-full bg-gradient-to-r from-[#31b86a] to-[#49bd78]" style={{ width: `${service.uptime}%` }} /></span></li>)}</ul></section>
      </div>

      <section className="portal-panel" aria-labelledby="logs-heading">
        <div className="portal-panel-heading flex-wrap gap-y-3"><h2 id="logs-heading"><PortalIcon name="file" className="portal-heading-icon" /><PortalText>ล็อกล่าสุด</PortalText></h2><div className="flex flex-wrap items-center gap-2"><label className="sr-only" htmlFor="log-severity"><PortalText>ระดับล็อก</PortalText></label><select id="log-severity" value={severity} onChange={e => setSeverity(e.target.value)} className="portal-filter w-36"><option value="ALL"><PortalText>ทั้งหมด</PortalText></option><option value="INFO">INFO</option><option value="WARN">WARN</option><option value="ERROR">ERROR</option></select><label className="sr-only" htmlFor="log-period"><PortalText>ช่วงเวลา</PortalText></label><select id="log-period" value={period} onChange={e => setPeriod(e.target.value)} className="portal-filter w-36"><option value="7"><PortalText>7 วันที่ผ่านมา</PortalText></option><option value="1"><PortalText>วันนี้</PortalText></option><option value="30"><PortalText>30 วันที่ผ่านมา</PortalText></option></select><div className="flex h-8 items-center gap-2 rounded-md border border-[#dce6f2] bg-white px-2.5 text-[#7c91ad]"><PortalIcon name="search" className="size-4" /><input aria-label={t("ค้นหาในล็อก")} value={search} onChange={e => setSearch(e.target.value)} placeholder={t("ค้นหาในล็อก...")} className="w-36 min-w-0 bg-transparent text-[0.75rem] text-[#35517c] outline-none placeholder:text-[#97a5b9] xl:w-44" /></div><button onClick={showLogs} className="portal-text-link ml-2"><PortalText>ดูทั้งหมด</PortalText><PortalIcon name="arrow" className="size-3.5" /></button></div></div>
        <div className="overflow-x-auto"><table className="portal-table log-table"><thead><tr><th><PortalText>เวลา</PortalText></th><th><PortalText>ระดับ</PortalText></th><th><PortalText>บริการ</PortalText></th><th><PortalText>ข้อความ</PortalText></th><th><span className="sr-only"><PortalText>รายละเอียด</PortalText></span></th></tr></thead><tbody>{filteredLogs.map(log => <tr key={log.id}><td className="whitespace-nowrap tabular-nums text-[#6b82a3]"><PortalText>{log.time}</PortalText></td><td><span className={`portal-level level-${log.level.toLowerCase()}`}><PortalText>{log.level}</PortalText></span></td><td className="whitespace-nowrap"><PortalText>{log.service}</PortalText></td><td className="min-w-64"><PortalText>{log.message}</PortalText></td><td><button onClick={() => setDetail({ title: `รายละเอียดล็อก #${log.id}`, content: <div className="space-y-4 text-sm"><div className="flex items-center gap-3"><span className={`portal-level level-${log.level.toLowerCase()}`}><PortalText>{log.level}</PortalText></span><span><PortalText>{log.service}</PortalText></span><span className="ml-auto text-xs text-[#8a99ad]"><PortalText>{log.time}</PortalText></span></div><p className="rounded-lg bg-[#f2f6fb] p-4 font-mono text-xs leading-6 break-words"><PortalText>{log.message}</PortalText></p><p className="leading-7"><PortalText>{log.detail}</PortalText></p></div> })} className="whitespace-nowrap text-[0.75rem] text-[#0878ff] hover:underline"><PortalText>ดูรายละเอียด</PortalText></button></td></tr>)}{filteredLogs.length === 0 && <tr><td colSpan={5} className="py-8! text-center text-[#8493aa]"><PortalText>ไม่พบล็อกที่ตรงกับเงื่อนไขการค้นหา</PortalText></td></tr>}</tbody></table></div>
      </section>
    </main>
    {detail && <Modal title={detail.title} onClose={() => setDetail(null)}><PortalText>{detail.content}</PortalText></Modal>}
  </div>;
}



