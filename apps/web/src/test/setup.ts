import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock next/navigation with next-router-mock
vi.mock('next/navigation', async () => {
  const actual = await import('next-router-mock/navigation');
  return actual;
});