// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface Database {
  public: {
    Tables: {
      games: {
        Row: {
          id: string;
          state: any;
          mode: 'single' | 'multi';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          state: any;
          mode: 'single' | 'multi';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          state?: any;
          mode?: 'single' | 'multi';
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
}
