import React from 'react';
import { OrderStatus } from '../types';
import { Badge } from './ui/Badge';

export const StatusBadge: React.FC<{ status: OrderStatus }> = ({ status }) => {
  const configs: Record<
    OrderStatus,
    { label: string; variant: 'surface' | 'cyan' | 'lime' | 'pink' }
  > = {
    draft: { label: 'Draft', variant: 'surface' },
    confirmed: { label: 'Confirmed', variant: 'cyan' },
    shipped: { label: 'Shipped', variant: 'lime' },
    cancelled: { label: 'Cancelled', variant: 'pink' },
  };

  const config = configs[status] || { label: status, variant: 'surface' };

  return (
    <Badge variant={config.variant} size="md" dot>
      {config.label}
    </Badge>
  );
};