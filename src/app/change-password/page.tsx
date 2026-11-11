import type { Metadata } from "next";
import AuthPanel from "@/components/auth-panel";
import ChangePasswordForm from "@/components/change-password-form";

export const metadata: Metadata = { title: "เปลี่ยนรหัสผ่าน | Pathology" };

export default function ChangePasswordPage() {
  return <AuthPanel title="เปลี่ยนรหัสผ่านครั้งแรก"><ChangePasswordForm /></AuthPanel>;
}
