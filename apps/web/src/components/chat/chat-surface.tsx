'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'

type Citation = { index: number; title: string; snippet: string }
type Turn = { role: 'user' | 'assistant'; content: string; citations?: Citation[] }

export function ChatSurface({
  apiBase = '',
  publicKey,
  agentName,
  greeting,
  language,
  accent = '#495CCA',
  rtl,
}: {
  apiBase?: string
  publicKey: string
  agentName: string
  greeting: string
  language: string
  accent?: string
  rtl: boolean
}) {
  const [turns, setTurns] = useState<Turn[]>([
    { role: 'assistant', content: greeting || 'How can we help?' },
  ])
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
    setTurns((current) => [
      ...current,
      { role: 'user', content: message },
      { role: 'assistant', content: '' },
    ])

    try {
      const response = await fetch(`${apiBase}/api/v1/chat`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-agent-key': publicKey,
        },
        body: JSON.stringify({ conversationId: conversationRef.current, message }),
      })
      if (!response.ok || !response.body) {
        const data = (await response.json().catch(() => ({}))) as {
          error?: string
          limit?: number
        }
        setError(
          response.status === 403
            ? 'This site is not allowed to use this chat.'
            : response.status === 429
              ? data.error === 'quota_exceeded'
                ? 'This assistant has reached its monthly message limit.'
                : 'Too many messages. Please try again in a minute.'
              : response.status === 409
                ? 'A member of the team has taken over this conversation.'
                : 'The assistant is unavailable right now.',
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
        }
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="flex h-full min-h-[32rem] flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white"
      data-hydrated={hydrated ? 'true' : 'false'}
    >
      <div className="flex items-center gap-3 border-b border-neutral-100 px-4 py-3">
        <span
          className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white"
          style={{ backgroundColor: accent }}
        >
          {agentName.slice(0, 1).toUpperCase()}
        </span>
        <div>
          <p className="text-sm font-semibold text-neutral-900">{agentName}</p>
          <p className="text-[11px] text-neutral-500">
            {language.includes('ar') ? 'دعم فوري بالعربي' : 'Instant support'}
          </p>
        </div>
      </div>
      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4" dir={rtl ? 'rtl' : 'ltr'}>
        {turns.map((turn, index) => (
          <div
            key={`${turn.role}-${index}`}
            className={turn.role === 'user' ? 'flex justify-end' : 'flex justify-start'}
          >
            <div
              className={
                turn.role === 'user'
                  ? 'max-w-[85%] rounded-2xl rounded-br-md px-4 py-2.5 text-sm text-white'
                  : 'max-w-[90%] rounded-2xl rounded-bl-md border border-neutral-200 bg-white px-4 py-2.5 text-sm text-neutral-800'
              }
              style={turn.role === 'user' ? { backgroundColor: accent } : undefined}
            >
              <p className="whitespace-pre-wrap leading-6">
                {turn.content || (busy && index === turns.length - 1 ? '…' : '')}
              </p>
              {turn.citations && turn.citations.length > 0 ? (
                <ul className="mt-2 space-y-1 border-t border-neutral-100 pt-2">
                  {turn.citations.map((citation) => (
                    <li key={citation.index} className="text-[11px] text-neutral-500">
                      <span className="font-semibold" style={{ color: accent }}>
                        [{citation.index}]
                      </span>{' '}
                      {citation.title}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>
        ))}
      </div>
      {error ? <p className="px-4 pb-2 text-xs text-red-600">{error}</p> : null}
      <div className="border-t border-neutral-100 p-3" dir={rtl ? 'rtl' : 'ltr'}>
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                void send()
              }
            }}
            rows={1}
            maxLength={2000}
            placeholder={rtl ? 'اكتب سؤالك…' : 'Type your question…'}
            className="min-h-10 flex-1 resize-none rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
          />
          <Button
            onClick={() => void send()}
            disabled={busy || !input.trim()}
            aria-label={rtl ? 'إرسال' : 'Send'}
          >
            {busy ? '…' : rtl ? 'إرسال' : 'Send'}
          </Button>
        </div>
        <p className="mt-2 text-center text-[10px] text-neutral-400">
          Powered by <span className="font-medium text-neutral-600">Felops</span>
        </p>
      </div>
    </div>
  )
}
