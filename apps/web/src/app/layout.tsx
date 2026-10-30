import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'Felops — Arabic-first AI support',
    template: '%s · Felops',
  },
  description:
    'Arabic-first AI support agents that answer from your own knowledge, cite their sources, hand off to a human, and ask before taking action.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  )
}
