import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class', '[data-theme="dark"]'],
  content: ['./src/**/*.{ts,tsx}', '../../packages/ui/src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: 'hsl(var(--background) / <alpha-value>)',
        foreground: 'hsl(var(--foreground) / <alpha-value>)',
        card: {
          DEFAULT: 'hsl(var(--card) / <alpha-value>)',
          foreground: 'hsl(var(--card-foreground) / <alpha-value>)',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover) / <alpha-value>)',
          foreground: 'hsl(var(--popover-foreground) / <alpha-value>)',
        },
        primary: {
          DEFAULT: 'var(--cv-color-primary)',
          hover: 'var(--cv-color-primary-hover)',
          subtle: 'var(--cv-color-primary-subtle)',
          foreground: 'hsl(var(--primary-foreground) / <alpha-value>)',
        },
        // Brand purple — NOT body copy. For gray text use content.secondary.
        secondary: {
          DEFAULT: 'var(--cv-color-secondary)',
          subtle: 'var(--cv-color-secondary-subtle)',
          foreground: 'hsl(var(--secondary-foreground) / <alpha-value>)',
        },
        accent: {
          DEFAULT: 'var(--cv-color-accent)',
          subtle: 'var(--cv-color-accent-subtle)',
          foreground: 'hsl(var(--accent-foreground) / <alpha-value>)',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted) / <alpha-value>)',
          foreground: 'hsl(var(--muted-foreground) / <alpha-value>)',
        },
        // Semantic text (gray scale) — use text-content-* to avoid colliding with text-secondary (brand).
        content: {
          primary: 'var(--cv-text-primary)',
          secondary: 'var(--cv-text-secondary)',
          muted: 'var(--cv-text-muted)',
          disabled: 'var(--cv-text-disabled)',
          'on-primary': 'var(--cv-text-on-primary)',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive) / <alpha-value>)',
          foreground: 'hsl(var(--destructive-foreground) / <alpha-value>)',
        },
        surface: {
          app: 'var(--cv-surface-app)',
          card: 'var(--cv-surface-card)',
        },
        border: {
          DEFAULT: 'var(--cv-border-default)',
          strong: 'var(--cv-border-strong)',
        },
        input: 'hsl(var(--input) / <alpha-value>)',
        ring: 'hsl(var(--ring) / <alpha-value>)',
        success: 'var(--cv-color-success)',
        warning: 'var(--cv-color-warning)',
        error: 'var(--cv-color-error)',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-jetbrains)', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        sm: 'var(--cv-radius-sm)',
        md: 'var(--cv-radius-md)',
        lg: 'var(--cv-radius-lg)',
        xl: 'var(--cv-radius-xl)',
      },
      boxShadow: {
        1: 'var(--cv-shadow-1)',
        2: 'var(--cv-shadow-2)',
        3: 'var(--cv-shadow-3)',
        4: 'var(--cv-shadow-4)',
      },
      maxWidth: {
        content: 'var(--cv-content-max)',
      },
    },
  },
  plugins: [],
};

export default config;
