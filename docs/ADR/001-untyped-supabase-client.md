# Use Untyped Supabase Client

**Status**: Accepted

**Date**: 2024-12-15

**Deciders**: Development Team

## Context and Problem Statement

Supabase provides TypeScript type generation from database schema. However, using the typed client with generic `<Database>` causes persistent "Type 'never' is not assignable" errors on insert and update operations, blocking development.

## Decision Drivers

* Need type safety for database operations
* Must avoid TypeScript compilation errors
* Want to maintain developer productivity
* Need reliable builds in CI/CD

## Considered Options

1. Untyped Supabase client with runtime type casting
2. Typed client with `@ts-ignore` suppressions
3. Typed client with extensive type assertions
4. Fork and modify Supabase types

## Decision Outcome

Chosen option: "Untyped Supabase client with runtime type casting", because it eliminates TypeScript errors while maintaining type safety at usage points.

### Implementation

```typescript
// lib/supabase/client.ts
export const supabase = createClient(url, key); // NO <Database> generic

// Usage with runtime casting
const { data: game } = await supabase.from('games').select('*').single();
const typedGame = game as Game;
```

### Positive Consequences

* Zero TypeScript compilation errors
* Builds complete successfully
* Type safety at usage points via casting
* No maintenance of complex type workarounds
* Clean, understandable code

### Negative Consequences

* Lose autocomplete on table/column names
* Manual type casting required
* Potential runtime errors if types drift from schema
* Less ideal developer experience than fully-typed client

## Pros and Cons of the Options

### Untyped client with runtime casting

* Good, because it eliminates all TypeScript errors
* Good, because builds are reliable
* Good, because code is simple and maintainable
* Bad, because we lose IDE autocomplete
* Bad, because requires manual casting

### Typed client with @ts-ignore

* Good, because we keep autocomplete
* Bad, because we're suppressing legitimate errors
* Bad, because violates code quality standards (no @ts-ignore allowed)
* Bad, because errors could hide real issues

### Typed client with extensive assertions

* Good, because no error suppression
* Bad, because extremely verbose code
* Bad, because still hit type inference issues
* Bad, because maintenance burden

### Fork and modify types

* Good, because could fix root cause
* Bad, because massive maintenance burden
* Bad, because diverges from official types
* Bad, because breaks on Supabase updates

## Links

* [lib/supabase/client.ts](/lib/supabase/client.ts)
* [Supabase TypeScript docs](https://supabase.com/docs/guides/api/typescript-support)
