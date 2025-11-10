# Event Sourcing for Game Actions

**Status**: Accepted

**Date**: 2024-12-15

**Deciders**: Development Team

## Context and Problem Statement

Risk game requires robust state management with complete audit trail of all game actions. We need to support game state reconstruction, debugging complex multiplayer scenarios, and potential future features like replay/undo. Traditional CRUD operations only store current state, losing valuable historical context.

## Decision Drivers

* Need complete audit trail of all game actions
* Support debugging and troubleshooting multiplayer edge cases
* Enable future features (replay, undo, analytics)
* Maintain data consistency across real-time updates
* Support state reconstruction from events

## Considered Options

1. Event Sourcing with dedicated event store
2. Audit log table (append-only action history)
3. Traditional CRUD with soft deletes
4. No historical tracking (current state only)

## Decision Outcome

Chosen option: "Event Sourcing with dedicated event store", because it provides complete game history, enables state reconstruction, and supports advanced features while maintaining clean separation of concerns.

### Implementation

```typescript
// lib/event-sourcing/EventStore.ts
const eventStore = createEventStore(supabase);
await eventStore.appendEvent({
  event_type: 'territory_attacked',
  payload: { from, to, result },
}, {
  game_id: gameId,
  player_id: playerId,
  correlation_id: attackId,
});

// Automatic snapshots every 50 events
await autoCreateSnapshot(supabase, gameId);
```

### Positive Consequences

* Complete audit trail of all game actions
* Can reconstruct game state at any time
* Supports debugging complex multiplayer scenarios
* Enables future replay/undo features
* Events are immutable (append-only)
* Performance optimization via snapshots
* Clean separation between commands and events

### Negative Consequences

* Additional storage overhead for events
* More complex than simple CRUD operations
* Requires snapshot management for performance
* Event schema migrations more complex
* Learning curve for event sourcing patterns

## Pros and Cons of the Options

### Event Sourcing with dedicated store

* Good, because provides complete audit trail
* Good, because enables state reconstruction
* Good, because supports advanced features (replay, undo)
* Good, because events are immutable
* Bad, because increased storage requirements
* Bad, because more complex implementation

### Audit log table

* Good, because simpler than full event sourcing
* Good, because provides action history
* Bad, because not designed for state reconstruction
* Bad, because lacks correlation/causation tracking
* Bad, because limited query capabilities

### Traditional CRUD with soft deletes

* Good, because simplest implementation
* Good, because familiar pattern
* Bad, because no action history
* Bad, because soft deletes don't capture all changes
* Bad, because can't reconstruct intermediate states

### No historical tracking

* Good, because minimal storage
* Good, because simplest code
* Bad, because impossible to debug issues
* Bad, because no audit trail
* Bad, because can't answer "what happened?" questions

## Links

* [lib/event-sourcing/EventStore.ts](/lib/event-sourcing/EventStore.ts)
* [lib/event-sourcing/snapshot-helpers.ts](/lib/event-sourcing/snapshot-helpers.ts)
* [app/actions/game.ts](/app/actions/game.ts) - Event logging implementation
