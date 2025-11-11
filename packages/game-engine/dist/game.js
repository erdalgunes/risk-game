export function createInitialState() {
    return {
        currentPlayer: 'red',
        phase: 'attack',
        territories: {
            1: { id: 1, owner: 'red', troops: 3, adjacentTo: [2, 4] },
            2: { id: 2, owner: 'red', troops: 3, adjacentTo: [1, 3, 5] },
            3: { id: 3, owner: 'red', troops: 3, adjacentTo: [2, 6] },
            4: { id: 4, owner: 'blue', troops: 3, adjacentTo: [1, 5] },
            5: { id: 5, owner: 'blue', troops: 3, adjacentTo: [2, 4, 6] },
            6: { id: 6, owner: 'blue', troops: 3, adjacentTo: [3, 5] }
        },
        winner: null
    };
}
function rollDice() {
    return Math.floor(Math.random() * 6) + 1;
}
function resolveAttack(attackerTroops, defenderTroops) {
    const attackerRoll = rollDice();
    const defenderRoll = rollDice();
    if (attackerRoll > defenderRoll) {
        return {
            attackerLost: 0,
            defenderLost: 1,
            conquered: defenderTroops === 1
        };
    }
    else {
        return {
            attackerLost: 1,
            defenderLost: 0,
            conquered: false
        };
    }
}
function isAdjacent(from, to, territories) {
    return territories[from].adjacentTo.includes(to);
}
function areConnected(from, to, owner, territories) {
    const visited = new Set();
    const queue = [from];
    while (queue.length > 0) {
        const current = queue.shift();
        if (current === to)
            return true;
        if (visited.has(current))
            continue;
        visited.add(current);
        const adjacent = territories[current].adjacentTo.filter(id => territories[id].owner === owner);
        queue.push(...adjacent);
    }
    return false;
}
export function validateMove(state, move) {
    const { currentPlayer, phase, territories } = state;
    if (move.type === 'skip') {
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
        return null;
    }
    if (move.type === 'fortify') {
        if (phase !== 'fortify') {
            return 'Can only fortify during fortify phase';
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
        else {
            newState.phase = 'attack';
            newState.currentPlayer = newState.currentPlayer === 'red' ? 'blue' : 'red';
        }
        return newState;
    }
    if (move.type === 'attack') {
        const from = newState.territories[move.from];
        const to = newState.territories[move.to];
        const result = resolveAttack(from.troops, to.troops);
        from.troops -= result.attackerLost;
        to.troops -= result.defenderLost;
        if (result.conquered) {
            to.owner = from.owner;
            to.troops = 1;
            from.troops -= 1;
        }
        const winner = checkWinner(newState.territories);
        if (winner) {
            newState.winner = winner;
        }
        return newState;
    }
    if (move.type === 'fortify') {
        const from = newState.territories[move.from];
        const to = newState.territories[move.to];
        from.troops -= move.troops;
        to.troops += move.troops;
        newState.phase = 'attack';
        newState.currentPlayer = newState.currentPlayer === 'red' ? 'blue' : 'red';
        return newState;
    }
    return newState;
}
function checkWinner(territories) {
    const owners = Object.values(territories).map(t => t.owner);
    const redCount = owners.filter(o => o === 'red').length;
    const blueCount = owners.filter(o => o === 'blue').length;
    if (redCount === 6)
        return 'red';
    if (blueCount === 6)
        return 'blue';
    return null;
}
export function getValidMoves(state) {
    const moves = [];
    const { currentPlayer, phase, territories } = state;
    moves.push({ type: 'skip' });
    if (phase === 'attack') {
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
    else {
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
    return moves;
}
