import { Lobby } from '@/components/lobby/Lobby';

export default function Home() {
  return (
    <main id="main-content" className="flex min-h-screen flex-col items-center justify-center p-8 bg-gradient-to-b from-gray-900 to-gray-800">
      <Lobby />
    </main>
  );
}
