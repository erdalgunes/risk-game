'use client';

import { Box, IconButton, Tooltip } from '@mui/material';
import BarChartIcon from '@mui/icons-material/BarChart';
import TouchAppIcon from '@mui/icons-material/TouchApp';

interface NavigationRailProps {
  value: 'stats' | 'action' | null;
  onChange: (value: 'stats' | 'action') => void;
}

export function NavigationRail({ value, onChange }: NavigationRailProps) {
  return (
    <Box
      sx={{
        display: { xs: 'none', md: 'flex' }, // Only show on desktop
        flexDirection: 'column',
        width: '72px',
        height: '100vh',
        position: 'fixed',
        left: 0,
        top: 0,
        backgroundColor: 'background.paper',
        borderRight: 1,
        borderColor: 'divider',
        alignItems: 'center',
        paddingTop: '16px',
        gap: '8px',
        zIndex: 1000,
      }}
    >
      <Tooltip title="Stats" placement="right">
        <IconButton
          onClick={() => onChange('stats')}
          color={value === 'stats' ? 'primary' : 'default'}
          sx={{
            width: '56px',
            height: '56px',
            borderRadius: '16px',
            backgroundColor: value === 'stats' ? 'action.selected' : 'transparent',
            '&:hover': {
              backgroundColor: value === 'stats' ? 'action.selected' : 'action.hover',
            },
          }}
        >
          <BarChartIcon />
        </IconButton>
      </Tooltip>

      <Tooltip title="Actions" placement="right">
        <IconButton
          onClick={() => onChange('action')}
          color={value === 'action' ? 'primary' : 'default'}
          sx={{
            width: '56px',
            height: '56px',
            borderRadius: '16px',
            backgroundColor: value === 'action' ? 'action.selected' : 'transparent',
            '&:hover': {
              backgroundColor: value === 'action' ? 'action.selected' : 'action.hover',
            },
          }}
        >
          <TouchAppIcon />
        </IconButton>
      </Tooltip>
    </Box>
  );
}
