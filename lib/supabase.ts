// lib/supabase.ts
// Placeholder supabase client for development
// Install @supabase/supabase-js to enable full functionality

interface SupabaseClient {
  auth: {
    getSession: () => Promise<{ data: { session: any } }>;
  };
  from: (table: string) => any;
  storage: any;
  rpc: (fn: string, params: any) => Promise<{ data: any; error: any }>;
}

const createMockClient = (): SupabaseClient => ({
  auth: {
    getSession: async () => ({ data: { session: null } })
  },
  from: () => ({
    select: () => ({
      eq: () => ({
        single: async () => ({ data: null, error: null }),
        order: () => ({ data: [], error: null }),
        limit: async () => ({ data: [], error: null })
      })
    }),
    insert: async () => ({ data: null, error: null }),
    update: async () => ({ data: null, error: null }),
    delete: async () => ({ data: null, error: null })
  }),
  storage: {
    from: () => ({
      upload: async () => ({ data: null, error: null }),
      getPublicUrl: () => ({ data: { publicUrl: '' } }),
      remove: async () => ({ error: null })
    })
  },
  rpc: async () => ({ data: null, error: null })
});

export const supabase = createMockClient();
export default supabase;
