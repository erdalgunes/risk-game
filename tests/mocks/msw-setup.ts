import { setupServer } from 'msw/node';
import { handlers } from './supabase-handlers';

export const server = setupServer(...handlers);
