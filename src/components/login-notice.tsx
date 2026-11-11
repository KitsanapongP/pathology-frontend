"use client";

import { useEffect, useState } from "react";
import { clearLoginNotice, hasPasswordChangedNotice } from "@/lib/login-notice";
import { PortalText } from "./portal-preferences";

export default function LoginNotice() {
  const [changed] = useState(hasPasswordChangedNotice);
  useEffect(() => { if (changed) clearLoginNotice(); }, [changed]);
  return changed ? <p role="status" className="mb-5 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-800"><PortalText>เปลี่ยนรหัสผ่านสำเร็จ กรุณาเข้าสู่ระบบอีกครั้ง</PortalText></p> : null;
}
