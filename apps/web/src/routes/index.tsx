import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/')({ component: LandingPage })

function LandingPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6 py-16">
      <h1 className="text-4xl font-bold tracking-tight">ex-machina</h1>
      <p className="mt-3 text-muted-foreground">
        Bare bones TanStack Start + Better Auth (MongoDB + organization).
      </p>
      <div className="mt-8 flex gap-3">
        <Link
          to="/login"
          className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Go to login
        </Link>
        <a
          href="https://better-auth.com/docs/plugins/organization"
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-9 items-center rounded-md border px-4 text-sm font-medium hover:bg-accent"
        >
          Docs
        </a>
      </div>
    </main>
  )
}
