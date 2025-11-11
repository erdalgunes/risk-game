/**
 * Simplified Risk Game Types for Proof of Concept
 * 6 territories, 2 players, basic rules only
 */

export type PlayerColor = 'red' | 'blue';

export type TerritoryId = '1' | '2' | '3' | '4' | '5' | '6';

export interface Player {
  id: string;
  color: PlayerColor;
  name: string;
  isAI: boolean;
}

export interface Territory {
  id: TerritoryId;
  name: string;
  ownerId: string;
  troops: number;
  adjacentTerritories: TerritoryId[];
}

export interface GameState {
  id: string;
  players: Player[];
  territories: Territory[];
  currentPlayerIndex: number;
  phase: GamePhase;
  winner: string | null;
  mode: 'single-player' | 'multiplayer';
}

export type GamePhase = 'attack' | 'fortify';

export interface AttackResult {
  success: boolean;
  attackerRoll: number;
  defenderRoll: number;
  attackerLoss: number;
  defenderLoss: number;
  conquered: boolean;
}

export interface MoveValidation {
  valid: boolean;
  error?: string;
}

export interface AIMove {
  type: 'attack' | 'fortify' | 'end-turn';
  fromTerritoryId?: TerritoryId;
  toTerritoryId?: TerritoryId;
  troops?: number;
}
