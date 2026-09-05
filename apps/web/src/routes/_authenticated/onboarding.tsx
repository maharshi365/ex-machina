import { createFileRoute } from '@tanstack/react-router'

import { OnboardingPage } from '@/components/onboarding/onboarding-page'
import { getOnboardingData } from '@/components/onboarding/onboarding-data'

export const Route = createFileRoute('/_authenticated/onboarding')({
  loader: async () => await getOnboardingData(),
  component: OnboardingRoute,
})

function OnboardingRoute() {
  const data = Route.useLoaderData()
  return (
    <OnboardingPage organizations={data.organizations} invitations={data.invitations} user={data.user} />
  )
}
