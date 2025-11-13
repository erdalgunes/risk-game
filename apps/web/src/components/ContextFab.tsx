'use client';

import { Fab } from '@mui/material';
import type { GameState } from '@risk-poc/game-engine';

interface ContextFabProps {
  gameState: GameState;
  onSkip: () => void;
  onTransfer: () => void;
}

export function ContextFab({ gameState, onSkip, onTransfer }: ContextFabProps) {
  const getLabel = (): string => {
    switch (gameState.phase) {
      case 'deploy':
        return gameState.deployableTroops === 0 ? 'To Attack' : 'Deploy All';
      case 'attack':
        return 'Skip to Fortify';
      case 'fortify':
        return 'End Turn';
      case 'attack_transfer':
        return 'Confirm Transfer';
      case 'initial_placement':
        return '';
      default:
        return '';
    }
  };

  const isDisabled = (): boolean => {
    switch (gameState.phase) {
      case 'deploy':
        return false; // Can always deploy all or skip
      case 'attack':
        return false; // Can always skip
      case 'fortify':
        return false; // Can always end turn
      case 'attack_transfer':
        return !gameState.pendingTransfer; // Needs pending transfer
      case 'initial_placement':
        return true; // No FAB action during initial placement
      default:
        return true;
    }
  };

  const handleClick = () => {
    if (gameState.phase === 'attack_transfer') {
      onTransfer();
    } else {
      onSkip();
    }
  };

  const label = getLabel();
  if (!label) return null;

  return (
    <Fab
      variant="extended"
      color="primary"
      onClick={handleClick}
      disabled={isDisabled()}
      sx={{
        position: 'fixed',
        bottom: 80, // Above bottom nav
        right: 16,
        minHeight: '48px',
        minWidth: '48px',
        zIndex: 1100,
      }}
    >
      {label}
    </Fab>
  );
}
