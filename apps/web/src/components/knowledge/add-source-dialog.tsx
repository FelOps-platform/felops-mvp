'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

type Props = {
  workspaceSlug: string
  agentId: string
  addUrl: (formData: FormData) => void
  addText: (formData: FormData) => void
  addFile: (formData: FormData) => void
}

export function AddSourceDialog({ workspaceSlug, agentId, addUrl, addText, addFile }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submitFile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const fileInput = form.elements.namedItem('file') as HTMLInputElement
    const file = fileInput.files?.[0]
    if (!file) return
    setBusy(true)
    setError('')
    const body = new FormData()
    body.set('file', file)
    body.set('workspaceSlug', workspaceSlug)
    body.set('agentId', agentId)
    const response = await fetch('/api/uploads', { method: 'POST', body })
    setBusy(false)
    if (!response.ok) {
      setError(
        response.status === 413
          ? 'That file is larger than 10 MB.'
          : 'Could not upload the file. Check the type and size.',
      )
      return
    }
    const data = (await response.json()) as { key: string; name: string; mime: string }
    const action = new FormData()
    action.set('workspaceSlug', workspaceSlug)
    action.set('agentId', agentId)
    action.set('storageKey', data.key)
    action.set('name', data.name)
    action.set('mime', data.mime)
    addFile(action)
    setOpen(false)
    router.refresh()
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>Add source</Button>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Add a knowledge source"
        description="Crawl a page (up to 25 same-origin pages), upload a file, or paste text."
      >
        <Tabs defaultValue="url">
          <TabsList>
            <TabsTrigger value="url">URL</TabsTrigger>
            <TabsTrigger value="file">File</TabsTrigger>
            <TabsTrigger value="text">Text</TabsTrigger>
          </TabsList>

          <TabsContent value="url">
            <form
              action={addUrl}
              className="space-y-4"
              onSubmit={() => {
                setOpen(false)
                router.refresh()
              }}
            >
              <input type="hidden" name="workspaceSlug" value={workspaceSlug} />
              <input type="hidden" name="agentId" value={agentId} />
              <Field label="Page or site URL">
                <Input name="url" type="url" required placeholder="https://shop.example/help" />
              </Field>
              <Field label="Title">
                <Input name="title" required maxLength={200} placeholder="Help centre" />
              </Field>
              <p className="text-xs text-neutral-500">
                Limits: same origin, 25 pages, 10 seconds per request, 5 MB per page.
              </p>
              <Button type="submit" className="w-full">
                Start crawling
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="file">
            <form onSubmit={submitFile} className="space-y-4">
              <Field label="PDF, DOCX, or TXT" hint="Maximum 10 MB per file.">
                <Input
                  name="file"
                  type="file"
                  required
                  accept=".pdf,.docx,.txt,application/pdf,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                />
              </Field>
              {error ? <p className="text-sm text-red-600">{error}</p> : null}
              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? 'Uploading…' : 'Upload file'}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="text">
            <form
              action={addText}
              className="space-y-4"
              onSubmit={() => {
                setOpen(false)
                router.refresh()
              }}
            >
              <input type="hidden" name="workspaceSlug" value={workspaceSlug} />
              <input type="hidden" name="agentId" value={agentId} />
              <Field label="Title">
                <Input name="title" required maxLength={200} placeholder="Shipping FAQ" />
              </Field>
              <Field label="Content" hint="Paste a policy, FAQ, or internal note.">
                <Textarea name="rawText" required rows={7} minLength={20} />
              </Field>
              <Button type="submit" className="w-full">
                Add text
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </Dialog>
    </>
  )
}
