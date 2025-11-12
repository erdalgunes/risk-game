import { createInitialState } from '../game';
export const mockEarlyGameState = (() => {
    const state = createInitialState(['red', 'blue']);
    // Modify some territories for consistent testing
    state.territories.alaska = Object.assign(Object.assign({}, state.territories.alaska), { owner: 'red', troops: 3 });
    state.territories.alberta = Object.assign(Object.assign({}, state.territories.alberta), { owner: 'red', troops: 3 });
    state.territories.northwest_territory = Object.assign(Object.assign({}, state.territories.northwest_territory), { owner: 'blue', troops: 3 });
    state.territories.ontario = Object.assign(Object.assign({}, state.territories.ontario), { owner: 'blue', troops: 3 });
    state.territories.quebec = Object.assign(Object.assign({}, state.territories.quebec), { owner: 'red', troops: 3 });
    state.territories.eastern_us = Object.assign(Object.assign({}, state.territories.eastern_us), { owner: 'red', troops: 3 });
    state.territories.western_us = Object.assign(Object.assign({}, state.territories.western_us), { owner: 'blue', troops: 3 });
    state.territories.central_america = Object.assign(Object.assign({}, state.territories.central_america), { owner: 'red', troops: 3 });
    state.territories.greenland = Object.assign(Object.assign({}, state.territories.greenland), { owner: 'blue', troops: 3 });
    state.phase = 'deploy';
    state.deployableTroops = 3;
    return state;
})();
export const mockMidGameState = (() => {
    const state = Object.assign({}, mockEarlyGameState);
    state.phase = 'attack';
    state.territories.alaska.troops = 5;
    state.territories.alberta.troops = 4;
    state.territories.northwest_territory.troops = 2;
    return state;
})();
export const mockNearVictoryState = (() => {
    const state = Object.assign({}, mockEarlyGameState);
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
})();
export const mockStalemateState = (() => {
    const state = Object.assign({}, mockEarlyGameState);
    state.phase = 'attack';
    // Set all territories to have only 1 troop
    Object.values(state.territories).forEach(territory => {
        territory.troops = 1;
    });
    return state;
})();
