import { http, HttpResponse } from 'msw';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const REST_API = `${SUPABASE_URL}/rest/v1`;

// In-memory store for test data
const db = {
  games: new Map<string, any>(),
  players: new Map<string, any>(),
  territories: new Map<string, any>(),
};

export const handlers = [
  // POST /rest/v1/games - Create game
  http.post(`${REST_API}/games`, async ({ request }) => {
    const body = await request.json() as any;
    const gameId = crypto.randomUUID();
    const game = {
      id: gameId,
      max_players: body.max_players || 4,
      status: 'waiting',
      current_player_order: 0,
      phase: 'reinforcement',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    db.games.set(gameId, game);
    return HttpResponse.json([game], { status: 201 });
  }),

  // GET /rest/v1/games?id=eq.xxx - Get game by ID
  http.get(`${REST_API}/games`, ({ request }) => {
    const url = new URL(request.url);
    const id = url.searchParams.get('id')?.replace('eq.', '');
    if (id) {
      const game = db.games.get(id);
      return game
        ? HttpResponse.json(game)
        : HttpResponse.json({ code: 'PGRST116', message: 'No rows found' }, { status: 404 });
    }
    return HttpResponse.json(Array.from(db.games.values()));
  }),

  // POST /rest/v1/players - Join game
  http.post(`${REST_API}/players`, async ({ request }) => {
    const body = await request.json() as any;
    const playerId = crypto.randomUUID();
    const player = {
      id: playerId,
      game_id: body.game_id,
      username: body.username,
      color: body.color,
      turn_order: body.turn_order || 0,
      armies_available: body.armies_available || 0,
      is_eliminated: false,
      created_at: new Date().toISOString(),
    };
    db.players.set(playerId, player);
    return HttpResponse.json([player], { status: 201 });
  }),

  // GET /rest/v1/players?game_id=eq.xxx - Get players by game
  http.get(`${REST_API}/players`, ({ request }) => {
    const url = new URL(request.url);
    const gameId = url.searchParams.get('game_id')?.replace('eq.', '');
    if (gameId) {
      const players = Array.from(db.players.values()).filter(p => p.game_id === gameId);
      return HttpResponse.json(players);
    }
    return HttpResponse.json(Array.from(db.players.values()));
  }),

  // PATCH /rest/v1/games?id=eq.xxx - Update game
  http.patch(`${REST_API}/games`, async ({ request }) => {
    const url = new URL(request.url);
    const id = url.searchParams.get('id')?.replace('eq.', '');
    const body = await request.json() as any;

    if (id && db.games.has(id)) {
      const game = db.games.get(id);
      const updated = { ...game, ...body, updated_at: new Date().toISOString() };
      db.games.set(id, updated);
      return HttpResponse.json([updated]);
    }
    return HttpResponse.json({ error: 'Not found' }, { status: 404 });
  }),

  // POST /rest/v1/territories - Create territories
  http.post(`${REST_API}/territories`, async ({ request }) => {
    const body = await request.json() as any;
    const territories = Array.isArray(body) ? body : [body];

    const created = territories.map(t => {
      const id = crypto.randomUUID();
      const territory = { id, ...t, created_at: new Date().toISOString() };
      db.territories.set(id, territory);
      return territory;
    });

    return HttpResponse.json(created, { status: 201 });
  }),

  // GET /rest/v1/territories?game_id=eq.xxx - Get territories by game
  http.get(`${REST_API}/territories`, ({ request }) => {
    const url = new URL(request.url);
    const gameId = url.searchParams.get('game_id')?.replace('eq.', '');
    if (gameId) {
      const territories = Array.from(db.territories.values()).filter(t => t.game_id === gameId);
      return HttpResponse.json(territories);
    }
    return HttpResponse.json(Array.from(db.territories.values()));
  }),
];

// Helper to clear test data between tests
export function clearMockDatabase() {
  db.games.clear();
  db.players.clear();
  db.territories.clear();
}
