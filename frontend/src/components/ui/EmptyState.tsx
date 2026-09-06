import React from 'react';
import { PackageOpen } from 'lucide-react';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = <PackageOpen className="h-10 w-10 text-black dark:text-white" />,
  title,
  description,
  action,
}) => {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border-3 border-dashed border-black bg-neo-surface p-12 text-center shadow-neo">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-neo-yellow border-2 border-black shadow-neo-sm mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-black uppercase tracking-wide text-neo-text">{title}</h3>
      {description && <p className="mt-1.5 text-sm text-neo-muted max-w-sm font-medium">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
};