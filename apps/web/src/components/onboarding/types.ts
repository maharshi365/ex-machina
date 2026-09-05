export type Organization = {
  id: string;
  name: string;
  slug: string;
  createdAt: Date | string;
  logo?: string | null;
};

export type Invitation = {
  id: string;
  organizationId: string;
  organizationName?: string;
  email: string;
  role: string;
  status: string;
  expiresAt: Date | string;
  inviterId: string;
};

export type OnboardingUser = {
  id: string;
  name: string;
  email: string;
  image?: string | null;
};
