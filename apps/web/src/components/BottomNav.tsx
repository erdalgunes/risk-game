'use client';

import { BottomNavigation, BottomNavigationAction, Paper } from '@mui/material';
import BarChartIcon from '@mui/icons-material/BarChart';
import TouchAppIcon from '@mui/icons-material/TouchApp';

interface BottomNavProps {
  value: 'stats' | 'action' | null;
  onChange: (value: 'stats' | 'action') => void;
}

export function BottomNav({ value, onChange }: BottomNavProps) {
  return (
    <Paper
      sx={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        display: { xs: 'block', md: 'none' }, // Only show on mobile
      }}
      elevation={8}
    >
      <BottomNavigation
        value={value}
        onChange={(_, newValue) => onChange(newValue)}
        showLabels
        sx={{
          height: '64px',
          '& .MuiBottomNavigationAction-root': {
            minHeight: '64px',
            minWidth: '80px',
          },
        }}
      >
        <BottomNavigationAction
          label="Stats"
          value="stats"
          icon={<BarChartIcon />}
        />
        <BottomNavigationAction
          label="Actions"
          value="action"
          icon={<TouchAppIcon />}
        />
      </BottomNavigation>
    </Paper>
  );
}
