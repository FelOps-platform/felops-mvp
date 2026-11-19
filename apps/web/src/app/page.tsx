import Link from 'next/link'
import { Brand } from '@/components/brand'

export default function HomePage() {
  return (
    <main className="auth-ambient relative flex min-h-screen flex-col justify-center overflow-hidden px-6 py-16 text-white">
      <div className="relative z-10 mx-auto w-full max-w-5xl">
        <Brand />
        <h1 className="mt-10 max-w-3xl text-[42px] font-semibold leading-[1.08] tracking-[-0.04em] sm:text-[56px]">
          The Arabic-first support agent that can act — with your approval.
        </h1>
        <p className="mt-6 max-w-2xl text-[16px] leading-8 text-white/55">
          Add your own pages, PDFs, and FAQs. Get cited answers in Arabic or English. Hand a
          conversation to a human, and keep every refund or account change behind an approval queue.
        </p>
        <div className="mt-9 flex flex-wrap items-center gap-3">
          <Link
            href="/sign-up"
            className="inline-flex h-11 items-center justify-center rounded-lg bg-[#495CCA] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#3345B0]"
          >
            Create your workspace
          </Link>
          <Link
            href="/sign-in"
            className="inline-flex h-11 items-center justify-center rounded-lg border border-white/15 bg-white/[0.04] px-5 text-sm font-semibold text-white transition-colors hover:bg-white/[0.09]"
          >
            Sign in
          </Link>
        </div>
        <dl className="mt-20 grid gap-8 border-t border-white/10 pt-8 sm:grid-cols-3">
          {[
            [
              'Arabic retrieval',
              'Alef, ya, ta marbuta, diacritics, and Arabic-Indic digits normalized for search.',
            ],
            ['Cited answers', 'Every grounded answer points at the source it came from.'],
            [
              'Approval-gated actions',
              'Refunds and account changes wait for an owner or admin.',
            ],
          ].map(([title, body]) => (
            <div key={title}>
              <dt className="text-sm font-semibold text-white">{title}</dt>
              <dd className="mt-2 text-sm leading-6 text-white/45">{body}</dd>
            </div>
          ))}
        </dl>
      </div>
    </main>
  )
}
