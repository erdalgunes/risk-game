# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Developer experience improvements
  - Interactive setup wizard (`npm run setup`)
  - Health check script (`npm run doctor`)
  - CONTRIBUTING.md with comprehensive guidelines
  - Architecture Decision Records (ADR) in docs/ADR/
  - Git worktrees documentation in README.md
  - TESTING.md guide clarifying E2E configurations
- Tooling enhancements
  - Prettier code formatting with Tailwind plugin
  - Bundle analyzer integration (`npm run analyze`)
  - Integration tests skeleton
  - Database reset script (`npm run reset:db`)
  - Test watch mode (`npm run test:watch`)
- Organized package.json scripts with sections
- Consolidated .env files (5 → 3)

### Changed
- Updated TESTING.md to clarify two Playwright configurations
- CI: E2E smoke tests now skip on PR runs (only run on main branch merges)
  * TODO: Implement mock Supabase backend for CI E2E testing (MSW or similar)
  * Current limitation: E2E tests require real Supabase instance

### Removed
- Duplicate .env files (.env.production.template, .env.local.example)

## [0.1.0] - 2024-12-15

### Added
- Initial release
- Real-time multiplayer Risk game
- Next.js 15 App Router with TypeScript
- Supabase backend (PostgreSQL + Realtime)
- Game engine with combat, rules, validation
- Lobby system (create/join games)
- Setup phase (territory distribution)
- Attack mechanics with dice rolls
- Fortify/move armies between territories
- Win condition detection
- Production monitoring (Sentry, Vercel Analytics)
- E2E tests with Playwright
- Unit tests with Vitest
- PWA support
- Security headers
- Rate limiting
- Profanity filtering

### Changed
- Untyped Supabase client (avoid TypeScript errors)

### Fixed
- Real-time reconnection logic
- BFS connectivity validation for fortify

## [0.0.1] - 2024-11-01

### Added
- Project initialization
- Database schema design
- TypeScript types
- Basic Next.js scaffolding

---

## Versioning Guide

### Version Format: MAJOR.MINOR.PATCH

- **MAJOR**: Breaking changes (API changes, removed features)
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes (backward compatible)

### Conventional Commits → Version Bumps

- `feat:` → MINOR bump (0.1.0 → 0.2.0)
- `fix:` → PATCH bump (0.1.0 → 0.1.1)
- `BREAKING CHANGE:` → MAJOR bump (0.1.0 → 1.0.0)

### Categories

- **Added**: New features
- **Changed**: Changes to existing functionality
- **Deprecated**: Soon-to-be-removed features
- **Removed**: Removed features
- **Fixed**: Bug fixes
- **Security**: Security vulnerability fixes

### Example Entry

```markdown
## [1.2.3] - 2024-12-20

### Added
- Territory cards system (#45)
- Spectator mode (#52)

### Changed
- Improved combat animation performance (#48)

### Fixed
- Fortify validation edge case (#50)
- Real-time sync race condition (#51)
```
