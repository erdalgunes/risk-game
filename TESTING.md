# Testing Documentation

Comprehensive testing guide for the Risk game clone. This document covers our testing strategy, infrastructure, and how to run and write tests.

## 📋 Table of Contents

- [Testing Philosophy](#testing-philosophy)
- [Testing Pyramid](#testing-pyramid)
- [Quick Start](#quick-start)
- [Test Infrastructure](#test-infrastructure)
- [Running Tests](#running-tests)
- [Writing Tests](#writing-tests)
- [Test Coverage](#test-coverage)
- [CI/CD Integration](#cicd-integration)

## 🎯 Testing Philosophy

Our testing strategy prioritizes:

1. **Fast Feedback** - Unit tests run in milliseconds
2. **High Coverage** - 80%+ coverage on critical code paths
3. **Maintainability** - Tests are clear, concise, and well-documented
4. **Pragmatism** - Test what matters, mock what doesn't

## 📊 Testing Pyramid

We follow the testing pyramid approach:

```
     /\
    /E2E\    10% - Critical user flows (Playwright)
   /------\
  /Integration\ 20% - Server Actions with mocks
 /----------\
/  Unit Tests  \ 70% - Game engine, utilities, pure functions
----------------
```

### Test Distribution

- **Unit Tests (70%)**: Game engine, rules, validation, combat
- **Integration Tests (20%)**: Server Actions, API endpoints
- **E2E Tests (10%)**: Critical user flows, real-time sync

## 🚀 Quick Start

### Prerequisites

```bash
# Install dependencies
npm install

# Install Playwright browsers (for E2E tests)
npx playwright install
```

### Run All Tests

```bash
# Run all unit and integration tests
npm test

# Run with UI (interactive mode)
npm run test:ui

# Run with coverage report
npm run test:coverage

# Run E2E tests
npm run test:e2e
```

## 🛠️ Test Infrastructure

### Vitest (Unit & Integration Tests)

**Configuration**: `vitest.config.ts`

- **Test Runner**: Vitest 2.1+
- **Environment**: jsdom (browser-like)
- **Coverage**: v8 provider
- **Thresholds**: 80% lines, 80% functions, 75% branches

### Playwright (E2E Tests)

**Configuration**: `playwright.config.ts`

- **Browsers**: Chromium, Firefox, WebKit
- **Base URL**: http://localhost:3000
- **Dev Server**: Auto-starts on `npm run dev`
- **Artifacts**: Screenshots/videos on failure

### Test Setup

**Global Setup**: `vitest.setup.ts`

- Imports jest-dom matchers (`toBeInTheDocument`, etc.)
- Mocks Next.js router (`useRouter`, `usePathname`)
- Sets test environment variables
- Cleanup after each test

## 📝 Running Tests

### Unit Tests

```bash
# Run all unit tests
npm test

# Run specific file
npm test lib/game-engine/__tests__/combat.test.ts

# Run in watch mode
npm test -- --watch

# Run with coverage
npm run test:coverage
```

### Integration Tests

```bash
# Run Server Action tests
npm test app/actions

# Run specific action test
npm test app/actions/__tests__/startGame.test.ts
```

### E2E Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run in UI mode (interactive)
npm run test:e2e:ui

# Run in debug mode
npm run test:e2e:debug

# Run specific browser
npx playwright test --project=chromium
```

### Coverage Reports

```bash
# Generate coverage report
npm run test:coverage

# View HTML report
open coverage/index.html
```

## ✍️ Writing Tests

### Test Structure

All tests follow the Arrange-Act-Assert pattern:

```typescript
it('should do something', () => {
  // Arrange: Setup test data
  const player = createTestPlayer({ armies_available: 5 });

  // Act: Execute the code
  const result = calculateReinforcements(player, territories);

  // Assert: Verify the result
  expect(result).toBe(7);
});
```

### Test Factories

Use factories from `tests/factories/` to create test data:

```typescript
import { createTestGame } from '@/tests/factories/game';
import { createTestPlayer } from '@/tests/factories/player';
import { createTestTerritory } from '@/tests/factories/territory';

// Create a game in playing state
const game = createTestGame({
  status: 'playing',
  phase: 'attack'
});

// Create multiple players
const players = createTestPlayers('game-id', 3);

// Create distributed territories
const territories = createDistributedTerritories('game-id', players);
```

### Mocking Supabase

For Server Actions, mock the Supabase client:

```typescript
// Mock Supabase server client
const mockSupabase = {
  from: vi.fn(),
};

const mockCreateServerClient = vi.fn(() => mockSupabase);

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: mockCreateServerClient,
}));

// Import after mocks are setup
const { startGame } = await import('../game');
```

### Component Tests

Use React Testing Library for component tests:

```typescript
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

it('should render lobby', () => {
  render(<Lobby gameId="test-game" />);

  expect(screen.getByText('Waiting for players')).toBeInTheDocument();
});

it('should handle button click', async () => {
  const user = userEvent.setup();
  render(<GameControls />);

  await user.click(screen.getByRole('button', { name: /end turn/i }));

  expect(mockEndTurn).toHaveBeenCalled();
});
```

### E2E Tests

Write end-to-end tests with Playwright:

```typescript
import { test, expect } from '@playwright/test';

test('complete game flow', async ({ page }) => {
  // Navigate to home
  await page.goto('/');

  // Create game
  await page.click('text=Create Game');
  await page.fill('input[name="username"]', 'Player 1');
  await page.click('button:has-text("Create")');

  // Wait for lobby
  await expect(page.locator('text=Waiting for players')).toBeVisible();

  // Assert game code is displayed
  const gameCode = await page.textContent('[data-testid="game-code"]');
  expect(gameCode).toMatch(/^[A-Z0-9]{6}$/);
});
```

## 📈 Test Coverage

### Current Coverage

Run `npm run test:coverage` to see current coverage:

```
File               | % Stmts | % Branch | % Funcs | % Lines
-------------------|---------|----------|---------|--------
lib/game-engine/
  combat.ts        |   97.01 |    95.00 |  100.00 |   97.01
  rules.ts         |  100.00 |   100.00 |  100.00 |  100.00
  validation.ts    |   98.50 |    96.29 |  100.00 |   98.50
```

### Coverage Thresholds

Configured in `vitest.config.ts`:

- **Lines**: 80%
- **Functions**: 80%
- **Branches**: 75%
- **Statements**: 80%

Tests will fail if coverage drops below these thresholds.

### Excluded from Coverage

- Configuration files (`*.config.ts`)
- Test files (`**/__tests__/**`, `**/*.test.ts`)
- Mocks and factories (`tests/mocks/**`, `tests/factories/**`)
- Generated files (`.next/**`, `node_modules/**`)

## 🔧 Test Organization

```
risk/
├── lib/game-engine/
│   ├── __tests__/          # Unit tests for game engine
│   │   ├── combat.test.ts
│   │   ├── rules.test.ts
│   │   └── validation.test.ts
│   ├── combat.ts
│   ├── rules.ts
│   └── validation.ts
├── app/actions/
│   ├── __tests__/          # Server Action tests
│   │   ├── startGame.test.ts
│   │   ├── placeArmies.test.ts
│   │   └── endTurn.test.ts
│   └── game.ts
├── components/
│   ├── __tests__/          # Component tests (future)
│   └── ...
├── tests/
│   ├── e2e/                # E2E tests with Playwright
│   │   └── game-flow.spec.ts
│   ├── factories/          # Test data factories
│   │   ├── game.ts
│   │   ├── player.ts
│   │   └── territory.ts
│   └── mocks/              # Shared mocks
│       └── supabase.ts
├── vitest.config.ts
├── vitest.setup.ts
├── playwright.config.ts
└── TESTING.md (this file)
```

## 🧪 Test Examples

### Unit Test Example

```typescript
// lib/game-engine/__tests__/combat.test.ts
import { describe, it, expect, vi } from 'vitest';
import { resolveCombat } from '../combat';

describe('resolveCombat', () => {
  it('should resolve combat with attacker winning', () => {
    // Mock dice rolls
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.99) // Attacker: 6
      .mockReturnValueOnce(0.1);  // Defender: 1

    const result = resolveCombat(2, 1);

    expect(result.attackerLosses).toBe(0);
    expect(result.defenderLosses).toBe(1);
    expect(result.conquered).toBe(true);
  });
});
```

### Integration Test Example

```typescript
// app/actions/__tests__/placeArmies.test.ts
import { describe, it, expect, vi } from 'vitest';
import { createTestPlayer } from '@/tests/factories/player';

// Setup mocks...

describe('placeArmies', () => {
  it('should place armies successfully', async () => {
    const player = createTestPlayer({ armies_available: 5 });
    const territory = createTestTerritory({ owner_id: player.id });

    // Mock Supabase responses...

    const result = await placeArmies(gameId, playerId, territoryId, 3);

    expect(result.success).toBe(true);
  });
});
```

### E2E Test Example

```typescript
// tests/e2e/game-flow.spec.ts
import { test, expect } from '@playwright/test';

test('user can create and join game', async ({ page }) => {
  await page.goto('/');

  // Create game
  await page.click('text=Create Game');
  await page.fill('input[name="username"]', 'TestPlayer');
  await page.click('button:has-text("Create")');

  // Verify in lobby
  await expect(page.locator('text=Waiting for players')).toBeVisible();
});
```

## 🚦 CI/CD Integration

### GitHub Actions Workflows

Three workflows are configured for automated testing and deployment:

#### 1. Test Workflow (`.github/workflows/test.yml`)

Runs on push to `main`/`develop` and on pull requests:

**Jobs:**
- **test**: Unit & integration tests with coverage reporting to Codecov
- **e2e**: Playwright tests across Chromium, Firefox, WebKit
- **lint**: ESLint checks
- **build**: Application build with size reporting
- **status-check**: Aggregates all job results

**Triggers:**
```bash
git push origin main          # Runs full test suite
gh pr create                  # Runs on PR to main/develop
```

#### 2. Deploy Workflow (`.github/workflows/deploy.yml`)

Deploys to production on main branch pushes and version tags:

**Steps:**
1. Type checking
2. Full test suite (unit + E2E)
3. Deploy to Vercel (on success)
4. Create deployment summary

**Required Secrets:**
- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

#### 3. Health Check Workflow (`.github/workflows/cron-health-check.yml`)

Periodic production health monitoring:

**Schedule:** Every 6 hours
**Checks:** Application endpoint availability
**Manual trigger:** `gh workflow run cron-health-check.yml`

### Setting Up CI/CD

1. **Add Secrets** (GitHub repo → Settings → Secrets):
   ```bash
   VERCEL_TOKEN=<your-vercel-token>
   VERCEL_ORG_ID=<your-org-id>
   VERCEL_PROJECT_ID=<your-project-id>
   CODECOV_TOKEN=<your-codecov-token>  # Optional
   ```

2. **Verify Workflows**:
   ```bash
   # Check workflow status
   gh workflow list

   # View recent runs
   gh run list --workflow=test.yml

   # Watch live run
   gh run watch
   ```

3. **Branch Protection** (Recommended):
   - Require status checks to pass before merging
   - Require `All Tests Passed` check
   - Enable for `main` branch

## 🐛 Debugging Tests

### Debug in VS Code

Add to `.vscode/launch.json`:

```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Tests",
  "runtimeExecutable": "npm",
  "runtimeArgs": ["test", "--", "--run"],
  "console": "integratedTerminal"
}
```

### Debug Playwright Tests

```bash
# Open Playwright Inspector
npm run test:e2e:debug

# Run with headed browser
npx playwright test --headed

# Run specific test
npx playwright test --grep "user can create game"
```

### View Test Reports

```bash
# View Vitest UI
npm run test:ui

# View Playwright report
npx playwright show-report
```

## 📚 Best Practices

### Do's

✅ Use factories for test data
✅ Mock external dependencies (Supabase, APIs)
✅ Test edge cases and error scenarios
✅ Keep tests focused and atomic
✅ Use descriptive test names
✅ Clean up after tests (use `afterEach`)

### Don'ts

❌ Don't test implementation details
❌ Don't skip tests (fix or remove them)
❌ Don't use real database in unit tests
❌ Don't make tests dependent on each other
❌ Don't use arbitrary timeouts

## 🔍 Troubleshooting

### Tests timing out

```typescript
// Increase timeout for slow tests
it('slow operation', async () => {
  // ... test code
}, { timeout: 10000 }); // 10 seconds
```

### Mock not working

```typescript
// Ensure mocks are hoisted
vi.mock('@/lib/module', () => ({
  // Mock implementation
}));

// Import AFTER mocks
const { function } = await import('../module');
```

### Coverage not updating

```bash
# Clear Vitest cache
rm -rf node_modules/.vitest

# Re-run with coverage
npm run test:coverage
```

## 📖 Additional Resources

- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)

## 🤝 Contributing

When adding new features:

1. Write tests first (TDD approach)
2. Ensure tests pass locally
3. Maintain coverage thresholds
4. Update this documentation if needed

---

**Need Help?** Check existing tests for examples or ask the team!
