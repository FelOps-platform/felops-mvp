export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center gap-2 text-sm font-semibold tracking-wide text-neutral-500">
          <span className="h-2 w-2 rounded-full bg-[#FA6400]" />
          FELOPS
        </div>
        {children}
      </div>
    </main>
  )
}
