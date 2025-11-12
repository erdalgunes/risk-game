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
    const multiplayerLink = screen.getByText('Multiplayer');

    expect(singlePlayerLink).toBeInTheDocument();
    expect(multiplayerLink).toBeInTheDocument();
    expect(singlePlayerLink.closest('a')).toHaveAttribute('href', '/game/single');
    expect(multiplayerLink.closest('a')).toHaveAttribute('href', '/game/multi');
  });

  it('has proper styling structure', () => {
    render(<Home />);

    const container = document.querySelector('div');
    expect(container).toHaveStyle({
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh'
    });
  });
});