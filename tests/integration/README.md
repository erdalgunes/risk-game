# Integration Tests

Integration tests validate interactions between multiple modules without UI (faster than E2E).

## Difference from Unit/E2E

- **Unit**: Single function/component in isolation
- **Integration**: Multiple modules working together (e.g., Server Action + Database)
- **E2E**: Full user flow through browser

## Running Integration Tests

```bash
npm run test:integration
```

## Example: Server Action Integration Test

```typescript
// tests/integration/game-actions.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { startGame } from '@/app/actions/game';
import { createClient } from '@supabase/supabase-js';

describe('Game Actions Integration', () => {
  let supabase: any;

  beforeEach(async () => {
    // Use .env.test database
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Clean test data
    await supabase.from('games').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  });

  it('should create game with territories distributed', async () => {
    // Create players
    const { data: player1 } = await supabase.from('players').insert({
      username: 'Player1',
      color: 'red'
    }).select().single();

    // Start game
    const result = await startGame('game-123', [player1.id]);

    expect(result.success).toBe(true);

    // Verify territories assigned
    const { data: territories } = await supabase
      .from('territories')
      .select('*')
      .eq('game_id', 'game-123');

    expect(territories).toHaveLength(42);
  });
});
```

## Best Practices

1. Use `.env.test` database (isolate from dev)
2. Clean test data in `beforeEach`
3. Test happy paths + error cases
4. Focus on module boundaries (Server Actions, API routes)
5. Faster than E2E, more thorough than unit tests
