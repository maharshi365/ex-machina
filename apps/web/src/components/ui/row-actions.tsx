import { Link } from '@tanstack/react-router';
import type * as React from 'react';

import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils.ts';

export type RowAction = {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  variant?: 'ghost' | 'destructive';
  disabled?: boolean;
} & (
  | { onClick: () => void; to?: never; params?: never; href?: never }
  | { to: string; params?: Record<string, string>; onClick?: never; href?: never }
  | { href: string; onClick?: never; to?: never; params?: never }
);

// Simple icon button group with tooltips, used by the actions column.
// Keeps row actions consistent across agents / skills / integrations tables.
export function RowActions({ actions }: { actions: RowAction[] }) {
  return (
    <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
      {actions.map((action) => {
        const Icon = action.icon;
        const className = cn(
          action.variant === 'destructive' &&
            'text-destructive hover:bg-destructive/10 hover:text-destructive'
        );
        const button = action.to ? (
          <Button
            variant="ghost"
            size="icon-sm"
            asChild
            aria-label={action.label}
            disabled={action.disabled}
            className={className}
          >
            <Link to={action.to} params={action.params}>
              <Icon className="size-4" />
            </Link>
          </Button>
        ) : action.href ? (
          <Button
            variant="ghost"
            size="icon-sm"
            asChild
            aria-label={action.label}
            disabled={action.disabled}
            className={className}
          >
            <a href={action.href} target="_blank" rel="noreferrer">
              <Icon className="size-4" />
            </a>
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={action.onClick}
            aria-label={action.label}
            disabled={action.disabled}
            className={className}
          >
            <Icon className="size-4" />
          </Button>
        );

        return (
          <Tooltip key={action.label}>
            <TooltipTrigger asChild>{button}</TooltipTrigger>
            <TooltipContent>{action.label}</TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}
