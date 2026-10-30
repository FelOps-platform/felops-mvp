type LogFields = {
  requestId?: string
  workspaceId?: string
  agentId?: string
  conversationId?: string
  route?: string
  status?: number
  durationMs?: number
  [key: string]: unknown
}

function write(level: 'info' | 'warn' | 'error', message: string, fields: LogFields = {}) {
  const line = JSON.stringify({
    level,
    message,
    time: new Date().toISOString(),
    ...fields,
  })
  if (level === 'error') console.error(line)
  else if (level === 'warn') console.warn(line)
  else console.info(line)
}

export const logger = {
  info: (message: string, fields?: LogFields) => write('info', message, fields),
  warn: (message: string, fields?: LogFields) => write('warn', message, fields),
  error: (message: string, fields?: LogFields) => write('error', message, fields),
}

export function newRequestId(): string {
  return crypto.randomUUID()
}
