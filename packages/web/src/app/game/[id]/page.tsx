import GameClient from '@/components/GameClient';

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ mode: string; player: string }>;
}

export default async function GamePage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { mode, player } = await searchParams;

  return (
    <GameClient
      gameId={id}
      mode={mode === 'single' ? 'single-player' : 'multiplayer'}
      playerName={decodeURIComponent(player || 'Player')}
    />
  );
}
