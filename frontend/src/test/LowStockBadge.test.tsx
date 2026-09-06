import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LowStockBadge } from '../components/LowStockBadge';

describe('LowStockBadge Component', () => {
  it('returns null if physical quantity exceeds threshold', () => {
    const { container } = render(<LowStockBadge quantity={25} threshold={10} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders low stock warning when quantity is equal to threshold', () => {
    render(<LowStockBadge quantity={10} threshold={10} />);
    expect(screen.getByText('Low Stock')).toBeInTheDocument();
    expect(screen.getByText('(10/10)')).toBeInTheDocument();
  });

  it('renders critical Out of Stock badge when quantity is 0', () => {
    render(<LowStockBadge quantity={0} threshold={10} />);
    expect(screen.getByText('Out of Stock')).toBeInTheDocument();
    expect(screen.getByText('(0/10)')).toBeInTheDocument();
  });
});