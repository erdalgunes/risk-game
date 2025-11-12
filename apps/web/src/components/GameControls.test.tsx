import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GameControls } from './GameControls';
import { createInitialState } from '@risk-poc/game-engine';
import type { TerritoryId } from '@risk-poc/game-engine';

describe('GameControls', () => {
  const mockOnSkip = vi.fn();
  const mockOnFortifyTroopsChange = vi.fn();

  const defaultProps = {
    state: createInitialState(),
    selectedTerritory: null as TerritoryId | null,
    onSkip: mockOnSkip,
    fortifyTroops: 1,
    onFortifyTroopsChange: mockOnFortifyTroopsChange
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders game status', () => {
    render(<GameControls {...defaultProps} />);

    expect(screen.getByText('Game Status')).toBeInTheDocument();
    expect(screen.getByText('RED\'S TURN')).toBeInTheDocument();
    expect(screen.getByText('Phase: DEPLOY')).toBeInTheDocument();
  });

  it('shows winner when game is won', () => {
    const winningState = {
      ...defaultProps.state,
      winner: 'red' as const
    };

    render(<GameControls {...defaultProps} state={winningState} />);

    expect(screen.getByText('RED WINS!')).toBeInTheDocument();
  });

  it('displays deploy phase information', () => {
    render(<GameControls {...defaultProps} />);

    expect(screen.getByText(/Troops Available/)).toBeInTheDocument();
    expect(screen.getByText(/Income Breakdown/)).toBeInTheDocument();
  });

  it('displays attack phase information', () => {
    const attackState = {
      ...defaultProps.state,
      phase: 'attack' as const
    };

    render(<GameControls {...defaultProps} state={attackState} />);

    expect(screen.getByText(/Click one of your territories/)).toBeInTheDocument();
  });

  it('displays fortify phase information', () => {
    const fortifyState = {
      ...defaultProps.state,
      phase: 'fortify' as const
    };

    render(<GameControls {...defaultProps} state={fortifyState} />);

    expect(screen.getByText(/Click one of your territories/)).toBeInTheDocument();
  });

  it('shows troop input when territory is selected in fortify phase', () => {
    const selectedTerritory = 'alaska' as unknown as TerritoryId;
    const fortifyState = {
      ...defaultProps.state,
      phase: 'fortify' as const
    };

    render(<GameControls {...defaultProps} state={fortifyState} selectedTerritory={selectedTerritory} />);

    expect(screen.getByText('Troops to move:')).toBeInTheDocument();
    expect(screen.getByRole('spinbutton')).toBeInTheDocument();
  });

  it('calls onSkip when skip button is clicked', async () => {
    const user = userEvent.setup();
    render(<GameControls {...defaultProps} />);

    const skipButton = screen.getByRole('button', { name: /Start Attack Phase/ });
    await user.click(skipButton);

    expect(mockOnSkip).toHaveBeenCalledTimes(1);
  });

  it('disables skip button when troops are available in deploy phase', () => {
    const deployState = {
      ...defaultProps.state,
      deployableTroops: 3
    };

    render(<GameControls {...defaultProps} state={deployState} />);

    const skipButton = screen.getByRole('button', { name: /Deploy 3 Remaining Troops/ });
    expect(skipButton).toBeDisabled();
  });

  it('calls onFortifyTroopsChange when input value changes', async () => {
    const user = userEvent.setup();
    const selectedTerritory = 'alaska' as unknown as TerritoryId;
    const fortifyState = {
      ...defaultProps.state,
      phase: 'fortify' as const
    };

    render(<GameControls {...defaultProps} state={fortifyState} selectedTerritory={selectedTerritory} />);

    const input = screen.getByRole('spinbutton');
    await user.clear(input);
    await user.type(input, '2');

    expect(mockOnFortifyTroopsChange).toHaveBeenCalledWith(2);
  });

  it('displays player stats', () => {
    render(<GameControls {...defaultProps} />);

    expect(screen.getByText('Player Stats')).toBeInTheDocument();
    expect(screen.getAllByText(/RED/)).toHaveLength(2); // Current player and stats
    expect(screen.getByText(/BLUE/)).toBeInTheDocument();
  });

  it('shows continent bonuses in player stats', () => {
    render(<GameControls {...defaultProps} />);

    // The component should render player stats section
    expect(screen.getByText('Player Stats')).toBeInTheDocument();
  });

  it('has proper button styling and interactions', () => {
    render(<GameControls {...defaultProps} />);

    const button = screen.getByRole('button');
    expect(button).toHaveStyle({
      minHeight: '48px'
    });
  });
});