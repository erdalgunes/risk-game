import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Home from './page';

describe('Home page', () => {
  it('renders the main title', () => {
    render(<Home />);
    expect(screen.getByText('Risk PoC')).toBeInTheDocument();
  });

  it('renders the subtitle', () => {
    render(<Home />);
    expect(screen.getByText('Simplified 6-territory Risk game')).toBeInTheDocument();
  });

  it('renders navigation links', () => {
    render(<Home />);

    const singlePlayerLink = screen.getByText('Single Player (vs AI)');
    const multiplayerSection = screen.getByText('Multiplayer');

    expect(singlePlayerLink).toBeInTheDocument();
    expect(multiplayerSection).toBeInTheDocument();
    expect(singlePlayerLink.closest('a')).toHaveAttribute('href', '/game/single');
    // Multiplayer is a section heading, not a link
    expect(screen.getByText('Create New Lobby')).toBeInTheDocument();
  });

  it('has proper styling structure', () => {
    render(<Home />);

    const container = screen.getByText('Risk PoC').closest('div');
    expect(container).toHaveStyle({
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh'
    });
  });
});