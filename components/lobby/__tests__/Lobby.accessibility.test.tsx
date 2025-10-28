import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Lobby } from '../Lobby';
import { ToastProvider } from '@/components/Toast';
import { axe } from '@/tests/setup-accessibility';

const renderWithProviders = (component: React.ReactElement) => {
  return render(<ToastProvider>{component}</ToastProvider>);
};

describe('Lobby Accessibility', () => {
  it('should not have any automatically detectable accessibility violations', async () => {
    const { container } = renderWithProviders(<Lobby />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have proper form labels', () => {
    const { getByLabelText } = renderWithProviders(<Lobby />);

    expect(getByLabelText(/username/i)).toBeInTheDocument();
    expect(getByLabelText(/your color/i)).toBeInTheDocument();
    expect(getByLabelText(/max players/i)).toBeInTheDocument();
  });

  it('should have proper heading hierarchy', () => {
    const { container } = renderWithProviders(<Lobby />);

    const h1 = container.querySelector('h1');
    const h2s = container.querySelectorAll('h2');
    const h3 = container.querySelector('h3');

    expect(h1).toBeInTheDocument();
    expect(h2s.length).toBeGreaterThan(0);
    expect(h3).toBeInTheDocument();
  });

  it('should have accessible buttons', () => {
    const { getByRole } = renderWithProviders(<Lobby />);

    const createButton = getByRole('button', { name: /create game/i });
    const refreshButton = getByRole('button', { name: /refresh/i });

    expect(createButton).toBeInTheDocument();
    expect(refreshButton).toBeInTheDocument();
  });

  it('should have proper landmark regions', () => {
    const { container } = renderWithProviders(<Lobby />);

    const sections = container.querySelectorAll('section');
    expect(sections.length).toBeGreaterThan(0);

    // Check for aria-labelledby
    sections.forEach(section => {
      expect(section).toHaveAttribute('aria-labelledby');
    });
  });

  it('should have list semantics for instructions', () => {
    const { container } = renderWithProviders(<Lobby />);

    const list = container.querySelector('ol[role="list"]');
    expect(list).toBeInTheDocument();
  });
});
