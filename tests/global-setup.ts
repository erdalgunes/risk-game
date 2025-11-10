import { server } from './mocks/msw-setup';

export default function globalSetup() {
  // Start MSW server before all tests
  server.listen({ onUnhandledRequest: 'warn' });
  console.log('MSW server started - all Supabase API calls will be mocked');
}
