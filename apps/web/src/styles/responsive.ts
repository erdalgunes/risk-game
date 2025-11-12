/**
 * Design tokens and responsive utilities for Risk Game
 * Mobile-first responsive design system
 */

// Breakpoints (mobile-first)
export const breakpoints = {
  sm: 640,   // Small devices (large phones)
  md: 768,   // Medium devices (tablets)
  lg: 1024,  // Large devices (desktops)
  xl: 1280,  // Extra large devices
  '2xl': 1536, // 2X large devices
} as const;

// Media queries
export const media = {
  sm: `@media (min-width: ${breakpoints.sm}px)`,
  md: `@media (min-width: ${breakpoints.md}px)`,
  lg: `@media (min-width: ${breakpoints.lg}px)`,
  xl: `@media (min-width: ${breakpoints.xl}px)`,
  '2xl': `@media (min-width: ${breakpoints['2xl']}px)`,
} as const;

// Design tokens
export const tokens = {
  colors: {
    background: {
      primary: '#1a1a1a',
      secondary: '#2a2a2a',
      tertiary: '#333333',
    },
    text: {
      primary: '#ffffff',
      secondary: 'rgba(255,255,255,0.8)',
      tertiary: '#888888',
    },
    border: {
      primary: '#333333',
      secondary: '#555555',
    },
    players: {
      red: '#e74c3c',
      blue: '#3498db',
      green: '#2ecc71',
      yellow: '#f1c40f',
      purple: '#9b59b6',
      orange: '#e67e22',
    },
    feedback: {
      success: '#2ecc71',
      error: '#e74c3c',
      warning: '#f1c40f',
      info: '#3498db',
    },
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    '2xl': '48px',
  },
  radius: {
    sm: '4px',
    md: '8px',
    lg: '12px',
    xl: '16px',
  },
  typography: {
    fontSize: {
      xs: '12px',
      sm: '14px',
      base: '16px',
      lg: '18px',
      xl: '20px',
      '2xl': '24px',
      '3xl': '30px',
    },
    fontWeight: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
  },
  shadow: {
    sm: '0 1px 2px rgba(0,0,0,0.3)',
    md: '0 4px 6px rgba(0,0,0,0.4)',
    lg: '0 10px 15px rgba(0,0,0,0.5)',
  },
  transition: {
    fast: '150ms ease-in-out',
    base: '200ms ease-in-out',
    slow: '300ms ease-in-out',
  },
  touchTarget: {
    minSize: '44px', // Minimum touch target size (Apple HIG, Material Design)
  },
} as const;

// Helper function to check if device supports touch
export const isTouchDevice = () => {
  if (typeof window === 'undefined') return false;
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
};

// Responsive container styles
export const containerStyles = (maxWidth: keyof typeof breakpoints = 'xl') => ({
  width: '100%',
  maxWidth: `${breakpoints[maxWidth]}px`,
  marginLeft: 'auto',
  marginRight: 'auto',
  paddingLeft: tokens.spacing.md,
  paddingRight: tokens.spacing.md,
});

// Responsive grid helper
export const responsiveGrid = {
  mobile: {
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: tokens.spacing.md,
  },
  tablet: {
    gridTemplateColumns: '2fr 1fr',
    gap: tokens.spacing.lg,
  },
  desktop: {
    gridTemplateColumns: '3fr 1fr',
    gap: tokens.spacing.xl,
  },
} as const;
