import { Link } from '@tanstack/react-router'
import { Building2 } from 'lucide-react'

import { AuthenticatedShell } from '@/components/layout/authenticated-shell'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { SidebarTrigger } from '@/components/ui/sidebar'

export function IntegrationsShell({
  children,
  noOrg = false,
}: {
  children?: React.ReactNode
  noOrg?: boolean
}) {
  return (
    <AuthenticatedShell>
      <div className="flex flex-1 flex-col gap-5 p-4 pt-0">
        <div className="sticky top-0 z-10 -mx-4 flex items-center gap-2 border-b bg-background/95 px-4 py-3 backdrop-blur">
          <SidebarTrigger className="-ml-1" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="#">Library</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>Integrations</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
        {noOrg ? (
          <Card className="border-dashed">
            <CardHeader className="text-center">
              <Building2 className="mx-auto size-8 text-muted-foreground" />
              <CardTitle>No active organization</CardTitle>
              <CardDescription>Select an organization before connecting integrations.</CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <Button asChild>
                <Link to="/onboarding">Go to onboarding</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          children
        )}
      </div>
    </AuthenticatedShell>
  )
}
