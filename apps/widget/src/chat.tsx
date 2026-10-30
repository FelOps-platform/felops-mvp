import { useEffect, useRef, useState } from 'preact/hooks'

type Citation = { index: number; title: string; snippet: string }
type Turn = { role: 'user' | 'assistant'; content: string; citations?: Citation[] }
type Config = { name: string; greeting: string; language: string; theme: Record<string, string> }

function storageKey(agentKey: string): string {
  return `felops:${agentKey}`
}

export function Widget({ apiBase, agentKey }: { apiBase: string; agentKey: string }) {
  const [open, setOpen] = useState(false)
  const [config, setConfig] = useState<Config | null>(null)
  const [loadError, setLoadError] = useState('')
  const [turns, setTurns] = useState<Turn[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const conversationRef = useRef<string | undefined>(undefined)

  useEffect(() => {
    const stored = window.localStorage.getItem(storageKey(agentKey))
    if (stored) conversationRef.current = stored
    fetch(`${apiBase}/api/v1/widget/${agentKey}`, { credentials: 'omit' })
      .then(async (response) => {
        if (!response.ok) {
          setLoadError(
            response.status === 403
              ? 'This site is not allowed to use this chat.'
              : 'This chat is unavailable.',
          )
          return
        }
        const data = (await response.json()) as Config
        setConfig(data)
        setTurns([{ role: 'assistant', content: data.greeting || 'How can we help?' }])
      })
      .catch(() => setLoadError('Could not reach the support agent.'))
  }, [apiBase, agentKey])

  const rtl = Boolean(config?.language?.includes('ar'))

  async function send(retry = false) {
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
        headers: { 'content-type': 'application/json', 'x-agent-key': agentKey },
        body: JSON.stringify({ conversationId: conversationRef.current, message }),
      })
      if (!response.ok || !response.body) {
        if (response.status === 404 && conversationRef.current && !retry) {
          conversationRef.current = undefined
          window.localStorage.removeItem(storageKey(agentKey))
          setTurns((current) => current.slice(0, -2))
          setInput(message)
          setBusy(false)
          void send(true)
          return
        }
        const data = (await response.json().catch(() => ({}))) as { error?: string }
        setError(
          response.status === 403
            ? 'This site is not allowed to use this chat.'
            : response.status === 429
              ? data.error === 'quota_exceeded'
                ? 'This assistant has reached its monthly message limit.'
                : 'Too many messages. Try again in a minute.'
              : response.status === 409
                ? 'A team member has taken over. They will reply here.'
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
            window.localStorage.setItem(storageKey(agentKey), conversationRef.current)
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
                index === current.length - 1 ? { ...turn, content: turn.content + text } : turn,
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

  if (!open) {
    return (
      <button
        class="fw-launcher"
        aria-label={`Open chat with ${config?.name ?? 'support'}`}
        onClick={() => setOpen(true)}
      >
        <span aria-hidden>💬</span>
        {rtl ? 'كلمنا' : 'Chat with us'}
      </button>
    )
  }

  return (
    <section class={`fw-panel${rtl ? ' fw-rtl' : ''}`} role="dialog" aria-label="Support chat">
      <header class="fw-header">
        <span class="fw-avatar" aria-hidden>
          {(config?.name ?? 'S').slice(0, 1).toUpperCase()}
        </span>
        <div>
          <p class="fw-name">{config?.name ?? 'Support'}</p>
          <p class="fw-sub">{rtl ? 'دعم فوري' : 'Instant support'}</p>
        </div>
        <button class="fw-close" aria-label="Close chat" onClick={() => setOpen(false)}>
          ×
        </button>
      </header>
      <div class="fw-body" dir={rtl ? 'rtl' : 'ltr'}>
        {loadError ? <p class="fw-loading">{loadError}</p> : null}
        {!loadError && !config ? <p class="fw-loading">Loading…</p> : null}
        {turns.map((turn) => (
          <div class={`fw-row${turn.role === 'user' ? ' fw-row-user' : ''}`}>
            <div
              class={`fw-bubble ${
                turn.role === 'user' ? 'fw-bubble-user' : 'fw-bubble-assistant'
              }`}
            >
              {turn.content || (busy ? '…' : '')}
              {turn.citations && turn.citations.length > 0 ? (
                <ul class="fw-cites">
                  {turn.citations.map((citation) => (
                    <li>
                      <strong>[{citation.index}]</strong> {citation.title}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>
        ))}
      </div>
      {error ? <p class="fw-error">{error}</p> : null}
      <div class="fw-composer" dir={rtl ? 'rtl' : 'ltr'}>
        <textarea
          class="fw-input"
          value={input}
          rows={1}
          maxLength={2000}
          placeholder={rtl ? 'اكتب سؤالك…' : 'Type your question…'}
          aria-label="Message"
          onInput={(event) => setInput((event.target as HTMLTextAreaElement).value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault()
              void send()
            }
          }}
        />
        <button class="fw-send" onClick={() => void send()} disabled={busy || !input.trim()}>
          {rtl ? 'إرسال' : 'Send'}
        </button>
      </div>
      <p class="fw-foot">
        Powered by <strong>Felops</strong>
      </p>
    </section>
  )
}
