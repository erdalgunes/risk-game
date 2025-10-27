import { GameBoard } from '@/components/game/GameBoard';

export default async function GamePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ playerId?: string }>;
}) {
  const { id } = await params;
  const { playerId } = await searchParams;

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800">
      <GameBoard gameId={id} playerId={playerId} />
    </main>
  );
}
