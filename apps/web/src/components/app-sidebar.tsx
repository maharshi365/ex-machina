"use client"

import * as React from "react"
import {
  Bot,
  GalleryVerticalEnd,
  LayoutDashboard,
  Sparkles,
  SquareTerminal,
} from "lucide-react"
import { Link, useRouterState } from "@tanstack/react-router"

import { NavMain } from "#/components/nav-main.tsx"
import { NavUser } from "#/components/nav-user.tsx"
import { TeamSwitcher } from "#/components/team-switcher.tsx"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "#/components/ui/sidebar.tsx"
import { authClient } from "#/lib/auth-client.ts"

const data = {
  teams: [
    {
      name: "ex-machina",
      logo: GalleryVerticalEnd,
      plan: "Workspace",
    },
  ],
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      title: "Onboarding",
      url: "/onboarding",
      icon: SquareTerminal,
    },
  ],
  library: [
    {
      title: "Agents",
      url: "/library/agents",
      icon: Bot,
    },
    {
      title: "Skills",
      url: "/library/skills",
      icon: Sparkles,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { data: session } = authClient.useSession()
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  const user = {
    name: session?.user?.name ?? "User",
    email: session?.user?.email ?? "user@example.com",
    avatar: (session?.user as { image?: string } | undefined)?.image ?? "",
  }

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={data.teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <SidebarGroup>
          <SidebarGroupLabel>Library</SidebarGroupLabel>
          <SidebarMenu>
            {data.library.map((item) => {
              const isActive = pathname === item.url
              return (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title} isActive={isActive}>
                    <Link to={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
