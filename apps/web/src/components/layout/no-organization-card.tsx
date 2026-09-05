import { Link } from '@tanstack/react-router'
import { Building2 } from 'lucide-react'

import { Button } from '#/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'

export function NoOrganizationCard({
  title = 'No active organization',
  description = 'Create or select an organization to continue.',
}: {
  title?: string
  description?: string
}) {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <Card className="border-dashed">
        <CardHeader className="text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full border bg-muted">
            <Building2 className="size-6 text-muted-foreground" />
          </div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Button asChild>
            <Link to="/onboarding">Go to onboarding</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
