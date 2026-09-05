import * as React from 'react'

import { SidebarTrigger } from '#/components/ui/sidebar'

export function LibraryTopBar({
  breadcrumb,
  actions,
}: {
  breadcrumb: React.ReactNode
  actions?: React.ReactNode
}) {
  return (
    <div className="sticky top-0 z-10 -mx-4 flex items-center justify-between gap-2 border-b bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex min-w-0 items-center gap-2">
        <SidebarTrigger className="-ml-1" />
        {breadcrumb}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  )
}
