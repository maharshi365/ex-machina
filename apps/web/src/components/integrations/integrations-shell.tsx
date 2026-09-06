import { Link } from '@tanstack/react-router';
import { Building2 } from 'lucide-react';

import { Page } from '@/components/layout/page';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

export function IntegrationsShell({
  children,
  noOrg = false,
}: {
  children?: React.ReactNode;
  noOrg?: boolean;
}) {
  return (
    <Page>
      <Page.Header className="static mx-0 h-16 border-0 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
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
      </Page.Header>
      <Page.Content className="gap-5">
        {noOrg ? (
          <Card className="border-dashed">
            <CardHeader className="text-center">
              <Building2 className="mx-auto size-8 text-muted-foreground" />
              <CardTitle>No active organization</CardTitle>
              <CardDescription>
                Select an organization before connecting integrations.
              </CardDescription>
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
      </Page.Content>
    </Page>
  );
}
