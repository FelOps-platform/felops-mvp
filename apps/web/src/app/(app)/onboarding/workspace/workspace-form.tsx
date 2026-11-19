'use client'

import { useState } from 'react'
import { slugify } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/field'

const inputClass =
  'h-11 border-white/15 bg-white/[0.03] text-white placeholder:text-white/30 focus:border-white/40 focus:ring-white/10'

export function WorkspaceForm({ action }: { action: (formData: FormData) => void }) {
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [touched, setTouched] = useState(false)

  return (
    <form action={action} className="space-y-5">
      <div>
        <Label htmlFor="name" className="text-[12px] font-medium text-white/75">
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
          className={inputClass}
        />
      </div>
      <div>
        <Label htmlFor="slug" className="text-[12px] font-medium text-white/75">
          Workspace URL
        </Label>
        <div className="flex items-center gap-2">
          <span className="text-sm text-white/40">/w/</span>
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
            className={inputClass}
          />
        </div>
      </div>
      <Button type="submit" size="lg" className="w-full">
        Create workspace
      </Button>
    </form>
  )
}
