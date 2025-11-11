export type Player = 'red' | 'blue';
export type TerritoryId = 1 | 2 | 3 | 4 | 5 | 6;
export interface Territory {
    id: TerritoryId;
    owner: Player;
    troops: number;
    adjacentTo: TerritoryId[];
}
export type GamePhase = 'attack' | 'fortify';
export interface GameState {
    currentPlayer: Player;
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
//# sourceMappingURL=types.d.ts.map