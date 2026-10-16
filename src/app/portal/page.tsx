export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-6 py-5">
          <span aria-hidden="true" className="flex size-10 items-center justify-center rounded-xl bg-teal-700 text-lg font-semibold text-white">P</span>
          <span className="text-lg font-semibold tracking-tight">Pathology Frontend</span>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-5xl flex-1 items-center px-6 py-20">
        <section aria-labelledby="welcome-title" className="max-w-2xl">
          <p className="mb-5 text-sm font-medium uppercase tracking-[0.18em] text-teal-700">Pathology Platform</p>
          <h1 id="welcome-title" className="text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">ระบบงานพยาธิวิทยา</h1>
          <p className="mt-6 text-lg leading-8 text-slate-600">จุดเริ่มต้นของแพลตฟอร์มจัดการงานพยาธิวิทยา เพื่อเชื่อมโยงข้อมูลและการทำงานของหน่วยงาน</p>
          <div className="mt-9 inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-4 py-2 text-sm font-medium text-teal-800">
            <span aria-hidden="true" className="size-2 rounded-full bg-teal-600" />
            อยู่ระหว่างการพัฒนา
          </div>
        </section>
      </main>
      <footer className="mx-auto w-full max-w-5xl px-6 py-6 text-sm text-slate-500">Pathology Frontend</footer>
    </div>
  );
}
