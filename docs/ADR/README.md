# Architecture Decision Records

This directory contains records of architectural decisions made during development.

## Format

We use the [MADR](https://adr.github.io/madr/) (Markdown Architectural Decision Records) format:

- **Status**: Accepted | Proposed | Deprecated | Superseded
- **Context**: What is the issue we're addressing?
- **Decision**: What did we decide?
- **Consequences**: What are the trade-offs?

## Index

- [ADR-001: Untyped Supabase Client](./001-untyped-supabase-client.md) - Why we don't use TypeScript generics with Supabase
- [ADR-002: Event Sourcing for Game Actions](./002-event-sourcing-game-actions.md) - Game state reconstruction from events

## Creating New ADRs

1. Copy `adr-template.md` to `XXX-title-with-dashes.md`
2. Increment number (e.g., 003, 004)
3. Fill out all sections
4. Update this index
5. Link from relevant code/docs
