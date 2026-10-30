'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

type Citation = { index: number; title: string; snippet: string }
type Turn = { role: 'user' | 'assistant'; content: string; citations?: Citation[] }

export function Playground({
  workspaceSlug,
  agentId,
  greeting,
}: {
  workspaceSlug: string
  agentId: string
  greeting: string
}) {
  const [turns, setTurns] = useState<Turn[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [hydrated, setHydrated] = useState(false)
  const conversationRef = useRef<string | undefined>(undefined)

  useEffect(() => setHydrated(true), [])

  async function send() {
    const message = input.trim()
    if (!message || busy) return
    setInput('')
    setError('')
    setBusy(true)
    setTurns((current) => [...current, { role: 'user', content: message }, { role: 'assistant', content: '' }])

    try {
      const response = await fetch(`/api/v1/agents/${agentId}/playground`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          workspaceSlug,
          conversationId: conversationRef.current,
          message,
        }),
      })
      if (!response.ok || !response.body) {
        const data = (await response.json().catch(() => ({}))) as {
          error?: string
          limit?: number
        }
        setError(
          response.status === 429
            ? data.error === 'quota_exceeded'
              ? `Monthly message limit reached (${data.limit}). Upgrade to keep testing.`
              : 'Too many requests. Try again in a minute.'
            : data.error === 'human_controlled'
              ? 'A human has taken over this conversation.'
              : 'The assistant could not answer. Try again.',
        )
        setTurns((current) => current.slice(0, -1))
        return
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const events = buffer.split('\n\n')
        buffer = events.pop() ?? ''
        for (const raw of events) {
          const eventLine = raw.split('\n').find((line) => line.startsWith('event: '))
          const dataLine = raw.split('\n').find((line) => line.startsWith('data: '))
          if (!eventLine || !dataLine) continue
          const event = eventLine.slice(7)
          const data = JSON.parse(dataLine.slice(6)) as Record<string, unknown>
          if (event === 'meta') {
            conversationRef.current = String(data.conversationId)
            const citations = (data.citations as Citation[]) ?? []
            setTurns((current) =>
              current.map((turn, index) =>
                index === current.length - 1 ? { ...turn, citations } : turn,
              ),
            )
          }
          if (event === 'token') {
            const text = String(data.text ?? '')
            setTurns((current) =>
              current.map((turn, index) =>
                index === current.length - 1
                  ? { ...turn, content: turn.content + text }
                  : turn,
              ),
            )
          }
          if (event === 'done') {
            const citations = (data.citations as Citation[]) ?? []
            setTurns((current) =>
              current.map((turn, index) =>
                index === current.length - 1 ? { ...turn, citations } : turn,
              ),
            )
          }
          if (event === 'error') {
            setError(String(data.message ?? 'The assistant could not finish.'))
          }
        }
      }
    } catch {
      setError('Network error. Check the worker and try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-xl border border-neutral-200 bg-white" data-hydrated={hydrated ? 'true' : 'false'}>
      <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-3">
        <div>
          <h2 className="text-sm font-semibold text-neutral-900">Playground</h2>
          <p className="text-xs text-neutral-500">Test the real retrieval and prompt path.</p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            setTurns([])
            conversationRef.current = undefined
            setError('')
          }}
        >
          Clear conversation
        </Button>
      </div>
      <div className="max-h-[28rem] space-y-4 overflow-y-auto px-5 py-4">
        {turns.length === 0 ? (
          <p className="rounded-lg bg-neutral-50 px-4 py-3 text-sm text-neutral-600">
            {greeting || 'Ask a question to see a cited answer.'}
          </p>
        ) : null}
        {turns.map((turn, index) => (
          <div
            key={`${turn.role}-${index}`}
            className={turn.role === 'user' ? 'flex justify-end' : 'flex justify-start'}
          >
            <div
              className={
                turn.role === 'user'
                  ? 'max-w-[85%] rounded-2xl rounded-br-md bg-neutral-900 px-4 py-2.5 text-sm text-white'
                  : 'max-w-[90%] rounded-2xl rounded-bl-md border border-neutral-200 bg-white px-4 py-2.5 text-sm text-neutral-800'
              }
              dir={/[\u0600-\u06FF]/.test(turn.content) ? 'rtl' : 'ltr'}
            >
              <p className="whitespace-pre-wrap leading-6">
                {turn.content || (busy && index === turns.length - 1 ? '…' : '')}
              </p>
              {turn.citations && turn.citations.length > 0 ? (
                <ul className="mt-3 space-y-1 border-t border-neutral-100 pt-2">
                  {turn.citations.map((citation) => (
                    <li key={citation.index} className="text-[11px] text-neutral-500">
                      <span className="font-semibold text-[#FA6400]">[{citation.index}]</span>{' '}
                      {citation.title}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>
        ))}
      </div>
      {error ? <p className="px-5 pb-2 text-sm text-red-600">{error}</p> : null}
      <div className="flex items-end gap-2 border-t border-neutral-100 p-3">
        <Textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault()
              void send()
            }
          }}
          rows={2}
          maxLength={2000}
          placeholder="الشحن بياخد كام يوم؟"
          className="min-h-10 resize-none"
        />
        <Button onClick={() => void send()} disabled={busy || !input.trim()}>
          {busy ? 'Sending…' : 'Send'}
        </Button>
      </div>
    </div>
  )
}
