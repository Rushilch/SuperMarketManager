import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { SplitText } from '../components/SplitText';
import React from 'react';

describe('SplitText Component (ReactBits)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders all characters of the provided string', () => {
    render(<SplitText text="ProductHub" />);
    const container = screen.getByTestId('split-text-container');
    expect(container).toBeInTheDocument();
    expect(container).toHaveTextContent('ProductHub');

    // 10 characters in 'ProductHub'
    for (let i = 0; i < 10; i++) {
      expect(screen.getByTestId(`split-char-${i}`)).toBeInTheDocument();
    }
  });

  it('applies custom className to container', () => {
    render(<SplitText text="ProductHub" className="custom-split-text" />);
    const container = screen.getByTestId('split-text-container');
    expect(container).toHaveClass('custom-split-text');
  });

  it('progresses character animation sequentially over time', () => {
    const onComplete = vi.fn();
    render(<SplitText text="ProductHub" delay={50} onLetterAnimationComplete={onComplete} />);

    // Fast-forward time to animate all characters
    act(() => {
      vi.advanceTimersByTime(600);
    });

    expect(onComplete).toHaveBeenCalled();
  });

  it('correctly segments multiple words with whitespace separation', () => {
    render(<SplitText text="Hello World" />);
    const container = screen.getByTestId('split-text-container');
    expect(container).toHaveTextContent('Hello World');
    // Total 10 non-space characters: 5 in Hello, 5 in World
    for (let i = 0; i < 10; i++) {
      expect(screen.getByTestId(`split-char-${i}`)).toBeInTheDocument();
    }
  });
});