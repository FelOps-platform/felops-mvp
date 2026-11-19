import { Brand } from '@/components/brand'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#08080A] text-white lg:grid lg:grid-cols-[1.05fr_1fr]">
      <aside className="auth-ambient relative hidden flex-col justify-between overflow-hidden border-r border-white/[0.07] p-10 lg:flex xl:p-14">
        <div className="relative z-10">
          <Brand />
        </div>
        <div className="relative z-10 max-w-lg pb-8">
          <h1 className="text-[40px] font-semibold leading-[1.1] tracking-[-0.035em] xl:text-[50px]">
            Move work forward,
            <br />
            with control built in.
          </h1>
          <p className="mt-6 max-w-md text-[15px] leading-7 text-white/60">
            Felops connects people, AI Agents, and enterprise systems in one governed operating
            layer.
          </p>
        </div>
        <p className="relative z-10 text-[11px] tracking-wide text-white/35">
          Configurable Agents · Policy-aware execution · Verified outcomes
        </p>
      </aside>

      <section className="flex min-h-screen items-center justify-center px-5 py-12 sm:px-8">
        <div className="w-full max-w-[452px]">
          <div className="mb-8 flex justify-center lg:hidden">
            <Brand />
          </div>
          <div className="rounded-2xl border border-white/[0.12] bg-[#0B0B0F]/90 p-7 shadow-[0_24px_80px_-20px_rgba(0,0,0,0.9)] backdrop-blur sm:p-8">
            {children}
          </div>
        </div>
      </section>
    </main>
  )
}
