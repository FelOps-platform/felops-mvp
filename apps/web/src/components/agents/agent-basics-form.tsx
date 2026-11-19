import type { AgentInstructions } from '@felops/db/schema'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Field } from '@/components/ui/field'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'

export function AgentBasicsForm({
  action,
  slug,
  agentId,
  defaults,
}: {
  action: (formData: FormData) => void
  slug: string
  agentId: string
  defaults: {
    name: string
    greeting: string
    instructions: AgentInstructions
  }
}) {
  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="workspaceSlug" value={slug} />
      <input type="hidden" name="agentId" value={agentId} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Agent name">
          <Input name="name" defaultValue={defaults.name} required maxLength={80} />
        </Field>
        <Field label="Language">
          <Select name="language" defaultValue={defaults.instructions.language}>
            <option value="ar+en">Arabic + English</option>
            <option value="ar">Arabic-first</option>
            <option value="en">English-first</option>
            <option value="auto">Match the customer</option>
          </Select>
        </Field>
      </div>
      <Field label="Greeting" hint="Shown on the hosted page and at the top of the widget.">
        <Textarea name="greeting" defaultValue={defaults.greeting} rows={2} maxLength={500} />
      </Field>
      <Field label="Role" hint="What this agent is responsible for.">
        <Textarea
          name="role"
          defaultValue={defaults.instructions.role}
          rows={3}
          placeholder="Answer customer questions about shipping, returns, and store hours."
        />
      </Field>
      <Field label="Constraints" hint="Things the agent must never do or invent.">
        <Textarea
          name="constraints"
          defaultValue={defaults.instructions.constraints}
          rows={3}
          placeholder="Never invent prices, delivery dates, or refund eligibility."
        />
      </Field>
      <Field label="Response format" hint="Tone and shape of every answer.">
        <Textarea
          name="responseFormat"
          defaultValue={defaults.instructions.responseFormat}
          rows={2}
          placeholder="Two or three short sentences, with a citation."
        />
      </Field>
      <Button type="submit">Save basics</Button>
    </form>
  )
}
