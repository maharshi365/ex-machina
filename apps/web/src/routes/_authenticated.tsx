import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { getRequest } from '@tanstack/react-start/server';
import { auth } from '@/lib/auth/server';
import { ensureActiveOrganization } from '@/lib/auth/session';

const getSession = createServerFn({ method: 'GET' }).handler(async () => {
  const request = getRequest();
  const session = await auth.api.getSession({
    headers: request.headers,
  });
  if (!session?.user) return session;
  // Top-level check: guarantee active org for all authenticated routes.
  await ensureActiveOrganization(request.headers);
  return auth.api.getSession({ headers: request.headers });
});

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: async () => {
    const session = await getSession();
    if (!session?.user) {
      throw redirect({ to: '/login' });
    }
    return { session };
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  return <Outlet />;
}
