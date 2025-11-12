import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import SinglePlayerGame from './page';

// Mock the game engine
vi.mock('@risk-poc/game-engine', () => ({
  createInitialState: vi.fn(() => ({
    currentPlayer: 'red',
    players: ['red', 'blue'],
    phase: 'deploy',
    territories: {},
    winner: null,
    deployableTroops: 3,
    conqueredTerritoryThisTurn: false
  })),
  getAIMove: vi.fn(),
  applyMove: vi.fn()
}));

// Mock the components
vi.mock('@/components/GameBoard', () => ({
  GameBoard: ({ state, onTerritoryClick, selectedTerritory }: any) => (
    <div data-testid="game-board">
      Game Board - Phase: {state.phase}, Player: {state.currentPlayer}
    </div>
  )
}));

vi.mock('@/components/GameControls', () => ({
  GameControls: ({ state, selectedTerritory, onSkip, fortifyTroops, onFortifyTroopsChange }: any) => (
    <div data-testid="game-controls">
      Game Controls - Phase: {state.phase}
    </div>
  )
}));

// Mock the hook
vi.mock('@/hooks/useGameLogic', () => ({
  useGameLogic: vi.fn(() => ({
    selectedTerritory: null,
    fortifyTroops: 1,
    setFortifyTroops: vi.fn(),
    message: null,
    handleTerritoryClick: vi.fn(),
    handleSkip: vi.fn(),
    resetSelection: vi.fn()
  }))
}));

describe('SinglePlayerGame page', () => {
  it('renders the page title', () => {
    render(<SinglePlayerGame />);
    expect(screen.getByText('Risk PoC - Single Player')).toBeInTheDocument();
  });

  it('renders the back to menu link', () => {
    render(<SinglePlayerGame />);
    const backLink = screen.getByText('Back to Menu');
    expect(backLink).toBeInTheDocument();
    expect(backLink.closest('a')).toHaveAttribute('href', '/');
  });

  it('renders the game board component', () => {
    render(<SinglePlayerGame />);
    expect(screen.getByTestId('game-board')).toBeInTheDocument();
  });

  it('renders the game controls component', () => {
    render(<SinglePlayerGame />);
    expect(screen.getByTestId('game-controls')).toBeInTheDocument();
  });

  it('has responsive layout styles', () => {
    render(<SinglePlayerGame />);

    // Check that the style tag contains responsive CSS
    const styleTag = document.querySelector('style');
    expect(styleTag).toBeInTheDocument();
    expect(styleTag?.textContent).toContain('@media');
    expect(styleTag?.textContent).toContain('grid-template-columns');
  });

  it('has proper page styling', () => {
    render(<SinglePlayerGame />);

    const container = document.querySelector('div');
    expect(container).toHaveStyle({
      minHeight: '100vh',
      backgroundColor: '#0a0a0a'
    });
  });
});