/**
 * EventProjector
 *
 * Applies events to game state to reconstruct historical states.
 * Each event type has a specific projection logic that mutates the state.
 *
 * Used by:
 * - EventStore.replay() - reconstruct state from events
 * - Undo functionality - replay to previous state
 * - Time-travel debugging - view state at any point
 */

import type { Game, Player, Territory } from '@/types/game';
import type { StoredEvent } from './EventStore';

/**
 * Game state that can be mutated by events
 */
export interface GameState {
  game: Game;
  players: Player[];
  territories: Territory[];
}

/**
 * EventProjector - applies events to game state
 */
export class EventProjector {
  /**
   * Apply a single event to state
   * Mutates the state object in place
   *
   * @param state Current game state
   * @param event Event to apply
   */
  static applyEvent(state: GameState, event: StoredEvent): void {
    switch (event.event_type) {
      case 'game_created':
        this.applyGameCreated(state, event);
        break;
      case 'game_started':
        this.applyGameStarted(state, event);
        break;
      case 'player_joined':
        this.applyPlayerJoined(state, event);
        break;
      case 'territory_claimed':
        this.applyTerritoryClaimed(state, event);
        break;
      case 'setup_army_placed':
        this.applySetupArmyPlaced(state, event);
        break;
      case 'turn_started':
        this.applyTurnStarted(state, event);
        break;
      case 'reinforcement_calculated':
        this.applyReinforcementCalculated(state, event);
        break;
      case 'army_placed':
        this.applyArmyPlaced(state, event);
        break;
      case 'phase_changed':
        this.applyPhaseChanged(state, event);
        break;
      case 'territory_attacked':
        this.applyTerritoryAttacked(state, event);
        break;
      case 'territory_conquered':
        this.applyTerritoryConquered(state, event);
        break;
      case 'player_eliminated':
        this.applyPlayerEliminated(state, event);
        break;
      case 'army_fortified':
        this.applyArmyFortified(state, event);
        break;
      case 'turn_ended':
        this.applyTurnEnded(state, event);
        break;
      case 'game_finished':
        this.applyGameFinished(state, event);
        break;
      default:
        console.error(`Unknown event type: ${event.event_type}`);
    }
  }

  /**
   * Apply multiple events in sequence
   *
   * @param state Initial game state
   * @param events Events to apply in order
   * @returns Final game state
   */
  static applyEvents(state: GameState, events: StoredEvent[]): GameState {
    for (const event of events) {
      this.applyEvent(state, event);
    }
    return state;
  }

  // ============================================
  // Event Projection Logic
  // ============================================

  private static applyGameCreated(state: GameState, event: StoredEvent): void {
    // Game already exists in state
    // Just update if payload has game-level data
    if (event.payload.status) {
      state.game.status = event.payload.status;
    }
  }

  private static applyGameStarted(state: GameState, event: StoredEvent): void {
    state.game.status = 'setup';
    if (event.payload.current_player_order !== undefined) {
      state.game.current_player_order = event.payload.current_player_order;
    }
  }

  private static applyPlayerJoined(state: GameState, event: StoredEvent): void {
    const { player_id, username, color, turn_order } = event.payload;

    // Check if player already exists
    const existingPlayer = state.players.find((p) => p.id === player_id);
    if (existingPlayer) {
      // Update existing player
      existingPlayer.username = username;
      existingPlayer.color = color;
      existingPlayer.turn_order = turn_order;
    } else {
      // Add new player
      state.players.push({
        id: player_id,
        game_id: state.game.id,
        username,
        color,
        turn_order,
        armies_available: 0,
        is_eliminated: false,
        is_ai: false,
        created_at: event.created_at,
      });
    }
  }

  private static applyTerritoryClaimed(state: GameState, event: StoredEvent): void {
    const { territory_id, owner_id } = event.payload;

    const territory = state.territories.find((t) => t.id === territory_id);
    if (!territory) {
      throw new Error(
        `Territory ${territory_id} not found during event replay (event: ${event.event_type})`
      );
    }
    territory.owner_id = owner_id;
    territory.army_count = 1; // Initial claim = 1 army
  }

  /**
   * Helper method to apply army placement to state
   * Used by both setup and reinforcement phases
   */
  private static applyArmyPlacementToState(
    state: GameState,
    territory_id: string,
    count: number,
    player_id: string,
    event_type: string
  ): void {
    // Add armies to territory
    const territory = state.territories.find((t) => t.id === territory_id);
    if (!territory) {
      throw new Error(
        `Territory ${territory_id} not found during event replay (event: ${event_type})`
      );
    }
    territory.army_count += count;

    // Deduct from player's available armies
    const player = state.players.find((p) => p.id === player_id);
    if (!player) {
      throw new Error(`Player ${player_id} not found during event replay (event: ${event_type})`);
    }
    player.armies_available -= count;
  }

  private static applySetupArmyPlaced(state: GameState, event: StoredEvent): void {
    const { territory_id, count, player_id } = event.payload;
    this.applyArmyPlacementToState(state, territory_id, count, player_id, event.event_type);
  }

  private static applyTurnStarted(state: GameState, event: StoredEvent): void {
    const { player_order } = event.payload;
    state.game.current_player_order = player_order;
    state.game.phase = 'reinforcement';
  }

  private static applyReinforcementCalculated(state: GameState, event: StoredEvent): void {
    const { player_id, armies } = event.payload;

    const player = state.players.find((p) => p.id === player_id);
    if (!player) {
      throw new Error(
        `Player ${player_id} not found during event replay (event: ${event.event_type})`
      );
    }
    player.armies_available = armies;
  }

  private static applyArmyPlaced(state: GameState, event: StoredEvent): void {
    const { territory_id, count, player_id } = event.payload;
    this.applyArmyPlacementToState(state, territory_id, count, player_id, event.event_type);
  }

  private static applyPhaseChanged(state: GameState, event: StoredEvent): void {
    const { new_phase } = event.payload;
    state.game.phase = new_phase;
  }

  private static applyTerritoryAttacked(state: GameState, event: StoredEvent): void {
    const { from_territory_id, to_territory_id, attacker_losses, defender_losses } = event.payload;

    // Reduce attacker's armies
    const fromTerritory = state.territories.find((t) => t.id === from_territory_id);
    if (!fromTerritory) {
      throw new Error(
        `Territory ${from_territory_id} not found during event replay (event: ${event.event_type})`
      );
    }
    fromTerritory.army_count -= attacker_losses;

    // Reduce defender's armies
    const toTerritory = state.territories.find((t) => t.id === to_territory_id);
    if (!toTerritory) {
      throw new Error(
        `Territory ${to_territory_id} not found during event replay (event: ${event.event_type})`
      );
    }
    toTerritory.army_count -= defender_losses;
  }

  private static applyTerritoryConquered(state: GameState, event: StoredEvent): void {
    const { territory_id, new_owner_id, armies_moved } = event.payload;

    const territory = state.territories.find((t) => t.id === territory_id);
    if (!territory) {
      throw new Error(
        `Territory ${territory_id} not found during event replay (event: ${event.event_type})`
      );
    }
    territory.owner_id = new_owner_id;
    territory.army_count = armies_moved;
  }

  private static applyPlayerEliminated(state: GameState, event: StoredEvent): void {
    const { player_id } = event.payload;

    const player = state.players.find((p) => p.id === player_id);
    if (!player) {
      throw new Error(
        `Player ${player_id} not found during event replay (event: ${event.event_type})`
      );
    }
    player.is_eliminated = true;
  }

  private static applyArmyFortified(state: GameState, event: StoredEvent): void {
    const { from_territory_id, to_territory_id, count } = event.payload;

    // Remove armies from source territory
    const fromTerritory = state.territories.find((t) => t.id === from_territory_id);
    if (!fromTerritory) {
      throw new Error(
        `Territory ${from_territory_id} not found during event replay (event: ${event.event_type})`
      );
    }
    fromTerritory.army_count -= count;

    // Add armies to destination territory
    const toTerritory = state.territories.find((t) => t.id === to_territory_id);
    if (!toTerritory) {
      throw new Error(
        `Territory ${to_territory_id} not found during event replay (event: ${event.event_type})`
      );
    }
    toTerritory.army_count += count;
  }

  private static applyTurnEnded(state: GameState, event: StoredEvent): void {
    const { next_player_order } = event.payload;
    if (next_player_order !== undefined) {
      state.game.current_player_order = next_player_order;
    }
  }

  private static applyGameFinished(state: GameState, event: StoredEvent): void {
    const { winner_id } = event.payload;
    state.game.status = 'finished';
    state.game.winner_id = winner_id;
  }
}
