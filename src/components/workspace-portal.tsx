"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import WorkspaceHeader from "./workspace-header";
import PortalIcon, { type PortalIconName } from "./portal-icon";

const modules: { number: string; title: string; lines: string[]; icon: PortalIconName; color: string }[] = [
  { number: "01", title: "รับใบส่งตรวจ", lines: ["ค้นหาใบส่งตรวจ", "และตรวจสอบข้อมูล"], icon: "scan", color: "blue" },
  { number: "02", title: "บันทึกผลการตรวจ", lines: ["บันทึกเสียงระหว่างการตรวจ", "ด้วยระบบ Speech to Text"], icon: "microphone", color: "green" },
  { number: "03", title: "จับคู่สไลด์และคาสเซ็ต", lines: ["อ่านบาร์โค้ดและจับคู่คำร้อง", "กับข้อมูลการตรวจ"], icon: "barcode", color: "orange" },
  { number: "04", title: "คลังข้อมูล", lines: ["ค้นหาและดูข้อมูลใบคำร้อง", "และผลการตรวจ"], icon: "archive", color: "purple" },
];

export default function WorkspacePortal() {
  const router = useRouter();
  const [selected, setSelected] = useState<(typeof modules)[number] | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);

  function openModule(module: (typeof modules)[number]) {
    if (module.number === "01") {
      router.push("/portal/requests");
      return;
    }
    if (module.number === "02") {
      router.push("/portal/examinations");
      return;
    }
    if (module.number === "03") {
      router.push("/portal/matching");
      return;
    }
    if (module.number === "04") {
      router.push("/portal/storage");
      return;
    }
    setSelected(module);
    dialog.current?.showModal();
  }

  return (
    <div className="workspace-shell min-h-svh text-[#102d60]">
      <WorkspaceHeader />

      <main className="workspace-main flex min-h-[calc(100svh-84px)] items-center justify-center px-5 py-12 sm:px-8 lg:py-20">
        <div className="w-full max-w-[1104px]">
          <h1 className="sr-only">ระบบงานพยาธิวิทยา</h1>
          <section aria-label="เมนูการใช้งานระบบพยาธิวิทยา" className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:gap-7">
            {modules.map(module => <button type="button" key={module.number} onClick={() => openModule(module)} className={`workspace-module module-${module.color} group relative grid min-h-[220px] grid-cols-[128px_minmax(0,1fr)_56px] items-center gap-6 rounded-[22px] border border-white/85 bg-white/95 px-9 py-9 text-left shadow-[0_12px_32px_rgba(47,76,112,0.06)] transition duration-200 hover:-translate-y-1 hover:bg-white hover:shadow-[0_18px_40px_rgba(47,76,112,0.12)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600`}>
              <span className="workspace-module-number absolute left-7 top-6 text-lg font-semibold">{module.number}</span>
              <span className="workspace-module-icon flex size-32 items-center justify-center rounded-[21px]"><PortalIcon name={module.icon} className="size-[76px]" style={{ strokeWidth: 1.5 }} /></span>
              <span className="workspace-module-copy min-w-0"><span className="block text-[22px] font-bold leading-[1.5] tracking-tight text-[#0b285e]">{module.title}</span><span className="mt-2 block text-[17px] leading-[1.7] text-[#7186a6]">{module.lines.map(line => <span className="block" key={line}>{line}</span>)}</span></span>
              <span className="workspace-module-arrow flex size-14 items-center justify-center rounded-full transition group-hover:translate-x-1"><PortalIcon name="arrow" className="size-7" /></span>
            </button>)}
          </section>
        </div>
      </main>

      <dialog ref={dialog} aria-labelledby="workspace-module-heading" onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }} className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-2xl border border-[#dce6f3] bg-white p-0 text-[#24416b] shadow-2xl backdrop:bg-[#102b50]/35 backdrop:backdrop-blur-sm">
        <div className="flex items-center justify-between gap-4 border-b border-[#e7edf5] px-6 py-5"><h2 id="workspace-module-heading" className="text-lg font-bold text-[#0c285d]">{selected?.title}</h2><button type="button" onClick={() => dialog.current?.close()} aria-label="ปิดหน้าต่าง" className="portal-icon-button"><PortalIcon name="close" /></button></div>
        <div className="px-6 py-7"><p className="text-sm leading-7 text-[#7285a1]">โมดูลนี้อยู่ระหว่างการพัฒนา กรุณากลับมาใช้งานอีกครั้งในภายหลัง</p><button type="button" onClick={() => dialog.current?.close()} className="mt-6 rounded-lg bg-[#123e7c] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#0c2e61]">กลับไปหน้า Portal</button></div>
      </dialog>
    </div>
  );
}
