import { createFileRoute, Link } from '@tanstack/react-router'
import { Building2, Users, Settings, BarChart3 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { Button } from '#/components/ui/button'
import { Badge } from '#/components/ui/badge'
import { authClient } from '#/lib/auth-client'

export const Route = createFileRoute('/_authenticated/dashboard')({
  component: DashboardPage,
})

function DashboardPage() {
  const { data: session } = authClient.useSession()
  const user = session?.user

  return (
    <div className="min-h-screen bg-muted/20">
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
          <Link to="/dashboard" className="flex items-center gap-2 font-semibold tracking-tight">
            <div className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Building2 className="size-4" />
            </div>
            ex-machina
          </Link>
          <div className="flex items-center gap-2 text-sm">
            <Badge variant="secondary">Dashboard</Badge>
            {user && <span className="hidden sm:inline text-muted-foreground">{user.email}</span>}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-sm text-muted-foreground">Authenticated area — only visible when signed in.</p>
          </div>
          <Button variant="outline" asChild>
            <Link to="/onboarding">Back to onboarding</Link>
          </Button>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="size-4 text-muted-foreground" />
                Overview
              </CardTitle>
              <CardDescription>Your workspace at a glance.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                This is a stub dashboard. Replace with real widgets, stats and recent activity.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="size-4 text-muted-foreground" />
                Members
              </CardTitle>
              <CardDescription>Manage organization members.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Invite, remove and change roles.</p>
              <Button size="sm" variant="secondary" className="mt-3" disabled>
                Coming soon
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Settings className="size-4 text-muted-foreground" />
                Settings
              </CardTitle>
              <CardDescription>Organization preferences.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Slug, name, billing and more.</p>
              <Button size="sm" variant="secondary" className="mt-3" disabled>
                Coming soon
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
