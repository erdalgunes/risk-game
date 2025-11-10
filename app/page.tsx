import { Lobby } from '@/components/lobby/Lobby';

export default function Home() {
  return (
    <main
      id="main-content"
      className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-gray-900 to-gray-800 p-8"
    >
      <Lobby />
    </main>
  );
}
