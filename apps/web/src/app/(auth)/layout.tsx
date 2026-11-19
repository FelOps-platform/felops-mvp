import { Brand } from '@/components/brand'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-white lg:grid lg:grid-cols-[1fr_1fr]">
      <aside className="auth-panel hidden flex-col justify-between border-r border-[#E5E7EB] p-10 lg:flex xl:p-14">
        <Brand />
        <div className="max-w-lg">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6B7280]">
            Felops
          </p>
          <h1 className="mt-4 text-[36px] font-semibold leading-[1.12] tracking-[-0.03em] text-[#111827] xl:text-[42px]">
            Move work forward,
            <br />
            with control built in.
          </h1>
          <p className="mt-5 max-w-md text-sm leading-6 text-[#6B7280]">
            Felops connects people, AI Agents, and enterprise systems in one governed operating
            layer.
          </p>
          <ul className="mt-8 space-y-2 border-t border-[#E5E7EB] pt-5 text-xs text-[#6B7280]">
            <li>Configurable agents</li>
            <li>Policy-aware execution</li>
            <li>Verified outcomes</li>
          </ul>
        </div>
        <p className="text-[11px] text-[#9CA3AF]">© {new Date().getFullYear()} Felops</p>
      </aside>

      <section className="flex min-h-screen items-center justify-center px-5 py-12 sm:px-8">
        <div className="w-full max-w-[420px]">
          <div className="mb-8 flex justify-center lg:hidden">
            <Brand />
          </div>
          <div className="rounded-lg border border-[#E5E7EB] bg-white p-7 sm:p-8">
            {children}
          </div>
        </div>
      </section>
    </main>
  )
}
