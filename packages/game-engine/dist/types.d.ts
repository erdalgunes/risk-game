import type { TerritoryName, ContinentName } from './territoryData';
export type { TerritoryName, ContinentName };
export type Player = 'red' | 'blue' | 'green' | 'yellow' | 'purple' | 'orange' | 'neutral';
export type TerritoryId = TerritoryName;
export interface Territory {
    id: TerritoryId;
    name: TerritoryName;
    continent: ContinentName;
    owner: Player | null;
    troops: number;
    adjacentTo: TerritoryId[];
}
export type GamePhase = 'initial_placement' | 'deploy' | 'attack' | 'attack_transfer' | 'fortify';
export type InitialPlacementSubPhase = 'claiming' | 'reinforcing';
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
    deployableTroops: number;
    conqueredTerritoryThisTurn: boolean;
    fortifiedThisTurn: boolean;
    initialPlacementSubPhase?: InitialPlacementSubPhase;
    unplacedTroops?: Record<Player, number>;
    pendingTransfer?: {
        from: TerritoryId;
        to: TerritoryId;
        minTroops: number;
        maxTroops: number;
    };
}
export interface DeployMove {
    type: 'deploy';
    territory: TerritoryId;
    troops: number;
}
export interface AttackMove {
    type: 'attack';
    from: TerritoryId;
    to: TerritoryId;
    attackerDice?: 1 | 2 | 3;
    defenderDice?: 1 | 2;
}
export interface TransferMove {
    type: 'transfer';
    troops: number;
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
export type Move = DeployMove | AttackMove | TransferMove | FortifyMove | SkipMove;
export interface AttackResult {
    attackerRolls: number[];
    defenderRolls: number[];
    attackerLost: number;
    defenderLost: number;
    conquered: boolean;
    diceUsed: number;
}
//# sourceMappingURL=types.d.ts.map