import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { createAgentAction } from '../actions'

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
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">Create an agent</h1>
      <p className="mt-1 text-sm text-neutral-600">
        Step 1 of 3. You can add knowledge and publish once the basics are saved.
      </p>
      {error ? (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          Check the agent details and try again.
        </p>
      ) : null}
      <form action={createAgentAction} className="mt-6 space-y-5 rounded-xl border border-neutral-200 bg-white p-6">
        <input type="hidden" name="workspaceSlug" value={workspaceSlug} />
        <Field label="Agent name">
          <Input name="name" required maxLength={80} placeholder="Support" />
        </Field>
        <Field label="Greeting" hint="The first message a customer sees.">
          <Textarea
            name="greeting"
            rows={2}
            maxLength={500}
            placeholder="أهلاً بيك في Cairo Threads! أقدر أساعدك في إيه؟"
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
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
        <Field label="Role" hint="What the agent is responsible for.">
          <Textarea
            name="role"
            rows={3}
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
        <Button type="submit">Create draft</Button>
      </form>
    </div>
  )
}
