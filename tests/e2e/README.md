# E2E Testing Guide

This guide explains how to run end-to-end tests in different environments.

## Test Environments

### 1. Local Test Environment (Recommended for Development)
Tests against local Supabase instance for isolated, repeatable testing.

**Prerequisites:**
```bash
# Install Supabase CLI
brew install supabase/tap/supabase

# Start local Supabase (includes PostgreSQL, Auth, Realtime)
supabase start

# Initialize database with schema
supabase db reset
```

**Run tests:**
```bash
npm run test:e2e:local          # Run all E2E tests with local Supabase
npm run test:e2e:local:ui       # Interactive UI mode
npm run test:e2e:local:debug    # Debug mode with inspector
```

**Configuration:**
- Uses `.env.test` (http://localhost:54321)
- Separate test database (no production data pollution)
- Faster test execution (no network latency)
- Full isolation between test runs

### 2. Integration Environment
Tests against real Supabase project (development instance).

**Prerequisites:**
```bash
# Ensure .env.local has your Supabase credentials
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

**Run tests:**
```bash
npm run test:e2e         # Run against .env.local Supabase
npm run test:e2e:ui      # Interactive UI mode
npm run test:e2e:debug   # Debug mode
```

**Warning:** These tests will create real data in your Supabase project. Use a development project, not production.

### 3. Production Environment
Tests against live production deployment.

**Run tests:**
```bash
npm run test:e2e:prod    # Tests https://risk-red.vercel.app
```

**Warning:** These tests create real game data in production. Use sparingly for smoke testing only.

## Test Suites

### Current Test Coverage

1. **Game Creation & Join**
   - Multi-player game creation
   - Join via direct URL
   - Real-time player list updates

2. **Session Security**
   - HttpOnly session cookies
   - Secure flag verification (HTTPS only)
   - Session validation

3. **Game Progression**
   - Complete flow: setup → playing
   - Army placement during setup
   - Auto-transition logic

4. **Realtime Updates**
   - WebSocket connection
   - Real-time player synchronization
   - Reconnection handling

5. **Input Validation**
   - XSS prevention
   - Username length constraints (2-16 chars)
   - Alphanumeric validation

6. **Performance & Accessibility**
   - Page load times
   - Accessible navigation

## Test Debugging

### Common Issues

**1. Test timeouts**
```bash
# Increase timeout in test file
test.setTimeout(60000); // 60 seconds
```

**2. Selector not found**
```bash
# Run in headed mode to see what's happening
npm run test:e2e:local:debug
```

**3. WebSocket connection failures**
```bash
# Check Supabase Realtime is enabled
supabase status  # Verify Realtime is running

# Check browser console in headed mode
npm run test:e2e:local -- --headed
```

**4. Database state issues**
```bash
# Reset local database
supabase db reset

# Or manually clear data
supabase db execute "TRUNCATE games, players, territories, game_actions CASCADE;"
```

### Viewing Test Reports

After running tests:
```bash
# Open HTML report
npx playwright show-report              # Integration tests
npx playwright show-report playwright-report-test  # Local tests
```

## Writing New Tests

### Test Structure
```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test('should do something specific', async ({ page }) => {
    // 1. Setup - Navigate and prepare
    await page.goto('/');

    // 2. Action - Perform user actions
    await page.fill('#username-create', 'TestUser');
    await page.click('button:has-text("Create Game")');

    // 3. Assert - Verify results
    await expect(page).toHaveURL(/\/game\//);
    await expect(page.getByTestId('player-name')).toContainText('TestUser');
  });
});
```

### Selector Best Practices

**Priority order:**
1. `data-testid` attributes (most stable)
   ```typescript
   page.getByTestId('player-name')
   ```

2. ID selectors (stable if IDs are semantic)
   ```typescript
   page.locator('#username-create')
   ```

3. Text content (use for buttons/labels)
   ```typescript
   page.getByText('Create Game')
   page.locator('button:has-text("Create Game")')
   ```

4. CSS selectors (avoid, brittle)
   ```typescript
   page.locator('.submit-button')  // ❌ Avoid
   ```

### Adding Test Data Attributes

When writing new components, add `data-testid`:

```typescript
// components/YourComponent.tsx
export function YourComponent() {
  return (
    <div data-testid="your-component">
      <button data-testid="action-button">Click me</button>
    </div>
  );
}
```

## CI/CD Integration

### GitHub Actions Example
```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx playwright install --with-deps

      # Option 1: Local Supabase
      - run: npx supabase start
      - run: npx supabase db reset --db-url $DATABASE_URL
      - run: npm run test:e2e:local

      # Option 2: Test Supabase project
      - run: npm run test:e2e
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.TEST_SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.TEST_SUPABASE_ANON_KEY }}
```

## Performance Benchmarks

Expected test execution times:

- **Local Supabase:** 2-4 minutes (full suite)
- **Integration:** 3-6 minutes (network latency)
- **Production:** 4-8 minutes (network + HTTPS)

## Cleanup

After testing:
```bash
# Stop local Supabase
supabase stop

# Remove test artifacts
rm -rf test-results/ playwright-report/ playwright-report-test/
```

## Troubleshooting

### Local Supabase not starting
```bash
# Check Docker is running
docker ps

# Check port 54321 is free
lsof -i :54321

# Restart Supabase
supabase stop
supabase start
```

### Tests pass locally but fail in CI
- Check environment variables are set in CI
- Verify CI has sufficient timeout (tests need 60s)
- Check Docker/Supabase is properly initialized
- Review CI logs for database migration errors

### Database schema mismatch
```bash
# Regenerate types
supabase gen types typescript --local > lib/database.types.ts

# Reset database
supabase db reset
```

## Additional Resources

- [Playwright Documentation](https://playwright.dev/)
- [Supabase Local Development](https://supabase.com/docs/guides/cli/local-development)
- [Risk Game Testing Strategy](../../docs/TESTING_STRATEGY.md)
