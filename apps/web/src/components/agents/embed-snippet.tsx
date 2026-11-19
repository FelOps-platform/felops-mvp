'use client'

import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function EmbedSnippet({ snippet }: { snippet: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <div>
      <pre className="w-full overflow-x-auto rounded-lg border border-neutral-200 bg-neutral-950 p-3 text-xs leading-5 text-neutral-100">
        <code>{snippet}</code>
      </pre>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="mt-2"
        onClick={async () => {
          await navigator.clipboard.writeText(snippet)
          setCopied(true)
          setTimeout(() => setCopied(false), 1500)
        }}
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        {copied ? 'Copied' : 'Copy snippet'}
      </Button>
    </div>
  )
}
