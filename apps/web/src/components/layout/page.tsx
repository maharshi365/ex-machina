import * as React from 'react';

import { SidebarTrigger } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';

function Page({ children, className }: { children: React.ReactNode; className?: string }) {
  return className ? <div className={className}>{children}</div> : <>{children}</>;
}

function PageHeader({
  children,
  actions,
  className,
}: {
  children: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        'sticky top-0 z-10 -mx-4 flex shrink-0 items-center justify-between gap-2 border-b bg-background/95 px-4 py-3 backdrop-blur supports-backdrop-filter:bg-background/60',
        className
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        <SidebarTrigger className="-ml-1" />
        {children}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </header>
  );
}

function PageContent({ className, ...props }: React.ComponentProps<'main'>) {
  return <main className={cn('flex flex-1 flex-col gap-4 p-4 pt-0', className)} {...props} />;
}

Page.Header = PageHeader;
Page.Content = PageContent;

export { Page };
