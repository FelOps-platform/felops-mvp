export type ParsedDocument = {
  title: string
  text: string
  metadata: Record<string, unknown>
}

export type SourceKind = 'url' | 'pdf' | 'docx' | 'txt' | 'text' | 'html'
