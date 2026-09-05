import * as React from 'react'

import { AppSidebar } from '#/components/app-sidebar'
import { SidebarInset, SidebarProvider } from '#/components/ui/sidebar'
import { cn } from '#/lib/utils'

export function AuthenticatedShell({
  children,
  insetClassName,
}: {
  children: React.ReactNode
  insetClassName?: string
}) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className={cn(insetClassName)}>{children}</SidebarInset>
    </SidebarProvider>
  )
}
