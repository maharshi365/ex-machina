import { createFileRoute } from '@tanstack/react-router';

import { SkillsPage } from '@/components/skills/skills-page';
import { getActiveOrganizationServerFn } from '@/lib/organizations/server';
import { skillsQueryOptions } from '@/lib/skills/queries';

export const Route = createFileRoute('/_authenticated/library/skills/')({
  loader: async ({ context }) => {
    const activeOrg = await getActiveOrganizationServerFn();
    if (activeOrg) {
      await context.queryClient.ensureQueryData(skillsQueryOptions(activeOrg.id));
    }
    return { activeOrg };
  },
  component: SkillsRoute,
});

function SkillsRoute() {
  const { activeOrg } = Route.useLoaderData();
  return <SkillsPage activeOrg={activeOrg} />;
}
