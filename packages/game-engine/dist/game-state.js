"use strict";
/**
 * Game state management and core game logic
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createGame = createGame;
exports.executeAttack = executeAttack;
exports.executeFortify = executeFortify;
exports.changePhase = changePhase;
exports.endTurn = endTurn;
exports.getCurrentPlayer = getCurrentPlayer;
const map_1 = require("./map");
const combat_1 = require("./combat");
const validation_1 = require("./validation");
/**
 * Create a new game with initial setup
 */
function createGame(gameId, player1Name, player2Name, mode) {
    const player1 = {
        id: 'player-red',
        color: 'red',
        name: player1Name,
        isAI: false,
    };
    const player2 = {
        id: 'player-blue',
        color: 'blue',
        name: player2Name,
        isAI: mode === 'single-player',
    };
    return {
        id: gameId,
        players: [player1, player2],
        territories: (0, map_1.createInitialTerritories)(player1.id, player2.id),
        currentPlayerIndex: 0,
        phase: 'attack',
        winner: null,
        mode,
    };
}
/**
 * Execute an attack
 */
function executeAttack(gameState, fromTerritoryId, toTerritoryId) {
    // Validate attack
    const validation = (0, validation_1.validateAttack)(gameState, fromTerritoryId, toTerritoryId);
    if (!validation.valid) {
        return {
            updatedState: gameState,
            result: null,
            error: validation.error,
        };
    }
    const fromTerritory = gameState.territories.find((t) => t.id === fromTerritoryId);
    const toTerritory = gameState.territories.find((t) => t.id === toTerritoryId);
    // Resolve combat
    const result = (0, combat_1.resolveCombat)(fromTerritory.troops, toTerritory.troops);
    // Update troop counts
    const updatedTerritories = gameState.territories.map((t) => {
        if (t.id === fromTerritoryId) {
            return { ...t, troops: t.troops - result.attackerLoss };
        }
        if (t.id === toTerritoryId) {
            const newTroops = t.troops - result.defenderLoss;
            // If conquered, transfer minimum 1 troop from attacker
            if (newTroops === 0) {
                return {
                    ...t,
                    ownerId: fromTerritory.ownerId,
                    troops: 1,
                };
            }
            return { ...t, troops: newTroops };
        }
        return t;
    });
    // If conquered, move 1 troop from attacker to conquered territory
    if (result.conquered) {
        const attackerIndex = updatedTerritories.findIndex((t) => t.id === fromTerritoryId);
        updatedTerritories[attackerIndex] = {
            ...updatedTerritories[attackerIndex],
            troops: updatedTerritories[attackerIndex].troops - 1,
        };
    }
    const updatedState = {
        ...gameState,
        territories: updatedTerritories,
    };
    // Check for winner
    const winner = (0, validation_1.checkWinner)(updatedState);
    if (winner) {
        updatedState.winner = winner;
    }
    return { updatedState, result };
}
/**
 * Execute a fortify move
 */
function executeFortify(gameState, fromTerritoryId, toTerritoryId, troopCount) {
    // Validate fortify
    const validation = (0, validation_1.validateFortify)(gameState, fromTerritoryId, toTerritoryId, troopCount);
    if (!validation.valid) {
        return {
            updatedState: gameState,
            error: validation.error,
        };
    }
    // Update troop counts
    const updatedTerritories = gameState.territories.map((t) => {
        if (t.id === fromTerritoryId) {
            return { ...t, troops: t.troops - troopCount };
        }
        if (t.id === toTerritoryId) {
            return { ...t, troops: t.troops + troopCount };
        }
        return t;
    });
    return {
        updatedState: {
            ...gameState,
            territories: updatedTerritories,
        },
    };
}
/**
 * Change game phase
 */
function changePhase(gameState, newPhase) {
    return {
        ...gameState,
        phase: newPhase,
    };
}
/**
 * End current player's turn
 */
function endTurn(gameState) {
    return {
        ...gameState,
        currentPlayerIndex: (gameState.currentPlayerIndex + 1) % gameState.players.length,
        phase: 'attack',
    };
}
/**
 * Get current player
 */
function getCurrentPlayer(gameState) {
    return gameState.players[gameState.currentPlayerIndex];
}
