import { LayoutDashboard } from 'lucide-react';

import { Page } from '@/components/layout/page';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { Separator } from '@/components/ui/separator';

export function DashboardPage() {
  return (
    <Page>
      <Page.Header className="static mx-0 h-16 justify-start border-0 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
        <>
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="#">ex-machina</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>Dashboard</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </>
      </Page.Header>
      <Page.Content>
        <Empty className="border bg-card">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <LayoutDashboard />
            </EmptyMedia>
            <EmptyTitle>Dashboard ready</EmptyTitle>
            <EmptyDescription>
              Your authenticated dashboard is set up with sidebar-07. Add widgets and data here.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </Page.Content>
    </Page>
  );
}
