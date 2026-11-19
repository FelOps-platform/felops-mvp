import { Badge } from '@/components/ui/badge'
import type { KnowledgeSource } from '@felops/db/schema'
import { FileText, Globe, RotateCw, Trash2, Type } from 'lucide-react'

const icons = {
  url: Globe,
  pdf: FileText,
  docx: FileText,
  txt: FileText,
  text: Type,
}

export function SourceList({
  sources,
  retryAction,
  deleteAction,
}: {
  sources: KnowledgeSource[]
  retryAction: (formData: FormData) => void
  deleteAction: (formData: FormData) => void
}) {
  if (sources.length === 0) {
    return (
      <p className="px-5 py-8 text-sm text-neutral-500">
        No sources yet. Add a URL, file, or text snippet to ground this agent.
      </p>
    )
  }
  return (
    <ul className="divide-y divide-neutral-100">
      {sources.map((source) => {
        const Icon = icons[source.type as keyof typeof icons] ?? Type
        const tone =
          source.status === 'ready'
            ? 'success'
            : source.status === 'failed'
              ? 'danger'
              : source.status === 'processing'
                ? 'warning'
                : 'neutral'
        return (
          <li key={source.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-100">
              <Icon className="h-4 w-4 text-neutral-600" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-neutral-900">{source.title}</p>
              <p className="truncate text-xs text-neutral-500">
                {source.url ?? source.type.toUpperCase()} · {source.chunkCount} chunks
              </p>
              {source.error ? (
                <p className="mt-1 line-clamp-2 text-xs text-red-600">{source.error}</p>
              ) : null}
            </div>
            <Badge tone={tone}>{source.status}</Badge>
            <div className="flex items-center gap-1">
              <form action={retryAction}>
                <input type="hidden" name="sourceId" value={source.id} />
                <button
                  type="submit"
                  title="Reindex source"
                  className="rounded-md p-1.5 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
                >
                  <RotateCw className="h-3.5 w-3.5" />
                </button>
              </form>
              <form action={deleteAction}>
                <input type="hidden" name="sourceId" value={source.id} />
                <button
                  type="submit"
                  title="Delete source"
                  className="rounded-md p-1.5 text-neutral-500 hover:bg-red-50 hover:text-red-700"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </form>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
