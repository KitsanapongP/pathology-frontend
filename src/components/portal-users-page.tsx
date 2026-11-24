"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { ApiError, type PaginatedResponse } from "@/lib/api-client";
import { isDemoAuth } from "@/lib/demo-session";
import { portalApi, portalSession } from "@/lib/portal-api";
import { canPortal } from "@/lib/portal-permissions";
import type { SessionState } from "@/lib/session-manager";
import { isUserProfile, type UserProfile } from "@/lib/portal-user";
import { ApiErrorNotice } from "./api-feedback";
import PortalDate from "./portal-date";
import PortalForbidden from "./portal-forbidden";
import PortalIcon from "./portal-icon";
import { PortalText, usePortalLanguage } from "./portal-preferences";
import AdminUserDialog from "./admin-user-dialog";

const sizes = [10, 20, 50, 100];

export default function PortalUsersPage() {
  const session = useSyncExternalStore<SessionState>(portalSession.subscribe, portalSession.getSnapshot, () => "checking");
  const preview = isDemoAuth() && session !== "authenticated" && session !== "password-required";
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const q = (params.get("q") ?? "").trim();
  const rawPage = Number(params.get("page") ?? 1);
  const page = Number.isSafeInteger(rawPage) && rawPage > 0 ? rawPage : 1;
  const size = sizes.includes(Number(params.get("size"))) ? Number(params.get("size")) : 20;
  const [editor, setEditor] = useState<{ userId?: string } | null>(null);
  const [revision, setRevision] = useState(0);
  const [notice, setNotice] = useState("");
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 6000);
    return () => window.clearTimeout(timer);
  }, [notice]);
  function navigate(next: { q?: string; page?: number; size?: number }) {
    const query = new URLSearchParams({ page: String(next.page ?? page), size: String(next.size ?? size) });
    const search = next.q ?? q;
    if (search) query.set("q", search);
    router.push(`${pathname}?${query}`, { scroll: false });
  }
  if (!preview && !canPortal(session, "users.read")) return <PortalForbidden />;
  return <main className="portal-main users-main">
    <div className="users-content">
      <div className="users-title-row"><h1 className="profile-heading"><PortalText>จัดการผู้ใช้</PortalText></h1>
        {(preview || canPortal(session, "users.create")) && <button className="intake-button intake-button-primary" onClick={() => { setNotice(""); setEditor({}); }}><PortalIcon name="users" /><PortalText>สร้างผู้ใช้</PortalText></button>}
      </div>
      {notice && <p role="status" className="profile-success users-write-notice"><PortalText>{notice}</PortalText></p>}
      {preview ? <section className="profile-panel"><p role="note"><PortalText>รายการผู้ใช้ใช้ได้เมื่อเข้าสู่ระบบด้วยบัญชีจริง โหมดตัวอย่างไม่โหลดข้อมูลบัญชี</PortalText></p></section> : <>
        <UserSearch query={q} onSearch={value => navigate({ q: value, page: 1 })} />
        <UsersResult key={`${q}:${page}:${size}`} q={q} page={page} size={size} navigate={navigate} revision={revision} canEdit={canPortal(session, "users.update")} onEdit={userId => { setNotice(""); setEditor({ userId }); }} />
      </>}
      {editor && <AdminUserDialog userId={editor.userId} preview={preview} onClose={() => setEditor(null)} onSaved={creating => { setEditor(null); setRevision(value => value + 1); setNotice(creating ? "สร้างผู้ใช้สำเร็จ ผู้ใช้ต้องเปลี่ยนรหัสผ่านเมื่อเข้าสู่ระบบครั้งแรก" : "บันทึกผู้ใช้แล้ว"); }} />}
    </div>
  </main>;
}

function UserSearch({ query, onSearch }: { query: string; onSearch: (value: string) => void }) {
  const { t } = usePortalLanguage();
  const [value, setValue] = useState(query);
  const [previousQuery, setPreviousQuery] = useState(query);
  // Synchronize URL history without remounting the input and losing keyboard focus.
  if (previousQuery !== query) {
    setPreviousQuery(query);
    setValue(query);
  }
  useEffect(() => {
    if (value.trim() === query) return;
    const timer = window.setTimeout(() => onSearch(value.trim()), 350);
    return () => window.clearTimeout(timer);
  }, [value, query, onSearch]);
  return <form className="users-search" role="search" onSubmit={event => event.preventDefault()}>
    <label htmlFor="users-search"><PortalText>ค้นหาผู้ใช้</PortalText></label>
    <div className="users-search-input"><PortalIcon name="search" /><input id="users-search" type="search" autoComplete="off" value={value} onChange={event => setValue(event.target.value)} placeholder={t("ชื่อผู้ใช้ ชื่อ หรืออีเมล")} /></div>
  </form>;
}

function UsersResult({ q, page, size, navigate, revision, canEdit, onEdit }: { q: string; page: number; size: number; navigate: (next: { page?: number; size?: number }) => void; revision: number; canEdit: boolean; onEdit: (id: string) => void }) {
  const { t } = usePortalLanguage();
  const [result, setResult] = useState<PaginatedResponse<UserProfile> | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true); setError(null); setFailed(false); setResult(null);
      const query = new URLSearchParams({ page: String(page), size: String(size) });
      if (q) query.set("q", q);
      try {
        const response = await portalApi.paginated<unknown>(`${q ? "users/search" : "users"}?${query}`, { signal: controller.signal });
        if (controller.signal.aborted) return;
        if (!response.data.every(isUserProfile)) throw new Error("Invalid user list. Verify GET /v1/users and /v1/users/search response contracts.");
        setResult({ ...response, data: response.data });
      } catch (cause) {
        if (controller.signal.aborted) return;
        if (cause instanceof ApiError) setError(cause);
        else setFailed(true);
      } finally { if (!controller.signal.aborted) setLoading(false); }
    }
    void load();
    return () => controller.abort();
  }, [q, page, size, attempt, revision]);
  if (error?.httpStatus === 403) return <PortalForbidden error={error} />;
  const pagination = result?.pagination;
  return <section className="profile-panel users-panel" aria-label={t("รายการผู้ใช้")} aria-busy={loading}>
    {loading ? <p role="status" className="users-feedback"><PortalText>กำลังโหลดผู้ใช้</PortalText></p> : error || failed ? <div className="users-feedback">
      <ApiErrorNotice error={error} />{failed && <p role="alert"><PortalText>โหลดรายการผู้ใช้ไม่สำเร็จ กรุณาลองอีกครั้ง</PortalText></p>}
      <button className="intake-button" onClick={() => setAttempt(value => value + 1)}><PortalText>โหลดรายการผู้ใช้อีกครั้ง</PortalText></button>
    </div> : result && <>
      <p className="users-total" role="status"><PortalText>ผู้ใช้ทั้งหมด</PortalText>{" "}{pagination!.total_records}{" "}<PortalText>รายการ</PortalText></p>
      {result.data.length ? <div className="portal-table-scroll users-table-scroll" tabIndex={0} role="region" aria-label={t("รายการผู้ใช้")}><table className="portal-table users-table">
        <thead><tr>{["ชื่อผู้ใช้", "ชื่อ–นามสกุล", "อีเมล", "สถานะบัญชี", "วันที่สร้างบัญชี"].map(label => <th scope="col" key={label}><PortalText>{label}</PortalText></th>)}{canEdit && <th scope="col"><PortalText>การดำเนินการ</PortalText></th>}</tr></thead>
        <tbody>{result.data.map(user => <tr key={user.user_id}>
          <td>{user.username}</td><td>{user.first_name} {user.last_name}</td><td>{user.email}</td>
          <td><span className={`portal-badge ${user.status === "active" ? "badge-green" : "badge-amber"}`}>{user.status === "active" ? t("ใช้งานอยู่") : user.status === "inactive" ? t("ปิดใช้งาน") : user.status}</span></td>
          <td><PortalDate value={user.created_at * 1000} /></td>
          {canEdit && <td><button type="button" className="intake-button" aria-label={`${t("แก้ไขผู้ใช้")} ${user.username}`} onClick={() => onEdit(user.user_id)}><PortalIcon name="edit" /><PortalText>แก้ไข</PortalText></button></td>}
        </tr>)}</tbody>
      </table></div> : <p className="users-feedback"><PortalText>{q ? "ไม่พบผู้ใช้ที่ตรงกับการค้นหา" : "ไม่มีผู้ใช้ในหน้านี้"}</PortalText></p>}
    </>}
    <div className="users-pagination">
      <label className="flex items-center gap-3"><PortalText>จำนวนต่อหน้า</PortalText><select className="portal-filter" value={size} onChange={event => navigate({ size: Number(event.target.value), page: 1 })}>{sizes.map(value => <option key={value} value={value}>{value}</option>)}</select></label>
      <nav aria-label={t("แบ่งหน้าผู้ใช้")} className="flex flex-wrap items-center gap-3">
        <button className="intake-button" disabled={loading || page <= 1 || !!error || failed} onClick={() => navigate({ page: page - 1 })}><PortalText>หน้าก่อนหน้า</PortalText></button>
        <span><PortalText>หน้า</PortalText>{" "}{page}{pagination && <> / {Math.max(pagination.total_pages, 1)}</>}</span>
        <button className="intake-button" disabled={loading || !pagination || page >= pagination.total_pages || !!error || failed} onClick={() => navigate({ page: page + 1 })}><PortalText>หน้าถัดไป</PortalText></button>
      </nav>
    </div>
  </section>;
}
