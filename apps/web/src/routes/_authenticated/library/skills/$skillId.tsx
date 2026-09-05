import { createFileRoute } from '@tanstack/react-router';

import { SkillEditPage } from '@/components/skills/skill-edit-page';
import { getActiveOrganizationServerFn } from '@/lib/organizations/server';
import { getSkillServerFn } from '@/lib/skills/server';
import { skillQueryOptions } from '@/lib/skills/queries';

export const Route = createFileRoute('/_authenticated/library/skills/$skillId')({
  loader: async ({ context, params }) => {
    const activeOrg = await getActiveOrganizationServerFn();
    if (activeOrg) {
      await context.queryClient
        .ensureQueryData(skillQueryOptions(activeOrg.id, params.skillId))
        .catch(() => {});
    }
    let serverSkill: Awaited<ReturnType<typeof getSkillServerFn>> | null = null;
    if (activeOrg) {
      try {
        serverSkill = await getSkillServerFn({ data: { id: params.skillId } });
      } catch {
        serverSkill = null;
      }
    }
    return { activeOrg, serverSkill };
  },
  component: SkillEditRoute,
});

function SkillEditRoute() {
  const { skillId } = Route.useParams();
  const { activeOrg } = Route.useLoaderData();
  return <SkillEditPage activeOrg={activeOrg} skillId={skillId} />;
}
