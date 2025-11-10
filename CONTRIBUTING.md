# Contributing to Risk Game

Thank you for your interest in contributing! This document provides guidelines for setting up your development environment and contributing code.

## Quick Start

1. **Fork and clone the repository**
   ```bash
   git clone https://github.com/your-username/risk-game.git
   cd risk-game
   ```

2. **Run health check**
   ```bash
   npm run doctor
   ```
   This validates your environment and identifies missing dependencies or configuration issues.

3. **Install dependencies**
   ```bash
   npm install
   ```

4. **Configure environment**
   ```bash
   cp .env.example .env.local
   ```
   Edit `.env.local` with your Supabase credentials (see [Setup Guide](#supabase-setup)).

5. **Start development server**
   ```bash
   npm run dev
   ```

## Development Workflow

### Using Git Worktrees (Recommended)

Git worktrees allow you to work on multiple branches simultaneously without constant switching.

**Create a worktree for a new feature:**
```bash
# From main repository
git worktree add ../risk-feature-oauth feature/oauth-integration

# Work in the new directory
cd ../risk-feature-oauth
npm install  # Install dependencies in worktree
npm run dev  # Run dev server
```

**List all worktrees:**
```bash
git worktree list
```

**Remove a worktree:**
```bash
git worktree remove ../risk-feature-oauth
```

**Best practices:**
- Name worktree directories clearly (e.g., `risk-feature-name`, `risk-bugfix-123`)
- Each worktree needs its own `node_modules/` (run `npm install`)
- Use separate `.env.local` files if testing different configurations

### Making Changes

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Follow the code style**
   - TypeScript strict mode (no `any`, no `@ts-ignore`)
   - Pure functions in `/lib/game-engine/` (no React/Next.js dependencies)
   - Server Actions return `{ success: boolean; error?: string; result?: T }`
   - Use existing patterns (DRY principle)

3. **Write tests**
   - Unit tests for game logic: `/lib/game-engine/__tests__/`
   - Component tests: `/components/**/__tests__/`
   - E2E tests for critical flows: `/tests/e2e/`

4. **Run quality checks**
   ```bash
   npm run type-check  # TypeScript validation
   npm run lint        # ESLint
   npm run test        # Unit tests
   npm run test:e2e:local  # E2E tests (requires Supabase)
   ```

### Commit Convention

We use [Conventional Commits](https://www.conventionalcommits.org/) for clear commit history and automated changelogs.

**Format**: `<type>(<scope>): <description>`

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `refactor`: Code refactoring (no behavior change)
- `test`: Adding or updating tests
- `chore`: Build/tooling changes

**Examples**:
```bash
git commit -m "feat(combat): add territory conquest animation"
git commit -m "fix(lobby): prevent duplicate game creation"
git commit -m "docs(readme): update deployment instructions"
git commit -m "test(rules): add reinforcement calculation tests"
```

### Pull Request Process

1. **Update your branch**
   ```bash
   git fetch origin
   git rebase origin/main
   ```

2. **Push your changes**
   ```bash
   git push origin feature/your-feature-name
   ```

3. **Create pull request**
   - Use descriptive title: `feat: Add territory conquest animation`
   - Fill out PR template (auto-generated)
   - Reference related issues: `Closes #123`

4. **PR requirements**
   - ✅ All CI checks pass (type-check, lint, tests, build)
   - ✅ No merge conflicts
   - ✅ Code review approved
   - ✅ Documentation updated (if needed)

## Supabase Setup

### Option 1: Free Supabase Cloud (Recommended)

1. Create account at [supabase.com](https://supabase.com)
2. Create new project (select region closest to you)
3. Go to **Project Settings > API**
4. Copy **Project URL** and **anon key** to `.env.local`
5. Run schema migration:
   - Open **SQL Editor** in Supabase dashboard
   - Copy contents of `supabase-schema.sql`
   - Paste and **Run**
6. Enable Realtime:
   - Go to **Database > Replication**
   - Enable for tables: `games`, `players`, `territories`, `game_actions`

### Option 2: Mock Mode (Offline Development)

```bash
NEXT_PUBLIC_MOCK_MODE=true npm run dev
```

## Testing Guide

### Unit Tests (Vitest)
```bash
npm run test              # Run all unit tests
npm run test:ui           # Interactive UI
npm run test:coverage     # Coverage report
npm run test:watch        # Watch mode
```

### E2E Tests (Playwright)
```bash
# Local Supabase (recommended for development)
npm run test:e2e:local

# With UI (interactive debugging)
npm run test:e2e:local:ui

# Debug mode (step through tests)
npm run test:e2e:local:debug

# Production smoke tests
npm run test:e2e:prod
```

### Test Coverage Thresholds
Current minimums (see `vitest.config.ts`):
- Lines: 40%
- Functions: 45%
- Branches: 70%
- Statements: 40%

**Goal**: Increase progressively to 80%+ for critical paths.

## Architecture Guidelines

### Layer Separation (SOLID)

1. **Game Engine** (`/lib/game-engine/`)
   - Pure functions only
   - Zero dependencies on React/Next.js/Supabase
   - 100% unit testable
   - Files: `combat.ts`, `rules.ts`, `validation.ts`

2. **Database Layer** (`/lib/supabase/`)
   - Untyped Supabase client (no generic `<Database>`)
   - Reusable query functions
   - Server-side client factory

3. **Server Actions** (`/app/actions/game.ts`)
   - Type-safe Next.js 15 Server Actions
   - All return `{ success, error?, result? }`
   - Handle errors gracefully

4. **Real-time** (`/lib/hooks/useGameState.ts`)
   - Single hook for all game state
   - Auto-reconnection logic
   - Cleanup on unmount

5. **UI Components** (`/components/`)
   - Server Components by default
   - Add `'use client'` only when needed
   - Use toast notifications (not alerts)

### Critical Patterns

**Why Untyped Supabase Client?**
- TypeScript generic `<Database>` causes "Type 'never' is not assignable" errors
- See `docs/ADR/001-untyped-supabase-client.md` for full rationale

**BFS Connectivity for Fortify:**
- `validation.ts:areTerritoriesConnected()` uses BFS pathfinding
- Validates territories are connected through player-owned network
- Required for fortify moves (can't teleport armies)

**Auto-Transition Logic:**
- `placeArmies()` auto-transitions from "setup" → "playing"
- Checks if all players have `armies_available === 0`
- No manual intervention needed

## Common Issues

### "Missing Supabase environment variables"
```bash
cp .env.example .env.local
# Edit .env.local with real credentials
```

### TypeScript "Type 'never' is not assignable"
- Don't add `<Database>` generic to Supabase client
- Use runtime casting: `const game = data as Game;`

### Real-time updates not working
- Enable Realtime in Supabase dashboard (Database > Replication)
- Check browser console for WebSocket errors
- Verify credentials in `.env.local`

### Build fails
```bash
npm run fresh  # Nuclear option: clean + reinstall + rebuild
```

## Resources

- [Next.js 15 Docs](https://nextjs.org/docs)
- [Supabase Docs](https://supabase.com/docs)
- [Vitest Docs](https://vitest.dev/)
- [Playwright Docs](https://playwright.dev/)
- [Conventional Commits](https://www.conventionalcommits.org/)

## Code of Conduct

Be respectful, inclusive, and constructive. This is a learning project—mistakes are opportunities to improve.

## Questions?

- Open an issue for bugs or feature requests
- Use discussions for questions or ideas
- Check existing documentation first (CLAUDE.md, TESTING.md, etc.)

Happy coding! 🎲
