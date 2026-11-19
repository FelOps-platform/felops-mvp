import Link from 'next/link'
import { Brand } from '@/components/brand'

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white text-[#111827]">
      <header className="border-b border-[#E5E7EB]">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Brand />
          <div className="flex items-center gap-3">
            <Link
              href="/sign-in"
              className="text-sm font-medium text-[#4B5563] hover:text-[#111827]"
            >
              Sign in
            </Link>
            <Link
              href="/sign-up"
              className="inline-flex h-9 items-center justify-center rounded-md bg-[#495CCA] px-4 text-sm font-medium text-white hover:bg-[#3B4FC4]"
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-20 sm:py-28">
        <div className="max-w-3xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6B7280]">
            Arabic-first support
          </p>
          <h1 className="mt-4 text-[38px] font-semibold leading-[1.1] tracking-[-0.035em] sm:text-[52px]">
            The support agent that can act, with your approval.
          </h1>
          <p className="mt-5 max-w-2xl text-[15px] leading-7 text-[#6B7280]">
            Add your own pages, PDFs, and FAQs. Get cited answers in Arabic or English. Hand a
            conversation to a human, and keep every refund or account change behind an approval
            queue.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/sign-up"
              className="inline-flex h-10 items-center justify-center rounded-md bg-[#495CCA] px-5 text-sm font-medium text-white hover:bg-[#3B4FC4]"
            >
              Create your workspace
            </Link>
            <Link
              href="/sign-in"
              className="inline-flex h-10 items-center justify-center rounded-md border border-[#D1D5DB] bg-white px-5 text-sm font-medium text-[#374151] hover:bg-[#F9FAFB]"
            >
              Sign in
            </Link>
          </div>
        </div>

        <dl className="mt-20 grid gap-8 border-t border-[#E5E7EB] pt-8 sm:grid-cols-3">
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
              <dt className="text-sm font-semibold text-[#111827]">{title}</dt>
              <dd className="mt-2 text-sm leading-6 text-[#6B7280]">{body}</dd>
            </div>
          ))}
        </dl>
      </section>
    </main>
  )
}
