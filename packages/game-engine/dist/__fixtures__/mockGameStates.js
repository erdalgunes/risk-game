import { createInitialState } from '../game';
export const createMockEarlyGameState = () => {
    const state = createInitialState(['red', 'blue']);
    // Modify some territories for consistent testing
    state.territories.alaska = { ...state.territories.alaska, owner: 'red', troops: 3 };
    state.territories.alberta = { ...state.territories.alberta, owner: 'red', troops: 3 };
    state.territories.northwest_territory = { ...state.territories.northwest_territory, owner: 'blue', troops: 3 };
    state.territories.ontario = { ...state.territories.ontario, owner: 'blue', troops: 3 };
    state.territories.quebec = { ...state.territories.quebec, owner: 'red', troops: 3 };
    state.territories.eastern_us = { ...state.territories.eastern_us, owner: 'red', troops: 3 };
    state.territories.western_us = { ...state.territories.western_us, owner: 'blue', troops: 3 };
    state.territories.central_america = { ...state.territories.central_america, owner: 'red', troops: 3 };
    state.territories.greenland = { ...state.territories.greenland, owner: 'blue', troops: 3 };
    state.phase = 'deploy';
    state.deployableTroops = 3;
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
