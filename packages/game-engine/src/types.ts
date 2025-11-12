import type { TerritoryName, ContinentName } from './territoryData';

export type { TerritoryName, ContinentName };

export type Player = 'red' | 'blue' | 'green' | 'yellow' | 'purple' | 'orange';

export type TerritoryId = TerritoryName;

export interface Territory {
  id: TerritoryId;
  name: TerritoryName;
  continent: ContinentName;
  owner: Player | null;
  troops: number;
  adjacentTo: TerritoryId[];
}

export type GamePhase = 'attack' | 'fortify';

export interface PlayerState {
  id: Player;
  territories: TerritoryId[];
  continentBonus: number;
}

export interface GameState {
  currentPlayer: Player;
  players: Player[];
  phase: GamePhase;
  territories: Record<TerritoryId, Territory>;
  winner: Player | null;
}

export interface AttackMove {
  type: 'attack';
  from: TerritoryId;
  to: TerritoryId;
}

export interface FortifyMove {
  type: 'fortify';
  from: TerritoryId;
  to: TerritoryId;
  troops: number;
}

export interface SkipMove {
  type: 'skip';
}

export type Move = AttackMove | FortifyMove | SkipMove;

export interface AttackResult {
  attackerLost: number;
  defenderLost: number;
  conquered: boolean;
}
