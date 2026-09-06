import React, { useEffect, useState, useRef } from 'react';

export interface SplitTextProps {
  text: string;
  className?: string;
  delay?: number; // Delay between characters in ms
  animationFrom?: { opacity?: number; transform?: string };
  animationTo?: { opacity?: number; transform?: string };
  easing?: string;
  threshold?: number;
  rootMargin?: string;
  textAlign?: 'left' | 'center' | 'right';
  onLetterAnimationComplete?: () => void;
}

/**
 * SplitText - ReactBits Text Animation Component
 * Splits text into individual characters and animates them with staggered reveals.
 * https://reactbits.dev/text-animations/split-text
 */
export const SplitText: React.FC<SplitTextProps> = ({
  text,
  className = '',
  delay = 50,
  animationFrom = { opacity: 0, transform: 'translate3d(0, 35px, 0)' },
  animationTo = { opacity: 1, transform: 'translate3d(0, 0, 0)' },
  easing = 'cubic-bezier(0.2, 0.65, 0.3, 0.9)',
  threshold = 0.1,
  rootMargin = '-50px',
  textAlign = 'left',
  onLetterAnimationComplete,
}) => {
  const words = text.split(' ');
  const [animatedIndices, setAnimatedIndices] = useState<Set<number>>(new Set());
  const containerRef = useRef<HTMLParagraphElement>(null);
  const totalLetters = text.replace(/\s/g, '').length;

  useEffect(() => {
    let timeoutIds: ReturnType<typeof setTimeout>[] = [];
    let isMounted = true;

    // Trigger sequential staggered animation
    let letterCounter = 0;
    words.forEach((word) => {
      for (let i = 0; i < word.length; i++) {
        const currentLetterIdx = letterCounter;
        const timer = setTimeout(() => {
          if (!isMounted) return;
          setAnimatedIndices((prev) => {
            const next = new Set(prev);
            next.add(currentLetterIdx);
            return next;
          });
          if (onLetterAnimationComplete) {
            onLetterAnimationComplete();
          }
        }, currentLetterIdx * delay);
        timeoutIds.push(timer);
        letterCounter++;
      }
    });

    return () => {
      isMounted = false;
      timeoutIds.forEach((id) => clearTimeout(id));
    };
  }, [text, delay]);

  let globalIndex = 0;

  return (
    <p
      ref={containerRef}
      className={`inline-flex flex-wrap items-baseline gap-x-3 select-none ${className}`}
      style={{ textAlign }}
      data-testid="split-text-container"
    >
      {words.map((word, wordIndex) => (
        <React.Fragment key={`word-fragment-${wordIndex}`}>
          <span
            key={`word-${wordIndex}`}
            className="inline-block whitespace-nowrap overflow-hidden py-1"
          >
            {word.split('').map((char, charIndex) => {
              const index = globalIndex++;
              const isAnimated = animatedIndices.has(index);

              return (
                <span
                  key={`char-${index}`}
                  data-testid={`split-char-${index}`}
                  className="inline-block transition-all duration-500 will-change-transform"
                  style={{
                    opacity: isAnimated ? animationTo.opacity ?? 1 : animationFrom.opacity ?? 0,
                    transform: isAnimated
                      ? animationTo.transform ?? 'translate3d(0, 0, 0)'
                      : animationFrom.transform ?? 'translate3d(0, 35px, 0)',
                    transitionTimingFunction: easing,
                  }}
                >
                  {char}
                </span>
              );
            })}
          </span>
          {wordIndex < words.length - 1 && <span className="inline-block">&nbsp;</span>}
        </React.Fragment>
      ))}
    </p>
  );
};

export default SplitText;