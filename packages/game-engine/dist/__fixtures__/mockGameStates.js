import { createInitialState } from '../game';
import { allTerritoryNames } from '../territoryData';
export const createMockEarlyGameState = () => {
    const state = createInitialState(['red', 'blue']);
    // Distribute all territories between red, blue, and neutral (2-player game includes neutral)
    // Assign territories in round-robin to ensure all are claimed
    const players = state.players; // ['red', 'blue', 'neutral']
    allTerritoryNames.forEach((territoryName, index) => {
        const owner = players[index % players.length];
        state.territories[territoryName] = {
            ...state.territories[territoryName],
            owner,
            troops: 3
        };
    });
    // Set to deploy phase (after initial placement)
    state.phase = 'deploy';
    state.deployableTroops = 3;
    state.unplacedTroops = { red: 0, blue: 0, neutral: 0, green: 0, yellow: 0, purple: 0, orange: 0 };
    delete state.initialPlacementSubPhase;
    return state;
};
export const mockEarlyGameState = createMockEarlyGameState();
export const createMockMidGameState = () => {
    const state = createMockEarlyGameState();
    state.phase = 'attack';
    state.territories.alaska.troops = 5;
    state.territories.alberta.troops = 4;
    state.territories.northwest_territory.troops = 2;
    return state;
};
export const mockMidGameState = createMockMidGameState();
export const createMockNearVictoryState = () => {
    const state = createMockEarlyGameState();
    state.phase = 'attack';
    state.territories.alaska.troops = 10;
    state.territories.alberta.troops = 8;
    state.territories.northwest_territory.owner = 'red';
    state.territories.northwest_territory.troops = 1;
    state.territories.ontario.owner = 'red';
    state.territories.ontario.troops = 6;
    state.territories.quebec.troops = 7;
    state.territories.eastern_us.troops = 9;
    state.territories.western_us.owner = 'red';
    state.territories.western_us.troops = 5;
    state.territories.central_america.troops = 4;
    state.territories.greenland.owner = 'red';
    state.territories.greenland.troops = 3;
    return state;
};
export const mockNearVictoryState = createMockNearVictoryState();
export const createMockStalemateState = () => {
    const state = createMockEarlyGameState();
    state.phase = 'attack';
    // Set all territories to have only 1 troop
    for (const territory of Object.values(state.territories)) {
        territory.troops = 1;
    }
    return state;
};
export const mockStalemateState = createMockStalemateState();
