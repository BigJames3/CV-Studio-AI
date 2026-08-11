import type { Transition, Variants } from 'framer-motion';

export const durations = {
  instant: 0,
  fast: 0.12,
  base: 0.2,
  slow: 0.32,
} as const;

export const easings = {
  out: [0.2, 0.8, 0.2, 1] as const,
};

export const spring: Transition = { type: 'spring', stiffness: 400, damping: 30 };

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: durations.base } },
};

export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: durations.base, ease: easings.out },
  },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  show: { opacity: 1, scale: 1, transition: spring },
};

export const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
};

/** Respect prefers-reduced-motion — use opacity-only. */
export function motionSafe(variants: Variants): Variants {
  if (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ) {
    return {
      hidden: { opacity: 0 },
      show: { opacity: 1, transition: { duration: 0.01 } },
    };
  }
  return variants;
}
