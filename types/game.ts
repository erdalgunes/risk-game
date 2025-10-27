// Core game types matching Supabase schema

export type GameStatus = 'waiting' | 'setup' | 'playing' | 'finished';
export type GamePhase = 'reinforcement' | 'attack' | 'fortify';

export interface Game {
  id: string;
  status: GameStatus;
  phase: GamePhase;
  current_turn: number;
  current_player_order: number;
  winner_id: string | null;
  max_players: number;
  created_at: string;
  updated_at: string;
}

export interface Player {
  id: string;
  game_id: string;
  username: string;
  color: PlayerColor;
  turn_order: number;
  armies_available: number;
  is_eliminated: boolean;
  created_at: string;
}

export interface Territory {
  id: string;
  game_id: string;
  territory_name: TerritoryName;
  owner_id: string | null;
  army_count: number;
  updated_at: string;
}

export interface GameAction {
  id: string;
  game_id: string;
  player_id: string;
  action_type: ActionType;
  payload: Record<string, any>;
  created_at: string;
}

// Action types
export type ActionType =
  | 'place_army'
  | 'attack'
  | 'fortify'
  | 'end_turn'
  | 'claim_territory';

// Player colors
export type PlayerColor =
  | 'red'
  | 'blue'
  | 'green'
  | 'yellow'
  | 'purple'
  | 'orange';

// Territory names (42 territories from classic Risk)
export type TerritoryName =
  // North America (9)
  | 'alaska'
  | 'northwest-territory'
  | 'greenland'
  | 'alberta'
  | 'ontario'
  | 'quebec'
  | 'western-united-states'
  | 'eastern-united-states'
  | 'central-america'
  // South America (4)
  | 'venezuela'
  | 'brazil'
  | 'peru'
  | 'argentina'
  // Europe (7)
  | 'iceland'
  | 'great-britain'
  | 'scandinavia'
  | 'northern-europe'
  | 'western-europe'
  | 'southern-europe'
  | 'ukraine'
  // Africa (6)
  | 'north-africa'
  | 'egypt'
  | 'east-africa'
  | 'congo'
  | 'south-africa'
  | 'madagascar'
  // Asia (12)
  | 'ural'
  | 'siberia'
  | 'yakutsk'
  | 'kamchatka'
  | 'irkutsk'
  | 'mongolia'
  | 'japan'
  | 'afghanistan'
  | 'china'
  | 'middle-east'
  | 'india'
  | 'siam'
  // Australia (4)
  | 'indonesia'
  | 'new-guinea'
  | 'western-australia'
  | 'eastern-australia';

// Continent names
export type ContinentName =
  | 'north-america'
  | 'south-america'
  | 'europe'
  | 'africa'
  | 'asia'
  | 'australia';

// Game state with related entities
export interface GameState {
  game: Game;
  players: Player[];
  territories: Territory[];
  currentPlayer: Player | null;
}

// Attack result
export interface AttackResult {
  success: boolean;
  attackerLosses: number;
  defenderLosses: number;
  conquered: boolean;
  attackerDice: number[];
  defenderDice: number[];
}

// Continent definition
export interface Continent {
  name: ContinentName;
  bonus: number;
  territories: TerritoryName[];
}

// Territory definition
export interface TerritoryDefinition {
  name: TerritoryName;
  continent: ContinentName;
  adjacentTerritories: TerritoryName[];
}
