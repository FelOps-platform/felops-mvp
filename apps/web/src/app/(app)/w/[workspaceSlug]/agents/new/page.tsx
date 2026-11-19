import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { createAgentAction } from '../actions'

const steps = [
  {
    title: 'Basic information',
    description: 'Name and instructions',
  },
  {
    title: 'Assign Actions',
    description: 'Choose Workspace Actions',
  },
  {
    title: 'Configure Knowledge',
    description: 'Assign shared or private sources',
  },
  {
    title: 'Review & save',
    description: 'Confirm configuration',
  },
]

export default async function NewAgentPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspaceSlug: string }>
  searchParams: Promise<{ error?: string }>
}) {
  const { workspaceSlug } = await params
  const { error } = await searchParams

  return (
    <div className="mx-auto max-w-5xl">
      <Link
        href={`/w/${workspaceSlug}/agents`}
        className="text-xs font-medium text-white/40 transition-colors hover:text-white"
      >
        ← Agents
      </Link>

      <div className="mt-5 grid gap-8 lg:grid-cols-[220px_1fr] lg:gap-12">
        <ol className="hidden space-y-7 pt-2 lg:block" aria-label="Agent setup progress">
          {steps.map((step, index) => {
            const active = index === 0
            return (
              <li key={step.title} className="flex gap-3">
                <span
                  className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
                    active
                      ? 'bg-[#495CCA] text-white'
                      : 'border border-white/15 text-white/35'
                  }`}
                >
                  {index + 1}
                </span>
                <span>
                  <span
                    className={`block text-sm font-medium ${active ? 'text-white' : 'text-white/45'}`}
                  >
                    {step.title}
                  </span>
                  <span className="mt-0.5 block text-xs leading-5 text-white/30">
                    {step.description}
                  </span>
                </span>
              </li>
            )
          })}
        </ol>

        <div className="min-w-0">
          <div className="mb-6">
            <h1 className="text-[26px] font-semibold tracking-[-0.025em] text-white sm:text-[30px]">
              Create an agent
            </h1>
            <p className="mt-1.5 text-sm leading-6 text-white/50">
              Define this Agent&apos;s responsibilities and assign approved Workspace Actions.
            </p>
          </div>

          {error ? (
            <p className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              Check the agent details and try again.
            </p>
          ) : null}

          <form
            action={createAgentAction}
            className="space-y-6 rounded-2xl border border-neutral-200 bg-white p-6 text-neutral-900 sm:p-7"
          >
            <input type="hidden" name="workspaceSlug" value={workspaceSlug} />

            <div className="border-b border-neutral-100 pb-5">
              <h2 className="text-[17px] font-semibold tracking-[-0.01em] text-neutral-900">
                Basic information
              </h2>
              <p className="mt-1 text-[13px] leading-6 text-neutral-500">
                Give the Agent a clear name and describe how it should work.
              </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Agent name" className="sm:col-span-2">
                <Input name="name" required maxLength={80} placeholder="For example, Customer onboarding" />
              </Field>
              <Field label="Language">
                <Select name="language" defaultValue="ar+en">
                  <option value="ar+en">Arabic + English</option>
                  <option value="ar">Arabic-first</option>
                  <option value="en">English-first</option>
                  <option value="auto">Match the customer</option>
                </Select>
              </Field>
              <Field label="Response format" hint="Tone and length.">
                <Input name="responseFormat" placeholder="Short, warm, with a citation" />
              </Field>
            </div>

            <Field label="Greeting" hint="The first message a customer sees.">
              <Textarea
                name="greeting"
                rows={2}
                maxLength={500}
                placeholder="أهلاً بيك في Cairo Threads! أقدر أساعدك في إيه؟"
              />
            </Field>

            <Field
              label="Instructions"
              hint="Be specific about responsibilities, boundaries, and working preferences."
            >
              <Textarea
                name="role"
                rows={4}
                placeholder="Answer customer questions about shipping, returns, and store hours."
              />
            </Field>

            <Field label="Constraints" hint="What it must never do.">
              <Textarea
                name="constraints"
                rows={2}
                placeholder="Never invent prices, delivery dates, or refund eligibility."
              />
            </Field>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-100 pt-5">
              <Link
                href={`/w/${workspaceSlug}/agents`}
                className="text-sm font-medium text-neutral-500 hover:text-neutral-900"
              >
                Cancel
              </Link>
              <Button type="submit">Continue</Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
