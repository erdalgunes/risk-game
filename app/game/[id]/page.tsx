import { GameBoard } from '@/components/game/GameBoard';
import { ErrorBoundary, GameErrorFallback } from '@/components/ErrorBoundary';

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
    <main id="main-content" className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800">
      <ErrorBoundary fallback={(error, reset) => <GameErrorFallback error={error} reset={reset} />}>
        <GameBoard gameId={id} playerId={playerId} />
      </ErrorBoundary>
    </main>
  );
}
