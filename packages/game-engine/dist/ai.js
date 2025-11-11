import { getValidMoves } from './game';
export function getAIMove(state) {
    const validMoves = getValidMoves(state);
    // Filter out skip moves if other moves are available
    const actionMoves = validMoves.filter(m => m.type !== 'skip');
    if (actionMoves.length === 0) {
        return { type: 'skip' };
    }
    // Prefer attacks over fortify moves
    const attackMoves = actionMoves.filter(m => m.type === 'attack');
    if (attackMoves.length > 0) {
        const randomIndex = Math.floor(Math.random() * attackMoves.length);
        return attackMoves[randomIndex];
    }
    // Otherwise pick a random fortify move
    const randomIndex = Math.floor(Math.random() * actionMoves.length);
    return actionMoves[randomIndex];
}
