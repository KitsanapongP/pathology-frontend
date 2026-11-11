import PortalBrand from "./portal-brand";
import { PortalText } from "./portal-preferences";

export default function AuthPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return <main className="login-background flex min-h-svh items-center justify-center px-4 py-8 sm:px-6 sm:py-12">
    <section aria-labelledby="auth-heading" className="w-full max-w-[550px] rounded-2xl border border-white/80 bg-white/95 px-6 py-8 shadow-[0_20px_65px_-15px_rgba(26,49,82,0.35)] sm:px-11">
      <div className="mb-7 flex justify-center"><PortalBrand /></div>
      <h1 id="auth-heading" className="text-center text-[1.875rem] font-bold text-[#0a2e62]"><PortalText>{title}</PortalText></h1>
      {children}
    </section>
  </main>;
}
