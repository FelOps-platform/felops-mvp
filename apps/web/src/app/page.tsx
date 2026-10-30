import Link from 'next/link'

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-6 py-16">
      <div className="flex items-center gap-2 text-sm font-medium tracking-wide text-neutral-500">
        <span className="h-2 w-2 rounded-full bg-[#FA6400]" />
        FELOPS
      </div>
      <h1 className="mt-6 max-w-3xl text-5xl font-semibold tracking-tight text-neutral-900">
        The Arabic-first support agent that can act — with your approval.
      </h1>
      <p className="mt-5 max-w-2xl text-lg leading-8 text-neutral-600">
        Add your own pages, PDFs, and FAQs. Get cited answers in Arabic or English. Hand a
        conversation to a human, and keep every refund or account change behind an approval queue.
      </p>
      <div className="mt-9 flex flex-wrap items-center gap-3">
        <Link
          href="/sign-up"
          className="rounded-lg bg-[#FA6400] px-5 py-3 text-sm font-semibold text-white hover:bg-[#E05700]"
        >
          Create your workspace
        </Link>
        <Link
          href="/sign-in"
          className="rounded-lg border border-neutral-300 bg-white px-5 py-3 text-sm font-semibold text-neutral-800 hover:bg-neutral-50"
        >
          Sign in
        </Link>
      </div>
      <dl className="mt-16 grid gap-6 border-t border-neutral-200 pt-8 sm:grid-cols-3">
        {[
          ['Arabic retrieval', 'Alef, ya, ta marbuta, diacritics, and Arabic-Indic digits normalized for search.'],
          ['Cited answers', 'Every grounded answer points at the source it came from.'],
          ['Approval-gated actions', 'Refunds and account changes wait for an owner or admin.'],
        ].map(([title, body]) => (
          <div key={title}>
            <dt className="text-sm font-semibold text-neutral-900">{title}</dt>
            <dd className="mt-2 text-sm leading-6 text-neutral-600">{body}</dd>
          </div>
        ))}
      </dl>
    </main>
  )
}
