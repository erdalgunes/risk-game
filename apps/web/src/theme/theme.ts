import { createTheme } from '@mui/material/styles';

export const playerColors = {
  red: '#ef4444',
  blue: '#3b82f6',
  green: '#22c55e',
  yellow: '#eab308',
  purple: '#a855f7',
  orange: '#f97316',
  neutral: '#9ca3af',
} as const;

export const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#3b82f6',
    },
    secondary: {
      main: '#a855f7',
    },
    error: {
      main: '#ef4444',
    },
    warning: {
      main: '#f97316',
    },
    info: {
      main: '#3b82f6',
    },
    success: {
      main: '#22c55e',
    },
  },
  typography: {
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
      '"Apple Color Emoji"',
      '"Segoe UI Emoji"',
      '"Segoe UI Symbol"',
    ].join(','),
  },
  components: {
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          minHeight: '48px',
          minWidth: '48px',
          textTransform: 'none',
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          minHeight: '48px',
          minWidth: '48px',
        },
      },
    },
    MuiBottomNavigationAction: {
      styleOverrides: {
        root: {
          minHeight: '48px',
          minWidth: '48px',
        },
      },
    },
    MuiFab: {
      styleOverrides: {
        root: {
          minHeight: '48px',
          minWidth: '48px',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundImage: 'none',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
  },
});
