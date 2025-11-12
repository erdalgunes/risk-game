import { territories, continents, allTerritoryNames } from './territoryData';
function shuffle(array) {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}
function getInitialArmyCount(playerCount) {
    switch (playerCount) {
        case 2: return 40;
        case 3: return 35;
        case 4: return 30;
        case 5: return 25;
        case 6: return 20;
        default: return 40;
    }
}
export function createInitialState(players = ['red', 'blue']) {
    const territoryMap = {};
    // Check if 2-player game - add neutral player
    let actualPlayers = [...players];
    if (players.length === 2 && !players.includes('neutral')) {
        actualPlayers = [...players, 'neutral'];
    }
    // Initialize all territories as unclaimed
    allTerritoryNames.forEach((territoryName) => {
        const territoryDef = territories[territoryName];
        territoryMap[territoryName] = {
            id: territoryName,
            name: territoryName,
            continent: territoryDef.continent,
            owner: null,
            troops: 0,
            adjacentTo: territoryDef.neighbors
        };
    });
    // Calculate initial armies for each player
    const armyCount = getInitialArmyCount(actualPlayers.length);
    const unplacedTroops = {};
    actualPlayers.forEach((player) => {
        unplacedTroops[player] = armyCount;
    });
    const initialState = {
        currentPlayer: players[0], // First human player
        players: actualPlayers,
        phase: 'initial_placement',
        initialPlacementSubPhase: 'claiming',
        territories: territoryMap,
        winner: null,
        deployableTroops: 0,
        conqueredTerritoryThisTurn: false,
        fortifiedThisTurn: false,
        unplacedTroops
    };
    return initialState;
}
function rollDice() {
    return Math.floor(Math.random() * 6) + 1;
}
function rollMultipleDice(count) {
    const rolls = [];
    for (let i = 0; i < count; i++) {
        rolls.push(rollDice());
    }
    return rolls.sort((a, b) => b - a); // Sort descending
}
function resolveAttack(attackerTroops, defenderTroops, attackerDice, defenderDice) {
    // Validate dice counts
    const maxAttackerDice = Math.min(3, attackerTroops - 1);
    const maxDefenderDice = Math.min(2, defenderTroops);
    const actualAttackerDice = Math.min(attackerDice, maxAttackerDice);
    const actualDefenderDice = Math.min(defenderDice, maxDefenderDice);
    // Roll dice
    const attackerRolls = rollMultipleDice(actualAttackerDice);
    const defenderRolls = rollMultipleDice(actualDefenderDice);
    // Compare dice pairs (defender wins ties)
    let attackerLost = 0;
    let defenderLost = 0;
    const comparisons = Math.min(attackerRolls.length, defenderRolls.length);
    for (let i = 0; i < comparisons; i++) {
        if (attackerRolls[i] > defenderRolls[i]) {
            defenderLost++;
        }
        else {
            attackerLost++;
        }
    }
    const conquered = defenderTroops - defenderLost === 0;
    return {
        attackerRolls,
        defenderRolls,
        attackerLost,
        defenderLost,
        conquered,
        diceUsed: actualAttackerDice
    };
}
function isAdjacent(from, to, territoryMap) {
    return territoryMap[from].adjacentTo.includes(to);
}
function areConnected(from, to, owner, territoryMap) {
    const visited = new Set();
    const queue = [from];
    while (queue.length > 0) {
        const current = queue.shift();
        if (current === to)
            return true;
        if (visited.has(current))
            continue;
        visited.add(current);
        const adjacent = territoryMap[current].adjacentTo.filter(id => territoryMap[id].owner === owner);
        queue.push(...adjacent);
    }
    return false;
}
export function getContinentBonus(player, territoryMap) {
    let bonus = 0;
    for (const continent of continents) {
        const ownsAllTerritories = continent.territories.every(territoryName => territoryMap[territoryName].owner === player);
        if (ownsAllTerritories) {
            bonus += continent.bonus;
        }
    }
    return bonus;
}
export function getPlayerTerritoryCount(player, territoryMap) {
    return Object.values(territoryMap).filter(t => t.owner === player).length;
}
export function calculateReinforcements(state, player) {
    const territoryCount = getPlayerTerritoryCount(player, state.territories);
    const continentBonus = getContinentBonus(player, state.territories);
    // Base reinforcements: territories ÷ 3 (round down)
    const baseReinforcements = Math.floor(territoryCount / 3);
    // Total reinforcements with continent bonus, minimum 3
    const totalReinforcements = baseReinforcements + continentBonus;
    return Math.max(3, totalReinforcements);
}
export function validateMove(state, move) {
    const { currentPlayer, phase, territories, deployableTroops, unplacedTroops, pendingTransfer, fortifiedThisTurn } = state;
    if (move.type === 'skip') {
        // Cannot skip deploy phase if there are troops to deploy
        if (phase === 'deploy' && deployableTroops > 0) {
            return 'Must deploy all troops before skipping';
        }
        // Cannot skip initial placement
        if (phase === 'initial_placement') {
            return 'Must place troops during initial placement';
        }
        // Cannot skip transfer phase
        if (phase === 'attack_transfer') {
            return 'Must transfer troops to conquered territory';
        }
        return null;
    }
    if (move.type === 'deploy') {
        if (phase === 'initial_placement') {
            const subPhase = state.initialPlacementSubPhase;
            const territory = territories[move.territory];
            if (move.troops !== 1) {
                return 'Can only place 1 troop at a time during initial placement';
            }
            if (!unplacedTroops || unplacedTroops[currentPlayer] === 0) {
                return 'No troops left to place';
            }
            if (subPhase === 'claiming') {
                if (territory.owner !== null) {
                    return 'Territory is already claimed';
                }
            }
            else {
                // reinforcing phase
                if (territory.owner !== currentPlayer) {
                    return 'You do not own this territory';
                }
            }
            return null;
        }
        if (phase !== 'deploy') {
            return 'Can only deploy during deploy phase';
        }
        const territory = territories[move.territory];
        if (territory.owner !== currentPlayer) {
            return 'You do not own this territory';
        }
        if (move.troops < 1) {
            return 'Must deploy at least 1 troop';
        }
        if (move.troops > deployableTroops) {
            return `Only ${deployableTroops} troops available to deploy`;
        }
        return null;
    }
    if (move.type === 'attack') {
        if (phase !== 'attack') {
            return 'Can only attack during attack phase';
        }
        const from = territories[move.from];
        const to = territories[move.to];
        if (from.owner !== currentPlayer) {
            return 'You do not own the attacking territory';
        }
        if (to.owner === currentPlayer) {
            return 'Cannot attack your own territory';
        }
        if (from.troops <= 1) {
            return 'Need at least 2 troops to attack';
        }
        if (!isAdjacent(move.from, move.to, territories)) {
            return 'Territories are not adjacent';
        }
        // Validate dice choices if provided
        if (move.attackerDice) {
            const maxAttackerDice = Math.min(3, from.troops - 1);
            if (move.attackerDice > maxAttackerDice) {
                return `Can only roll ${maxAttackerDice} dice with ${from.troops} troops`;
            }
        }
        if (move.defenderDice) {
            const maxDefenderDice = Math.min(2, to.troops);
            if (move.defenderDice > maxDefenderDice) {
                return `Defender can only roll ${maxDefenderDice} dice with ${to.troops} troops`;
            }
        }
        return null;
    }
    if (move.type === 'transfer') {
        if (phase !== 'attack_transfer') {
            return 'Can only transfer during attack transfer phase';
        }
        if (!pendingTransfer) {
            return 'No pending transfer';
        }
        if (move.troops < pendingTransfer.minTroops) {
            return `Must move at least ${pendingTransfer.minTroops} troops`;
        }
        if (move.troops > pendingTransfer.maxTroops) {
            return `Can only move ${pendingTransfer.maxTroops} troops`;
        }
        return null;
    }
    if (move.type === 'fortify') {
        if (phase !== 'fortify') {
            return 'Can only fortify during fortify phase';
        }
        if (fortifiedThisTurn) {
            return 'Can only fortify once per turn';
        }
        const from = territories[move.from];
        const to = territories[move.to];
        if (from.owner !== currentPlayer) {
            return 'You do not own the source territory';
        }
        if (to.owner !== currentPlayer) {
            return 'You do not own the destination territory';
        }
        if (move.troops < 1) {
            return 'Must move at least 1 troop';
        }
        if (from.troops <= move.troops) {
            return 'Must leave at least 1 troop behind';
        }
        if (!areConnected(move.from, move.to, currentPlayer, territories)) {
            return 'Territories are not connected through your territories';
        }
        return null;
    }
    return 'Invalid move type';
}
function nextPlayer(state) {
    const humanPlayers = state.players.filter(p => p !== 'neutral');
    const currentIndex = humanPlayers.indexOf(state.currentPlayer);
    return humanPlayers[(currentIndex + 1) % humanPlayers.length];
}
function endTurn(state) {
    state.currentPlayer = nextPlayer(state);
    state.phase = 'deploy';
    state.conqueredTerritoryThisTurn = false;
    state.fortifiedThisTurn = false;
    state.deployableTroops = calculateReinforcements(state, state.currentPlayer);
}
export function applyMove(state, move) {
    const error = validateMove(state, move);
    if (error) {
        throw new Error(error);
    }
    const newState = JSON.parse(JSON.stringify(state));
    if (move.type === 'skip') {
        if (newState.phase === 'attack') {
            newState.phase = 'fortify';
        }
        else if (newState.phase === 'fortify') {
            endTurn(newState);
        }
        return newState;
    }
    if (move.type === 'deploy') {
        const territory = newState.territories[move.territory];
        if (newState.phase === 'initial_placement') {
            // Initial placement logic
            const subPhase = newState.initialPlacementSubPhase;
            if (subPhase === 'claiming') {
                territory.owner = newState.currentPlayer;
                territory.troops = 1;
            }
            else {
                territory.troops += 1;
            }
            newState.unplacedTroops[newState.currentPlayer] -= 1;
            // Check if all territories are claimed
            if (subPhase === 'claiming') {
                const allClaimed = Object.values(newState.territories).every(t => t.owner !== null);
                if (allClaimed) {
                    newState.initialPlacementSubPhase = 'reinforcing';
                }
            }
            // Check if all troops are placed
            const allTroopsPlaced = Object.values(newState.unplacedTroops).every(count => count === 0);
            if (allTroopsPlaced) {
                // Transition to normal game
                delete newState.initialPlacementSubPhase;
                delete newState.unplacedTroops;
                newState.phase = 'deploy';
                newState.currentPlayer = newState.players.filter(p => p !== 'neutral')[0];
                newState.deployableTroops = calculateReinforcements(newState, newState.currentPlayer);
            }
            else {
                // Move to next player
                newState.currentPlayer = nextPlayer(newState);
            }
            return newState;
        }
        // Normal deploy phase
        territory.troops += move.troops;
        newState.deployableTroops -= move.troops;
        // Auto-transition to attack phase when all troops are deployed
        if (newState.deployableTroops === 0) {
            newState.phase = 'attack';
        }
        return newState;
    }
    if (move.type === 'attack') {
        const from = newState.territories[move.from];
        const to = newState.territories[move.to];
        // Default to maximum dice if not specified
        const attackerDice = move.attackerDice || Math.min(3, from.troops - 1);
        const defenderDice = move.defenderDice || Math.min(2, to.troops);
        const result = resolveAttack(from.troops, to.troops, attackerDice, defenderDice);
        from.troops -= result.attackerLost;
        to.troops -= result.defenderLost;
        if (result.conquered) {
            const previousOwner = to.owner;
            to.owner = from.owner;
            newState.conqueredTerritoryThisTurn = true;
            // Set up transfer phase
            newState.phase = 'attack_transfer';
            newState.pendingTransfer = {
                from: move.from,
                to: move.to,
                minTroops: result.diceUsed,
                maxTroops: from.troops
            };
            // Check for elimination
            const eliminatedPlayer = previousOwner;
            if (eliminatedPlayer && eliminatedPlayer !== 'neutral') {
                const hasTerritoriesLeft = Object.values(newState.territories).some(t => t.owner === eliminatedPlayer);
                if (!hasTerritoriesLeft) {
                    // Player eliminated - remove from game
                    newState.players = newState.players.filter(p => p !== eliminatedPlayer);
                }
            }
            // Check for winner (only count human players)
            const winner = checkWinner(newState.territories, newState.players);
            if (winner) {
                newState.winner = winner;
            }
        }
        return newState;
    }
    if (move.type === 'transfer') {
        const { from, to } = newState.pendingTransfer;
        const fromTerritory = newState.territories[from];
        const toTerritory = newState.territories[to];
        fromTerritory.troops -= move.troops;
        toTerritory.troops += move.troops;
        // Clear transfer state and return to attack phase
        delete newState.pendingTransfer;
        newState.phase = 'attack';
        return newState;
    }
    if (move.type === 'fortify') {
        const from = newState.territories[move.from];
        const to = newState.territories[move.to];
        from.troops -= move.troops;
        to.troops += move.troops;
        newState.fortifiedThisTurn = true;
        // End turn immediately after fortifying
        endTurn(newState);
        return newState;
    }
    return newState;
}
function checkWinner(territoryMap, players) {
    // Only human players can win (not neutral)
    const humanPlayers = players.filter(p => p !== 'neutral');
    // Check if only one human player remains
    const activePlayers = humanPlayers.filter(player => {
        return Object.values(territoryMap).some(t => t.owner === player);
    });
    if (activePlayers.length === 1) {
        return activePlayers[0];
    }
    // Also check if someone controls all territories (shouldn't happen with neutral but just in case)
    for (const player of humanPlayers) {
        const ownedCount = getPlayerTerritoryCount(player, territoryMap);
        if (ownedCount === 42) {
            return player;
        }
    }
    return null;
}
export function getValidMoves(state) {
    const moves = [];
    const { currentPlayer, phase, territories, deployableTroops, pendingTransfer, fortifiedThisTurn, unplacedTroops } = state;
    // Initial placement phase
    if (phase === 'initial_placement') {
        const subPhase = state.initialPlacementSubPhase;
        for (const territoryId in territories) {
            const territory = territories[territoryId];
            if (subPhase === 'claiming' && territory.owner === null) {
                moves.push({
                    type: 'deploy',
                    territory: territory.id,
                    troops: 1
                });
            }
            else if (subPhase === 'reinforcing' && territory.owner === currentPlayer) {
                moves.push({
                    type: 'deploy',
                    territory: territory.id,
                    troops: 1
                });
            }
        }
        return moves;
    }
    // Transfer phase after conquest
    if (phase === 'attack_transfer' && pendingTransfer) {
        const { minTroops, maxTroops } = pendingTransfer;
        for (let troops = minTroops; troops <= maxTroops; troops++) {
            moves.push({
                type: 'transfer',
                troops
            });
        }
        return moves;
    }
    // Can only skip if not in deploy phase or if all troops are deployed
    if (phase !== 'deploy' || deployableTroops === 0) {
        moves.push({ type: 'skip' });
    }
    if (phase === 'deploy') {
        // Generate deploy moves for all owned territories
        for (const territoryId in territories) {
            const territory = territories[territoryId];
            if (territory.owner === currentPlayer) {
                // Allow deploying 1 troop at a time, or all remaining troops
                moves.push({
                    type: 'deploy',
                    territory: territory.id,
                    troops: 1
                });
                if (deployableTroops > 1) {
                    moves.push({
                        type: 'deploy',
                        territory: territory.id,
                        troops: deployableTroops
                    });
                }
            }
        }
    }
    else if (phase === 'attack') {
        for (const territoryId in territories) {
            const from = territories[territoryId];
            if (from.owner === currentPlayer && from.troops > 1) {
                for (const toId of from.adjacentTo) {
                    const to = territories[toId];
                    if (to.owner !== currentPlayer) {
                        moves.push({
                            type: 'attack',
                            from: from.id,
                            to: toId
                        });
                    }
                }
            }
        }
    }
    else if (phase === 'fortify') {
        // Only allow fortify moves if not already fortified this turn
        if (!fortifiedThisTurn) {
            for (const territoryId in territories) {
                const from = territories[territoryId];
                if (from.owner === currentPlayer && from.troops > 1) {
                    for (const toId in territories) {
                        const to = territories[toId];
                        if (to.owner === currentPlayer && from.id !== to.id) {
                            if (areConnected(from.id, to.id, currentPlayer, territories)) {
                                for (let troops = 1; troops < from.troops; troops++) {
                                    moves.push({
                                        type: 'fortify',
                                        from: from.id,
                                        to: to.id,
                                        troops
                                    });
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    return moves;
}
