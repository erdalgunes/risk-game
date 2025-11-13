import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import SinglePlayerGame from './page';

// Mock the game engine
vi.mock('@risk-poc/game-engine', () => ({
  createInitialState: vi.fn(() => ({
    currentPlayer: 'red',
    players: ['red', 'blue', 'neutral'],
    phase: 'initial_placement',
    initialPlacementSubPhase: 'claiming',
    territories: {},
    winner: null,
    deployableTroops: 0,
    conqueredTerritoryThisTurn: false,
    fortifiedThisTurn: false,
    unplacedTroops: { red: 40, blue: 40, neutral: 40 },
    lastAttackResult: null
  })),
  getAIMove: vi.fn(),
  applyMove: vi.fn(),
  continents: [],
  getContinentBonus: vi.fn(() => 0)
}));

// Mock the components
vi.mock('@/components/GameBoard', () => ({
  GameBoard: ({ state }: { state: { phase: string; currentPlayer: string } }) => (
    <div data-testid="game-board">
      Game Board - Phase: {state.phase}, Player: {state.currentPlayer}
    </div>
  )
}));

vi.mock('@/components/GameControls', () => ({
  GameControls: ({ state }: { state: { phase: string } }) => (
    <div data-testid="game-controls">
      Game Controls - Phase: {state.phase}
    </div>
  )
}));

vi.mock('@/components/GameStatsDrawer', () => ({
  GameStatsDrawer: () => <div data-testid="game-stats-drawer">Stats Drawer</div>
}));

vi.mock('@/components/GameActionDrawer', () => ({
  GameActionDrawer: () => <div data-testid="game-action-drawer">Action Drawer</div>
}));

vi.mock('@/components/ContextFab', () => ({
  ContextFab: () => <div data-testid="context-fab">Context FAB</div>
}));

vi.mock('@/components/BottomNav', () => ({
  BottomNav: () => <div data-testid="bottom-nav">Bottom Nav</div>
}));

vi.mock('@/components/NavigationRail', () => ({
  NavigationRail: () => <div data-testid="navigation-rail">Navigation Rail</div>
}));

// Mock the hooks
vi.mock('@/hooks/useGameLogic', () => ({
  useGameLogic: vi.fn(() => ({
    selectedTerritory: null,
    fortifyTroops: 1,
    setFortifyTroops: vi.fn(),
    transferTroops: 1,
    setTransferTroops: vi.fn(),
    message: null,
    handleTerritoryClick: vi.fn(),
    handleSkip: vi.fn(),
    handleTransfer: vi.fn(),
    resetSelection: vi.fn()
  }))
}));

vi.mock('@/hooks/useMobileDrawers', () => ({
  useMobileDrawers: vi.fn(() => ({
    activeDrawer: null,
    openDrawer: vi.fn(),
    closeDrawer: vi.fn(),
    toggleDrawer: vi.fn()
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

  it('renders the new navigation components', () => {
    render(<SinglePlayerGame />);
    expect(screen.getByTestId('navigation-rail')).toBeInTheDocument();
    expect(screen.getByTestId('bottom-nav')).toBeInTheDocument();
    expect(screen.getByTestId('context-fab')).toBeInTheDocument();
  });

  it('has responsive layout styles', () => {
    render(<SinglePlayerGame />);

    // Check that the style tag contains responsive CSS
    const styleTag = document.querySelector('style');
    expect(styleTag).toBeInTheDocument();
    expect(styleTag?.textContent).toContain('@media');
    expect(styleTag?.textContent).toContain('flex');
  });

  it('has proper page styling', () => {
    render(<SinglePlayerGame />);

    // Find the app-container div with flexbox layout
    const containers = document.querySelectorAll('div');
    const appContainer = Array.from(containers).find(div =>
      div.className === 'app-container'
    );

    expect(appContainer).toBeInTheDocument();
  });
});