'use client'

import { useState } from 'react'
import { slugify } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/field'

export function WorkspaceForm({ action }: { action: (formData: FormData) => void }) {
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [touched, setTouched] = useState(false)

  return (
    <form action={action} className="space-y-4">
      <div>
        <Label htmlFor="name" className="text-[12px] font-medium text-[#374151]">
          Business name
        </Label>
        <Input
          id="name"
          name="name"
          required
          value={name}
          onChange={(event) => {
            setName(event.target.value)
            if (!touched) setSlug(slugify(event.target.value))
          }}
          placeholder="Cairo Threads"
          className="h-11"
        />
      </div>
      <div>
        <Label htmlFor="slug" className="text-[12px] font-medium text-[#374151]">
          Workspace URL
        </Label>
        <div className="flex items-center gap-2">
          <span className="text-sm text-[#6B7280]">/w/</span>
          <Input
            id="slug"
            name="slug"
            required
            value={slug}
            onChange={(event) => {
              setTouched(true)
              setSlug(slugify(event.target.value))
            }}
            placeholder="cairo-threads"
            className="h-11"
          />
        </div>
      </div>
      <Button type="submit" size="lg" className="w-full">
        Create workspace
      </Button>
    </form>
  )
}
