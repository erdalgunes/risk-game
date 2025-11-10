import { vi } from 'vitest';
import { validateUsername } from '@/lib/validation/username';
import { createGameAction, joinGameAction, startGame } from '@/app/actions/game';

/**
 * Mock successful game creation flow
 */
export function mockSuccessfulGameCreation() {
  vi.mocked(validateUsername).mockReturnValue({ isValid: true });
  vi.mocked(createGameAction).mockResolvedValue({
    success: true,
    result: { gameId: 'game-123', playerId: 'player-123' },
  });
  vi.mocked(joinGameAction).mockResolvedValue({
    success: true,
    result: { gameId: 'game-123', playerId: 'ai-player-1' },
  });
  vi.mocked(startGame).mockResolvedValue({ success: true });
}

/**
 * Mock failed game creation
 */
export function mockFailedGameCreation(error: string) {
  vi.mocked(validateUsername).mockReturnValue({ isValid: true });
  vi.mocked(createGameAction).mockResolvedValue({
    success: false,
    error,
  });
}

/**
 * Mock failed game start
 */
export function mockFailedGameStart(error: string) {
  vi.mocked(validateUsername).mockReturnValue({ isValid: true });
  vi.mocked(createGameAction).mockResolvedValue({
    success: true,
    result: { gameId: 'game-123', playerId: 'player-123' },
  });
  vi.mocked(joinGameAction).mockResolvedValue({
    success: true,
    result: { gameId: 'game-123', playerId: 'ai-player-1' },
  });
  vi.mocked(startGame).mockResolvedValue({
    success: false,
    error,
  });
}

/**
 * Mock router with push function
 */
export async function mockRouter() {
  const mockPush = vi.fn();
  const { useRouter } = await import('next/navigation');
  vi.mocked(useRouter).mockReturnValue({ push: mockPush } as any);
  return mockPush;
}

/**
 * Mock toast with addToast function
 */
export async function mockToast() {
  const mockAddToast = vi.fn();
  const { useToast } = await import('@/lib/hooks/useToast');
  vi.mocked(useToast).mockReturnValue({
    addToast: mockAddToast,
    toasts: [],
    removeToast: vi.fn(),
    clearAll: vi.fn(),
  });
  return mockAddToast;
}
