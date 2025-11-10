'use client';

import { useEffect, useRef } from 'react';
import type { Game, Player } from '@/types/game';

interface GameAnnouncerProps {
  game: Game;
  currentPlayer?: Player | null;
  players: Player[];
}

export function GameAnnouncer({ game, currentPlayer, players }: GameAnnouncerProps) {
  const previousPhaseRef = useRef(game.phase);
  const previousTurnRef = useRef(game.current_player_order);
  const announcementRef = useRef('');

  useEffect(() => {
    let announcement = '';

    // Announce phase changes
    if (previousPhaseRef.current !== game.phase && game.phase) {
      announcement = `Phase changed to ${game.phase}`;
      previousPhaseRef.current = game.phase;
    }

    // Announce turn changes
    if (previousTurnRef.current !== game.current_player_order) {
      const activePlayer = players.find((p) => p.turn_order === game.current_player_order);
      if (activePlayer) {
        const isYourTurn = activePlayer.id === currentPlayer?.id;
        announcement = isYourTurn
          ? 'It is now your turn'
          : `It is now ${activePlayer.username}'s turn`;
      }
      previousTurnRef.current = game.current_player_order;
    }

    if (announcement) {
      announcementRef.current = announcement;
    }
  }, [game.phase, game.current_player_order, players, currentPlayer]);

  return (
    <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
      {announcementRef.current}
    </div>
  );
}
