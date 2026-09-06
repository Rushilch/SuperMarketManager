import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DepthText } from '../components/DepthText';
import React from 'react';

describe('DepthText Component (ReactBits 3D Extrusion)', () => {
  it('renders the front text correctly', () => {
    render(<DepthText text="ProductHub" layers={6} />);
    const frontText = screen.getByTestId('depth-text-front');
    expect(frontText).toBeInTheDocument();
    expect(frontText).toHaveTextContent('ProductHub');
  });

  it('renders the exact number of extrusion layers requested', () => {
    render(<DepthText text="ProductHub" layers={8} />);
    for (let i = 1; i <= 8; i++) {
      expect(screen.getByTestId(`depth-text-layer-${i}`)).toBeInTheDocument();
    }
  });

  it('updates transform offsets upon pointer movement', () => {
    render(<DepthText text="ProductHub" layers={4} depth={5} />);
    const frontText = screen.getByTestId('depth-text-front');
    expect(frontText).toBeInTheDocument();

    // Trigger window pointermove
    fireEvent.pointerMove(window, { clientX: 200, clientY: 300 });

    const layer1 = screen.getByTestId('depth-text-layer-1');
    expect(layer1).toBeInTheDocument();
    expect(layer1.style.transform).toContain('translate3d');
  });

  it('applies custom className and colors', () => {
    render(
      <DepthText
        text="ProductHub"
        className="custom-brutalist-text"
        frontColor="#FFE600"
      />
    );
    const container = screen.getByTestId('depth-text-container');
    expect(container).toHaveClass('custom-brutalist-text');
    const front = screen.getByTestId('depth-text-front');
    expect(front.style.color).toBe('#FFE600');
  });
});